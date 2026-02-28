import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { seedBadges } from "@/lib/badges";
import { DEFAULT_COIN_PACKS } from "@/modules/coin/coin.constants";

// POST — Seed badges and coin packs (admin only)
export async function POST() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  await seedBadges();

  // Seed coin packs — use findFirst + create to avoid broken upsert on auto-generated IDs
  for (const pack of DEFAULT_COIN_PACKS) {
    const existing = await prisma.coinPack.findFirst({
      where: { name: pack.name },
    });
    if (existing) {
      await prisma.coinPack.update({
        where: { id: existing.id },
        data: pack,
      });
    } else {
      await prisma.coinPack.create({ data: pack });
    }
  }

  const badgeCount = await prisma.badge.count();
  const packCount = await prisma.coinPack.count();

  return NextResponse.json({
    success: true,
    badges: badgeCount,
    coinPacks: packCount,
  });
}
