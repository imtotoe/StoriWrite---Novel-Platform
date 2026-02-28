import { prisma } from "@/lib/prisma";
import { WRITER_REVENUE_PERCENT } from "./coin.constants";
import type { CoinPackDTO, CoinBalanceResponse, CoinHistoryItem } from "./coin.types";

/**
 * Get active coin packs formatted for frontend
 */
export async function getCoinPacks(): Promise<CoinPackDTO[]> {
  const packs = await prisma.coinPack.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return packs.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    priceDisplay: `${(p.price / 100).toLocaleString()} บาท`,
    coins: p.coins,
    bonusCoins: p.bonusCoins,
    totalCoins: p.coins + p.bonusCoins,
    isFeatured: p.isFeatured,
  }));
}

/**
 * Get user coin balance and stats
 */
export async function getCoinBalance(userId: string): Promise<CoinBalanceResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { coinBalance: true },
  });

  const [purchased, spent] = await Promise.all([
    prisma.coinLedger.aggregate({
      where: { userId, type: "PURCHASE" },
      _sum: { amount: true },
    }),
    prisma.coinLedger.aggregate({
      where: { userId, type: "SPEND" },
      _sum: { amount: true },
    }),
  ]);

  return {
    balance: user?.coinBalance ?? 0,
    totalPurchased: purchased._sum.amount ?? 0,
    totalSpent: Math.abs(spent._sum.amount ?? 0),
  };
}

/**
 * Get coin history (ledger)
 */
export async function getCoinHistory(
  userId: string,
  limit = 20,
  offset = 0
): Promise<CoinHistoryItem[]> {
  const items = await prisma.coinLedger.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  return items.map((item) => ({
    id: item.id,
    type: item.type as CoinHistoryItem["type"],
    amount: item.amount,
    balanceAfter: item.balanceAfter,
    description: item.note || getDefaultDescription(item.type, item.amount),
    createdAt: item.createdAt.toISOString(),
  }));
}

function getDefaultDescription(type: string, amount: number): string {
  switch (type) {
    case "PURCHASE": return `ซื้อ ${amount} Coin`;
    case "SPEND": return `ใช้ ${Math.abs(amount)} Coin ปลดล็อค chapter`;
    case "REFUND": return `คืน ${amount} Coin`;
    case "BONUS": return `ได้รับ ${amount} Coin โบนัส`;
    case "ADMIN_ADJUST": return `ปรับยอด ${amount > 0 ? "+" : ""}${amount} Coin`;
    default: return `${amount} Coin`;
  }
}

/**
 * Unlock a chapter with coins (atomic transaction)
 */
export async function unlockChapter(userId: string, chapterId: string) {
  // Check if already unlocked
  const existing = await prisma.coinSpend.findUnique({
    where: { userId_chapterId: { userId, chapterId } },
  });
  if (existing) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { coinBalance: true } });
    return { success: true, alreadyUnlocked: true, newBalance: user?.coinBalance ?? 0, coinsSpent: 0 };
  }

  // Get chapter with coin price
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: { novel: { select: { id: true, authorId: true } } },
  });

  if (!chapter) throw new Error("Chapter not found");
  if (!chapter.coinPrice || chapter.coinPrice <= 0) {
    throw new Error("Chapter is free");
  }

  const price = chapter.coinPrice;

  // Atomic transaction with SELECT FOR UPDATE equivalent
  return await prisma.$transaction(async (tx) => {
    // Get current balance
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { coinBalance: true },
    });

    if (!user || user.coinBalance < price) {
      throw new Error("Coin ไม่เพียงพอ");
    }

    const newBalance = user.coinBalance - price;

    // Deduct coins
    await tx.user.update({
      where: { id: userId },
      data: { coinBalance: newBalance },
    });

    // Create spend record
    const spend = await tx.coinSpend.create({
      data: {
        userId,
        chapterId,
        novelId: chapter.novel.id,
        amount: price,
      },
    });

    // Create ledger entry
    await tx.coinLedger.create({
      data: {
        userId,
        type: "SPEND",
        amount: -price,
        balanceBefore: user.coinBalance,
        balanceAfter: newBalance,
        refId: spend.id,
        note: `ปลดล็อค: ${chapter.title}`,
      },
    });

    // Create writer revenue (70% split)
    // Calculate approximate THB value based on average coin price (~0.9 THB/coin)
    const writerCoins = Math.floor(price * WRITER_REVENUE_PERCENT / 100);
    const thbPerCoin = 0.9; // average across all packs
    const writerThb = writerCoins * thbPerCoin;

    await tx.writerRevenue.create({
      data: {
        writerId: chapter.novel.authorId,
        coinSpendId: spend.id,
        coinsEarned: writerCoins,
        thbAmount: writerThb,
      },
    });

    return { success: true, alreadyUnlocked: false, newBalance, coinsSpent: price };
  });
}

/**
 * Complete a coin purchase (called from webhook)
 */
export async function completeCoinPurchase(transactionId: string) {
  const tx = await prisma.coinTransaction.findUnique({
    where: { id: transactionId },
    include: { coinPack: true },
  });

  if (!tx) throw new Error("Transaction not found");
  if (tx.status !== "PENDING") return; // Already processed

  const totalCoins = tx.coinsGranted;

  await prisma.$transaction(async (ptx) => {
    // Get current balance
    const user = await ptx.user.findUnique({
      where: { id: tx.userId },
      select: { coinBalance: true },
    });

    const currentBalance = user?.coinBalance ?? 0;
    const newBalance = currentBalance + totalCoins;

    // Update user balance
    await ptx.user.update({
      where: { id: tx.userId },
      data: { coinBalance: newBalance },
    });

    // Mark transaction completed
    await ptx.coinTransaction.update({
      where: { id: transactionId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    // Create ledger entry
    await ptx.coinLedger.create({
      data: {
        userId: tx.userId,
        type: "PURCHASE",
        amount: totalCoins,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        refId: tx.id,
        note: `ซื้อ ${tx.coinPack.name} pack`,
      },
    });
  });
}
