# Coin Module — Complete Technical Specification
> Novel Platform (StoriWrite) | Version 1.1 | Date: 2026-02-28  
> Stack: Next.js 16, TypeScript, Prisma ORM, PostgreSQL (Supabase), Omise (Opn Payments)  
> Scope: ระบบ Coin ครบวงจร ตั้งแต่ชำระเงินจริง → เพิ่ม Coin → ใช้ Coin → Writer Revenue → Security

---

## 1. Overview & Flow

### 1.1 Coin คืออะไร
Coin คือ **Virtual Currency ภายใน Platform** ที่ใช้ unlock chapter นิยายแบบ pay-per-chapter  
ไม่ใช่ cryptocurrency — เป็น database record ที่ผูกกับ userId เท่านั้น

### 1.2 Full Payment → Coin → Unlock → Revenue Flow

```
[User]                 [Next.js]              [Omise]              [Database]
  │                        │                      │                      │
  │── เลือก Coin Pack ──►  │                      │                      │
  │                        │── Create Charge ──►  │                      │
  │◄── PromptPay QR ──────  │◄── charge object ──  │                      │
  │                        │                      │                      │
  │── สแกน QR จ่ายเงิน ──────────────────────►    │                      │
  │                        │                 completed                   │
  │                        │◄──── webhook: charge.complete ──────────────│
  │                        │── Verify HMAC (Omise-Signature header)      │
  │                        │── Verify Timestamp (≤5 min)                 │
  │                        │── Idempotency Check ──────────────────────► │
  │                        │── Atomic Transaction:                       │
  │                        │   • CoinTransaction → COMPLETED  ─────────► │
  │                        │   • User.coinBalance += amount   ─────────► │
  │                        │   • CoinLedger (PURCHASE)        ─────────► │
  │◄── push notification ── │                      │                      │
  │   "รับ 65 Coin แล้ว"   │                      │                      │
  │                        │                      │                      │
  │── กด Unlock Chapter ►  │                      │                      │
  │                        │── SELECT FOR UPDATE ─────────────────────►  │
  │                        │── Atomic Transaction:                       │
  │                        │   • CoinSpend (unique) ───────────────────► │
  │                        │   • User.coinBalance -= price    ─────────► │
  │                        │   • CoinLedger (SPEND)           ─────────► │
  │                        │   • WriterRevenue (credit writer) ────────► │
  │◄── chapter content ──── │                      │                      │
```

### 1.3 Coin Pack ที่แนะนำ
| Pack | ราคา (บาท) | Coins | Bonus | ราคาต่อ Coin | Platform Cut |
|------|-----------|-------|-------|------------|-------------|
| Starter | 29 | 30 | — | 0.97 บาท | 30% |
| Popular ⭐ | 59 | 65 | +5 | 0.91 บาท | 30% |
| Value | 119 | 140 | +20 | 0.85 บาท | 30% |
| Premium | 299 | 380 | +80 | 0.79 บาท | 30% |

> **Revenue Split:** เมื่อ reader ใช้ coin unlock chapter → 70% ไปให้ writer, 30% เป็น platform fee  
> Writer สะสม revenue ใน `WriterRevenue` table → ถอนได้เมื่อถึง minimum threshold

### 1.4 ราคา Unlock Chapter
| ประเภท Chapter | ราคา (Coins) |
|---------------|-------------|
| Chapter ทั่วไป | 1–3 coins |
| Chapter พิเศษ / Extra | 5–10 coins |
| Early Access | 5–8 coins |
| นักเขียนตั้งเอง | Free — 15 coins |

---

## 2. Database Schema

```prisma
// ─────────────────────────────────────────
// COIN ENUMS
// ─────────────────────────────────────────

enum CoinTxStatus {
  PENDING     // รอการยืนยันจาก gateway
  COMPLETED   // ชำระเงินสำเร็จ coin เพิ่มแล้ว
  FAILED      // ชำระเงินล้มเหลว
  EXPIRED     // QR หมดอายุ
  REFUNDED    // คืนเงินแล้ว
}

enum CoinLedgerType {
  PURCHASE    // ซื้อ coin
  SPEND       // ใช้ unlock chapter
  REFUND      // คืน coin
  BONUS       // coin ที่ได้ฟรีจาก promotion
  ADMIN_ADJUST // admin ปรับยอด (พร้อม reason)
}

enum RevenueStatus {
  PENDING     // ยังไม่ครบ minimum withdrawal
  REQUESTED   // นักเขียนขอถอน
  PAID        // โอนเงินแล้ว
}

// ─────────────────────────────────────────
// COIN PACK (Catalog)
// ─────────────────────────────────────────

model CoinPack {
  id          String   @id @default(cuid())
  name        String                          // "Starter", "Popular"
  price       Int                             // ราคาเป็น สตางค์ (2900 = 29 บาท)
  coins       Int                             // จำนวน coin ที่ได้รับ
  bonusCoins  Int      @default(0)            // coin โบนัส
  isActive    Boolean  @default(true)
  isFeatured  Boolean  @default(false)        // highlight ใน UI
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())

  transactions CoinTransaction[]
}

// ─────────────────────────────────────────
// COIN TRANSACTION (การซื้อ Coin)
// ─────────────────────────────────────────

model CoinTransaction {
  id              String        @id @default(cuid())
  userId          String
  coinPackId      String
  coinsGranted    Int           // coins + bonusCoins
  paidAmount      Int           // สตางค์ที่จ่ายจริง
  currency        String        @default("THB")

  // Payment Gateway
  paymentGateway  String        // "omise"
  gatewayTxId     String        @unique    // Omise charge.id — idempotency key
  gatewayPayload  Json?         // raw payload จาก gateway (เก็บไว้ audit)
  paymentMethod   String?       // "promptpay" | "credit_card" | "truemoney"

  // Status
  status          CoinTxStatus  @default(PENDING)
  failureCode     String?       // กรณี failed
  failureMessage  String?

  // Timestamps
  createdAt       DateTime      @default(now())
  completedAt     DateTime?
  expiredAt       DateTime?

  // Relations
  user            User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  coinPack        CoinPack      @relation(fields: [coinPackId], references: [id])

  @@index([userId])
  @@index([gatewayTxId])
  @@index([status])
  @@index([createdAt])
}

// ─────────────────────────────────────────
// COIN SPEND (การใช้ Coin Unlock Chapter)
// ─────────────────────────────────────────

model CoinSpend {
  id          String   @id @default(cuid())
  userId      String
  chapterId   String
  novelId     String
  amount      Int      // coins ที่ใช้
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  chapter     Chapter  @relation(fields: [chapterId], references: [id], onDelete: Cascade)
  novel       Novel    @relation(fields: [novelId], references: [id], onDelete: Cascade)

  @@unique([userId, chapterId])  // *** unlock ได้ครั้งเดียว ***
  @@index([userId])
  @@index([novelId])
}

// ─────────────────────────────────────────
// COIN LEDGER (Immutable Audit Log)
// ─────────────────────────────────────────

model CoinLedger {
  id            String          @id @default(cuid())
  userId        String
  type          CoinLedgerType
  amount        Int             // + รับ, - ใช้
  balanceBefore Int
  balanceAfter  Int
  refId         String          // CoinTransaction.id หรือ CoinSpend.id
  note          String?         // admin note หรือ reason
  createdAt     DateTime        @default(now())  // ห้าม update/delete

  user          User            @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([refId])
}

// ─────────────────────────────────────────
// WRITER REVENUE (ส่วนแบ่งนักเขียน)
// ─────────────────────────────────────────

model WriterRevenue {
  id          String   @id @default(cuid())
  writerId    String
  coinSpendId String   @unique    // 1:1 กับ CoinSpend
  coinsEarned Int                 // จำนวน coins ที่ writer ได้ (70%)
  thbAmount   Decimal  @db.Decimal(10, 2)  // มูลค่าโดยประมาณ (THB)
  createdAt   DateTime @default(now())

  writer      User     @relation("WriterEarnings", fields: [writerId], references: [id])
  coinSpend   CoinSpend @relation(fields: [coinSpendId], references: [id])

  @@index([writerId, createdAt])
}

model WithdrawalRequest {
  id          String        @id @default(cuid())
  writerId    String
  amount      Decimal       @db.Decimal(10, 2)  // THB
  status      RevenueStatus @default(PENDING)
  bankAccount String?       // encrypted
  paidAt      DateTime?
  createdAt   DateTime      @default(now())

  writer      User          @relation("Withdrawals", fields: [writerId], references: [id])

  @@index([writerId])
}
```

### 2.1 Required Changes to Existing Models

```prisma
// ─── เพิ่มใน model User ──────────────────
model User {
  // ... fields เดิม ...
  coinBalance        Int               @default(0)
  coinTransactions   CoinTransaction[]
  coinSpends         CoinSpend[]
  coinLedger         CoinLedger[]
  writerEarnings     WriterRevenue[]   @relation("WriterEarnings")
  withdrawals        WithdrawalRequest[] @relation("Withdrawals")
}

// ─── เพิ่มใน model Chapter ────────────────
model Chapter {
  // ... fields เดิม ...
  coinPrice          Int?              // null หรือ 0 = ฟรี, >0 = ต้องใช้ coin
  coinSpends         CoinSpend[]
}

// ─── เพิ่มใน model Novel ──────────────────
model Novel {
  // ... fields เดิม ...
  coinSpends         CoinSpend[]
}

// ─── เพิ่มใน model CoinSpend ──────────────
model CoinSpend {
  // ... fields เดิม ...
  writerRevenue      WriterRevenue?
}
```

---

## 3. Module File Structure

```
src/modules/coin/
├── coin.types.ts          # TypeScript types & interfaces
├── coin.service.ts        # Business logic ทั้งหมด
├── coin.repository.ts     # Database queries (abstraction layer)
├── coin.validation.ts     # Zod schemas
├── coin.security.ts       # HMAC verification, rate limit
├── coin.errors.ts         # Custom error classes
├── coin.constants.ts      # Revenue split, limits, thresholds
└── routes/
    ├── coin-packs.route.ts      # GET /api/coins/packs
    ├── coin-checkout.route.ts   # POST /api/coins/checkout
    ├── coin-webhook.route.ts    # POST /api/webhooks/omise
    ├── coin-unlock.route.ts     # POST /api/coins/unlock
    ├── coin-balance.route.ts    # GET /api/coins/balance
    ├── coin-history.route.ts    # GET /api/coins/history
    ├── coin-refund.route.ts     # POST /api/coins/refund (admin)
    └── coin-status.route.ts     # GET /api/coins/transactions/[id]
```

---

## 4. TypeScript Types

```typescript
// src/modules/coin/coin.types.ts

export interface CoinPackDTO {
  id: string
  name: string
  price: number           // สตางค์
  priceDisplay: string    // "29 บาท"
  coins: number
  bonusCoins: number
  totalCoins: number      // coins + bonusCoins
  isFeatured: boolean
}

export interface CreateChargeRequest {
  coinPackId: string
  paymentMethod: "promptpay" | "credit_card" | "truemoney"
  returnUri?: string      // redirect หลังจ่ายเงินผ่าน card
}

export interface CreateChargeResponse {
  transactionId: string   // CoinTransaction.id
  chargeId: string        // Omise charge.id
  paymentMethod: string
  amount: number          // สตางค์
  // PromptPay
  qrCodeUrl?: string
  // Credit Card
  authorizeUri?: string
  expiresAt?: string
}

export interface UnlockChapterRequest {
  chapterId: string
}

export interface UnlockChapterResponse {
  success: boolean
  alreadyUnlocked?: boolean
  newBalance: number
  coinsSpent: number
}

export interface CoinBalanceResponse {
  balance: number
  totalPurchased: number
  totalSpent: number
}

export interface CoinHistoryItem {
  id: string
  type: "PURCHASE" | "SPEND" | "REFUND" | "BONUS"
  amount: number
  balanceAfter: number
  description: string
  createdAt: string
}

export interface TransactionStatusResponse {
  transactionId: string
  status: "PENDING" | "COMPLETED" | "FAILED" | "EXPIRED"
  coinsGranted: number
  createdAt: string
  completedAt?: string
}

export interface OmiseWebhookPayload {
  key: string             // "charge.complete" | "charge.failed" | ...
  created: number
  livemode: boolean
  data: {
    id: string            // charge ID
    amount: number
    currency: string
    paid: boolean
    status: string
    failure_code?: string
    failure_message?: string
    metadata: {
      userId: string
      coinPackId: string
      coinTransactionId: string
      coinsToGrant: number
    }
    source?: {
      type: string
      scannable_code?: {
        image?: { download_uri: string }
      }
    }
    authorize_uri?: string
    expires_at?: string
  }
}
```

---

## 5. Constants

```typescript
// src/modules/coin/coin.constants.ts

/** Revenue split: writer gets 70%, platform keeps 30% */
export const WRITER_REVENUE_PERCENTAGE = 0.70

/** Approximate THB value per coin (based on average pack price) */
export const THB_PER_COIN = 0.88

/** Minimum withdrawal amount in THB */
export const MIN_WITHDRAWAL_THB = 100

/** Maximum webhook timestamp drift allowed (5 minutes) */
export const MAX_WEBHOOK_TIMESTAMP_DRIFT_MS = 5 * 60 * 1000

/** Maximum pending transactions before cleanup */
export const PENDING_TX_EXPIRY_HOURS = 24

/** QR payment polling interval */
export const QR_POLL_INTERVAL_MS = 3000
```

---

## 6. Zod Validation Schemas

```typescript
// src/modules/coin/coin.validation.ts
import { z } from "zod"

export const createChargeSchema = z.object({
  coinPackId: z.string().cuid("Invalid coin pack ID"),
  paymentMethod: z.enum(["promptpay", "credit_card", "truemoney"]),
  returnUri: z.string().url().optional(),
})

export const unlockChapterSchema = z.object({
  chapterId: z.string().cuid("Invalid chapter ID"),
})

export const coinHistoryQuerySchema = z.object({
  page:  z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  type:  z.enum(["PURCHASE", "SPEND", "REFUND", "BONUS"]).optional(),
})

export const refundSchema = z.object({
  transactionId: z.string().cuid("Invalid transaction ID"),
  reason: z.string().min(1).max(500),
})
```

---

## 7. Custom Error Classes

```typescript
// src/modules/coin/coin.errors.ts

export class InsufficientCoinsError extends Error {
  public readonly required: number
  public readonly current: number

  constructor(required: number, current: number) {
    super(`Insufficient coins: required ${required}, current ${current}`)
    this.name = "InsufficientCoinsError"
    this.required = required
    this.current = current
  }
}

export class AlreadyUnlockedError extends Error {
  constructor(chapterId: string) {
    super(`Chapter ${chapterId} is already unlocked`)
    this.name = "AlreadyUnlockedError"
  }
}

export class InvalidWebhookSignatureError extends Error {
  constructor() {
    super("Invalid webhook HMAC signature")
    this.name = "InvalidWebhookSignatureError"
  }
}

export class WebhookTimestampError extends Error {
  constructor() {
    super("Webhook timestamp too old — possible replay attack")
    this.name = "WebhookTimestampError"
  }
}

export class DuplicateWebhookError extends Error {
  constructor(gatewayTxId: string) {
    super(`Webhook already processed: ${gatewayTxId}`)
    this.name = "DuplicateWebhookError"
  }
}

export class CoinPackNotFoundError extends Error {
  constructor(id: string) {
    super(`Coin pack not found: ${id}`)
    this.name = "CoinPackNotFoundError"
  }
}
```

---

## 8. Security Module

```typescript
// src/modules/coin/coin.security.ts
import crypto from "crypto"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { InvalidWebhookSignatureError, WebhookTimestampError } from "./coin.errors"
import { MAX_WEBHOOK_TIMESTAMP_DRIFT_MS } from "./coin.constants"

// ─── HMAC Webhook Signature Verification ───────────────────────────────────
// Omise sends:
//   Header: "Omise-Signature" (HMAC-SHA256, hex)
//   Header: "Omise-Signature-Timestamp" (Unix timestamp)
// During secret rotation, Omise-Signature may contain comma-separated signatures.

export function verifyOmiseWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  timestampHeader: string | null
): void {
  if (!signatureHeader) throw new InvalidWebhookSignatureError()

  // 1. Timestamp validation — reject replays older than 5 minutes
  if (timestampHeader) {
    const timestamp = parseInt(timestampHeader, 10)
    const drift = Math.abs(Date.now() - timestamp * 1000)
    if (drift > MAX_WEBHOOK_TIMESTAMP_DRIFT_MS) {
      throw new WebhookTimestampError()
    }
  }

  // 2. HMAC signature verification
  const expected = crypto
    .createHmac("sha256", process.env.OMISE_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest("hex")

  // Omise may send comma-separated signatures during secret rotation
  const signatures = signatureHeader.split(",").map(s => s.trim())
  const matched = signatures.some(sig => {
    const sigBuffer = Buffer.from(sig)
    const expBuffer = Buffer.from(expected)
    return (
      sigBuffer.length === expBuffer.length &&
      crypto.timingSafeEqual(sigBuffer, expBuffer)
    )
  })

  if (!matched) throw new InvalidWebhookSignatureError()
}

// ─── Rate Limiters (Upstash Redis) ─────────────────────────────────────────

const redis = Redis.fromEnv()

// Unlock: 10 ครั้ง/นาที ต่อ user (ป้องกัน rapid unlock spam)
export const unlockRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  prefix: "ratelimit:coin:unlock",
  analytics: true,
})

// Checkout: 5 ครั้ง/นาที ต่อ user (ป้องกัน payment spam)
export const checkoutRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  prefix: "ratelimit:coin:checkout",
  analytics: true,
})

// Webhook: 100 ครั้ง/นาที ต่อ IP (ป้องกัน DDoS บน webhook endpoint)
export const webhookRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  prefix: "ratelimit:webhook",
  analytics: true,
})
```

---

## 9. Repository Layer

```typescript
// src/modules/coin/coin.repository.ts
import { prisma } from "@/lib/prisma"
import type { CoinLedgerType, Prisma } from "@prisma/client"
import { WRITER_REVENUE_PERCENTAGE, THB_PER_COIN } from "./coin.constants"

export const coinRepository = {

  // ดึง Coin Packs ที่ active
  async getActivePacks() {
    return prisma.coinPack.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    })
  },

  // สร้าง transaction record (PENDING)
  async createPendingTransaction(data: {
    userId: string
    coinPackId: string
    coinsGranted: number
    paidAmount: number
    paymentGateway: string
    gatewayTxId: string
    paymentMethod: string
    gatewayPayload: object
  }) {
    return prisma.coinTransaction.create({ data })
  },

  // ดึง transaction by ID (สำหรับ polling status)
  async getTransactionById(id: string, userId: string) {
    return prisma.coinTransaction.findFirst({
      where: { id, userId },
      select: {
        id: true,
        status: true,
        coinsGranted: true,
        createdAt: true,
        completedAt: true,
      },
    })
  },

  // อัพเดท transaction เมื่อ webhook มา
  async updateTransactionStatus(
    gatewayTxId: string,
    status: "COMPLETED" | "FAILED" | "EXPIRED",
    extras?: { failureCode?: string; failureMessage?: string; completedAt?: Date }
  ) {
    return prisma.coinTransaction.update({
      where: { gatewayTxId },
      data: { status, ...extras },
    })
  },

  // ดึง balance ปัจจุบัน (พร้อม lock สำหรับ transaction)
  async getUserBalanceForUpdate(userId: string, tx: Prisma.TransactionClient) {
    const result = await tx.$queryRaw<{ coinBalance: number }[]>`
      SELECT "coinBalance" FROM "User"
      WHERE id = ${userId}
      FOR UPDATE
    `
    return result[0]?.coinBalance ?? 0
  },

  // เพิ่ม coin + เขียน ledger (ใช้ใน webhook handler)
  async creditCoins(
    userId: string,
    amount: number,
    refId: string,
    type: CoinLedgerType = "PURCHASE",
    note?: string
  ) {
    return prisma.$transaction(async (tx) => {
      const currentBalance = await this.getUserBalanceForUpdate(userId, tx)

      const user = await tx.user.update({
        where: { id: userId },
        data: { coinBalance: { increment: amount } },
        select: { coinBalance: true },
      })

      await tx.coinLedger.create({
        data: {
          userId,
          type,
          amount: +amount,
          balanceBefore: currentBalance,
          balanceAfter: user.coinBalance,
          refId,
          note,
        },
      })

      return user.coinBalance
    })
  },

  // ตรวจ unlock + หัก coin + เขียน writer revenue (atomic)
  async spendCoinsForChapter(
    userId: string,
    chapterId: string,
    novelId: string,
    writerId: string,
    price: number
  ) {
    return prisma.$transaction(async (tx) => {
      // 1. Lock row + ตรวจ balance
      const currentBalance = await this.getUserBalanceForUpdate(userId, tx)
      if (currentBalance < price) {
        throw new Error("INSUFFICIENT_COINS")
      }

      // 2. Create spend record (unique constraint จะ throw ถ้า unlock แล้ว)
      const spend = await tx.coinSpend.create({
        data: { userId, chapterId, novelId, amount: price },
      })

      // 3. หัก coin
      const user = await tx.user.update({
        where: { id: userId },
        data: { coinBalance: { decrement: price } },
        select: { coinBalance: true },
      })

      // 4. เขียน ledger
      await tx.coinLedger.create({
        data: {
          userId,
          type: "SPEND",
          amount: -price,
          balanceBefore: currentBalance,
          balanceAfter: user.coinBalance,
          refId: spend.id,
          note: `Unlock chapter: ${chapterId}`,
        },
      })

      // 5. เขียน writer revenue (70% ของราคา)
      const writerCoins = Math.floor(price * WRITER_REVENUE_PERCENTAGE)
      if (writerId !== userId) {  // ไม่ต้องจ่ายตัวเอง
        await tx.writerRevenue.create({
          data: {
            writerId,
            coinSpendId: spend.id,
            coinsEarned: writerCoins,
            thbAmount: writerCoins * THB_PER_COIN,
          },
        })
      }

      return { newBalance: user.coinBalance, spendId: spend.id }
    })
  },

  // ตรวจว่า unlock แล้วหรือยัง
  async isChapterUnlocked(userId: string, chapterId: string): Promise<boolean> {
    const spend = await prisma.coinSpend.findUnique({
      where: { userId_chapterId: { userId, chapterId } },
      select: { id: true },
    })
    return !!spend
  },

  // ดึง batch unlock status สำหรับ chapter list
  async getUnlockedChapterIds(userId: string, chapterIds: string[]): Promise<Set<string>> {
    const spends = await prisma.coinSpend.findMany({
      where: { userId, chapterId: { in: chapterIds } },
      select: { chapterId: true },
    })
    return new Set(spends.map(s => s.chapterId))
  },

  // ดึง coin history
  async getCoinHistory(userId: string, page: number, limit: number, type?: string) {
    const where = { userId, ...(type ? { type: type as CoinLedgerType } : {}) }
    const [items, total] = await Promise.all([
      prisma.coinLedger.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.coinLedger.count({ where }),
    ])
    return { items, total, pages: Math.ceil(total / limit) }
  },

  // คืน coin (admin refund)
  async refundCoins(
    transactionId: string,
    adminId: string,
    reason: string
  ) {
    return prisma.$transaction(async (tx) => {
      const transaction = await tx.coinTransaction.findUnique({
        where: { id: transactionId },
        select: { userId: true, coinsGranted: true, status: true },
      })
      if (!transaction || transaction.status !== "COMPLETED") {
        throw new Error("TRANSACTION_NOT_REFUNDABLE")
      }

      const currentBalance = await this.getUserBalanceForUpdate(transaction.userId, tx)
      if (currentBalance < transaction.coinsGranted) {
        throw new Error("INSUFFICIENT_BALANCE_FOR_REFUND")
      }

      // หัก coin คืน
      const user = await tx.user.update({
        where: { id: transaction.userId },
        data: { coinBalance: { decrement: transaction.coinsGranted } },
        select: { coinBalance: true },
      })

      // เขียน ledger
      await tx.coinLedger.create({
        data: {
          userId: transaction.userId,
          type: "REFUND",
          amount: -transaction.coinsGranted,
          balanceBefore: currentBalance,
          balanceAfter: user.coinBalance,
          refId: transactionId,
          note: `Refund by admin ${adminId}: ${reason}`,
        },
      })

      // อัพเดท status
      await tx.coinTransaction.update({
        where: { id: transactionId },
        data: { status: "REFUNDED" },
      })

      return { newBalance: user.coinBalance }
    })
  },

  // Cleanup: ลบ PENDING transactions ที่เก่ากว่า 24 ชม.
  async expireStalePendingTransactions() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
    return prisma.coinTransaction.updateMany({
      where: {
        status: "PENDING",
        createdAt: { lt: cutoff },
      },
      data: { status: "EXPIRED" },
    })
  },
}
```

---

## 10. Service Layer (Business Logic)

```typescript
// src/modules/coin/coin.service.ts
import Omise from "omise"
import { coinRepository } from "./coin.repository"
import { prisma } from "@/lib/prisma"
import {
  InsufficientCoinsError,
  AlreadyUnlockedError,
  DuplicateWebhookError,
  CoinPackNotFoundError,
} from "./coin.errors"
import type { OmiseWebhookPayload, CreateChargeRequest } from "./coin.types"

const omise = Omise({
  secretKey: process.env.OMISE_SECRET_KEY!,
  omiseVersion: "2019-05-29",
})

export const coinService = {

  // ─── ดึง Coin Packs ──────────────────────────────────────────────────────
  async getPacks() {
    const packs = await coinRepository.getActivePacks()
    return packs.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      priceDisplay: `${p.price / 100} บาท`,
      coins: p.coins,
      bonusCoins: p.bonusCoins,
      totalCoins: p.coins + p.bonusCoins,
      isFeatured: p.isFeatured,
    }))
  },

  // ─── สร้าง Charge (เริ่มกระบวนการจ่ายเงิน) ──────────────────────────────
  async createCharge(userId: string, data: CreateChargeRequest) {
    const pack = await prisma.coinPack.findFirst({
      where: { id: data.coinPackId, isActive: true },
    })
    if (!pack) throw new CoinPackNotFoundError(data.coinPackId)

    const totalCoins = pack.coins + pack.bonusCoins

    // สร้าง Charge ใน Omise
    const chargeParams: Record<string, unknown> = {
      amount: pack.price,
      currency: "THB",
      return_uri: data.returnUri ?? `${process.env.NEXT_PUBLIC_APP_URL}/coins/success`,
      metadata: {
        userId,
        coinPackId: pack.id,
        coinsToGrant: totalCoins,
        // coinTransactionId จะ set ข้างล่างหลัง create tx record
      },
      description: `StoriWrite Coins: ${pack.name} (${totalCoins} coins)`,
    }

    // PromptPay → create source, Credit Card → use token, TrueMoney → create source
    if (data.paymentMethod === "promptpay") {
      chargeParams.source = { type: "promptpay" }
    } else if (data.paymentMethod === "truemoney") {
      chargeParams.source = { type: "truemoney" }
    }
    // credit_card: token จะถูกส่งมาจาก Omise.js ใน frontend

    const charge = await omise.charges.create(chargeParams as any)

    // บันทึก transaction (PENDING) — ต้องบันทึก txId ลง metadata ด้วย
    const tx = await coinRepository.createPendingTransaction({
      userId,
      coinPackId: pack.id,
      coinsGranted: totalCoins,
      paidAmount: pack.price,
      paymentGateway: "omise",
      gatewayTxId: charge.id,
      paymentMethod: data.paymentMethod,
      gatewayPayload: charge,
    })

    // Return ข้อมูลสำหรับ render QR หรือ redirect
    return {
      transactionId: tx.id,
      chargeId: charge.id,
      paymentMethod: data.paymentMethod,
      amount: pack.price,
      qrCodeUrl: (charge as any).source?.scannable_code?.image?.download_uri,
      authorizeUri: (charge as any).authorize_uri,
      expiresAt: (charge as any).expires_at,
    }
  },

  // ─── ดึง Transaction Status (สำหรับ polling) ─────────────────────────────
  async getTransactionStatus(transactionId: string, userId: string) {
    return coinRepository.getTransactionById(transactionId, userId)
  },

  // ─── Process Webhook (charge.complete) ───────────────────────────────────
  async processWebhook(payload: OmiseWebhookPayload) {
    // รองรับเฉพาะ charge events
    if (!payload.key.startsWith("charge.")) return

    const charge = payload.data

    if (payload.key === "charge.complete" && charge.paid) {
      try {
        // Idempotency: ถ้า gatewayTxId มีอยู่แล้วและ COMPLETED = skip
        const existing = await prisma.coinTransaction.findUnique({
          where: { gatewayTxId: charge.id },
          select: { status: true },
        })

        if (existing?.status === "COMPLETED") {
          throw new DuplicateWebhookError(charge.id)
        }

        const { userId, coinsToGrant } = charge.metadata

        // ดึง transaction ID จาก DB (ไม่พึ่ง metadata ที่อาจถูก tamper)
        const txRecord = await prisma.coinTransaction.findUnique({
          where: { gatewayTxId: charge.id },
          select: { id: true },
        })
        if (!txRecord) throw new Error("Transaction record not found for charge")

        // เพิ่ม coin (atomic)
        const newBalance = await coinRepository.creditCoins(
          userId,
          Number(coinsToGrant),
          txRecord.id,
          "PURCHASE"
        )

        // อัพเดท status
        await coinRepository.updateTransactionStatus(charge.id, "COMPLETED", {
          completedAt: new Date(),
        })

        // TODO: ส่ง push notification "รับ X Coin แล้ว"
        return { success: true, newBalance }

      } catch (e: any) {
        if (e instanceof DuplicateWebhookError) return { success: true, duplicate: true }
        throw e
      }
    }

    if (payload.key === "charge.failed" || payload.key === "charge.expire") {
      await coinRepository.updateTransactionStatus(
        charge.id,
        payload.key === "charge.expire" ? "EXPIRED" : "FAILED",
        {
          failureCode: charge.failure_code,
          failureMessage: charge.failure_message,
        }
      )
    }
  },

  // ─── Unlock Chapter ───────────────────────────────────────────────────────
  async unlockChapter(userId: string, chapterId: string) {
    // ตรวจ unlock แล้วยัง
    const alreadyUnlocked = await coinRepository.isChapterUnlocked(userId, chapterId)
    if (alreadyUnlocked) return { success: true, alreadyUnlocked: true, newBalance: 0, coinsSpent: 0 }

    // ดึงราคา chapter จาก DB (ไม่รับจาก client!)
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId, isPublished: true },
      select: { coinPrice: true, novelId: true, novel: { select: { authorId: true } } },
    })
    if (!chapter) throw new Error("CHAPTER_NOT_FOUND")

    // Free chapter
    if (!chapter.coinPrice || chapter.coinPrice === 0) {
      return { success: true, alreadyUnlocked: false, newBalance: -1, coinsSpent: 0, free: true }
    }

    try {
      const result = await coinRepository.spendCoinsForChapter(
        userId,
        chapterId,
        chapter.novelId,
        chapter.novel.authorId,
        chapter.coinPrice
      )
      return {
        success: true,
        alreadyUnlocked: false,
        newBalance: result.newBalance,
        coinsSpent: chapter.coinPrice,
      }
    } catch (e: any) {
      if (e.message === "INSUFFICIENT_COINS") throw new InsufficientCoinsError(chapter.coinPrice, 0)
      if (e.code === "P2002") return { success: true, alreadyUnlocked: true, newBalance: 0, coinsSpent: 0 }
      throw e
    }
  },

  // ─── Coin Balance ─────────────────────────────────────────────────────────
  async getBalance(userId: string) {
    const [user, purchased, spent] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { coinBalance: true } }),
      prisma.coinLedger.aggregate({
        where: { userId, type: "PURCHASE" },
        _sum: { amount: true },
      }),
      prisma.coinLedger.aggregate({
        where: { userId, type: "SPEND" },
        _sum: { amount: true },
      }),
    ])
    return {
      balance: user?.coinBalance ?? 0,
      totalPurchased: purchased._sum.amount ?? 0,
      totalSpent: Math.abs(spent._sum.amount ?? 0),
    }
  },
}
```

---

## 11. API Routes

### GET /api/coins/packs
```typescript
// src/modules/coin/routes/coin-packs.route.ts
import { coinService } from "../coin.service"

export async function GET() {
  const packs = await coinService.getPacks()
  return Response.json({ packs })
}
```

---

### POST /api/coins/checkout
```typescript
// src/modules/coin/routes/coin-checkout.route.ts
import { auth } from "@/lib/auth"
import { coinService } from "../coin.service"
import { createChargeSchema } from "../coin.validation"
import { checkoutRateLimit } from "../coin.security"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  // Rate limit
  const { success } = await checkoutRateLimit.limit(session.user.id)
  if (!success) return Response.json({ error: "Too many requests" }, { status: 429 })

  const body = await req.json()
  const parsed = createChargeSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const result = await coinService.createCharge(session.user.id, parsed.data)
  return Response.json(result, { status: 201 })
}
```

---

### POST /api/webhooks/omise
```typescript
// src/modules/coin/routes/coin-webhook.route.ts
import { verifyOmiseWebhookSignature, webhookRateLimit } from "../coin.security"
import { coinService } from "../coin.service"
import { NextRequest } from "next/server"

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? req.ip ?? "unknown"

  // Rate limit by IP
  const { success } = await webhookRateLimit.limit(ip)
  if (!success) return Response.json({ error: "Rate limited" }, { status: 429 })

  // อ่าน raw body สำหรับ HMAC verification
  const rawBody = await req.text()
  const signature = req.headers.get("omise-signature")           // ← correct header name
  const timestamp = req.headers.get("omise-signature-timestamp") // ← timestamp header

  try {
    // 1. Verify signature + timestamp (ห้ามประมวลผลถ้า signature ไม่ถูกต้อง)
    verifyOmiseWebhookSignature(rawBody, signature, timestamp)

    // 2. Parse payload
    const payload = JSON.parse(rawBody)

    // 3. Process
    await coinService.processWebhook(payload)

    return Response.json({ received: true })
  } catch (e: any) {
    if (e.name === "InvalidWebhookSignatureError" || e.name === "WebhookTimestampError") {
      return Response.json({ error: "Invalid signature" }, { status: 401 })
    }
    console.error("[Webhook Error]", e.message)
    // Return 200 เสมอเพื่อไม่ให้ Omise retry ไม่หยุด
    return Response.json({ received: true, warning: e.message })
  }
}
```

> **หมายเหตุ:** Next.js App Router ไม่ต้อง `export const config = { api: { bodyParser: false } }` — นั่นเป็น Pages Router syntax. App Router ใช้ `req.text()` ได้โดยตรง.

---

### GET /api/coins/transactions/[id]
```typescript
// src/modules/coin/routes/coin-status.route.ts  
// ใช้สำหรับ QR payment polling — frontend poll ทุก 3 วินาทีจนกว่า status จะเปลี่ยน
import { auth } from "@/lib/auth"
import { coinService } from "../coin.service"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const tx = await coinService.getTransactionStatus(id, session.user.id)
  if (!tx) return Response.json({ error: "Not found" }, { status: 404 })

  return Response.json(tx)
}
```

---

### POST /api/coins/unlock
```typescript
// src/modules/coin/routes/coin-unlock.route.ts
import { auth } from "@/lib/auth"
import { coinService } from "../coin.service"
import { unlockChapterSchema } from "../coin.validation"
import { unlockRateLimit } from "../coin.security"
import { InsufficientCoinsError } from "../coin.errors"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  // Rate limit
  const { success } = await unlockRateLimit.limit(session.user.id)
  if (!success) return Response.json({ error: "Too many requests" }, { status: 429 })

  const body = await req.json()
  const parsed = unlockChapterSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const result = await coinService.unlockChapter(session.user.id, parsed.data.chapterId)
    return Response.json(result)
  } catch (e: any) {
    if (e instanceof InsufficientCoinsError) {
      return Response.json({
        error: "INSUFFICIENT_COINS",
        message: e.message,
        required: e.required,
        current: e.current,
      }, { status: 402 })
    }
    if (e.message === "CHAPTER_NOT_FOUND") {
      return Response.json({ error: "CHAPTER_NOT_FOUND" }, { status: 404 })
    }
    throw e
  }
}
```

---

### GET /api/coins/balance
```typescript
// src/modules/coin/routes/coin-balance.route.ts
import { auth } from "@/lib/auth"
import { coinService } from "../coin.service"

export async function GET() {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
  const balance = await coinService.getBalance(session.user.id)
  return Response.json(balance)
}
```

---

### GET /api/coins/history
```typescript
// src/modules/coin/routes/coin-history.route.ts
import { auth } from "@/lib/auth"
import { coinRepository } from "../coin.repository"
import { coinHistoryQuerySchema } from "../coin.validation"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const parsed = coinHistoryQuerySchema.safeParse(
    Object.fromEntries(searchParams)
  )
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const { page, limit, type } = parsed.data
  const history = await coinRepository.getCoinHistory(session.user.id, page, limit, type)
  return Response.json(history)
}
```

---

### POST /api/coins/refund (Admin Only)
```typescript
// src/modules/coin/routes/coin-refund.route.ts
import { auth } from "@/lib/auth"
import { coinRepository } from "../coin.repository"
import { refundSchema } from "../coin.validation"

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = refundSchema.safeParse(body)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const result = await coinRepository.refundCoins(
      parsed.data.transactionId,
      session.user.id,
      parsed.data.reason
    )
    return Response.json(result)
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 })
  }
}
```

---

## 12. Frontend Components

### CoinPackModal.tsx
```typescript
// แสดง Coin Packs + ปุ่มเลือก + Payment Method selector
// Flow: เลือก Pack → เลือกวิธีจ่าย → POST /api/coins/checkout → แสดง QR / redirect
```

### QRPaymentDialog.tsx
```typescript
// แสดง PromptPay QR Code + countdown timer จนหมดอายุ
// Poll GET /api/coins/transactions/[id] ทุก 3 วินาที
// เมื่อ status = COMPLETED: แสดง success animation + อัพเดท coin balance
// เมื่อ status = EXPIRED: แสดง "QR หมดอายุ ลองใหม่"
```

### CoinBalance.tsx
```typescript
// Header component แสดงเหรียญ icon + จำนวน coin ปัจจุบัน
// คลิกแล้วเปิด CoinPackModal
// ใช้ SWR หรือ React Query เพื่อ cache + revalidate
```

### UnlockChapterButton.tsx
```typescript
// แสดงราคา (เช่น 🪙 3 coins) และปุ่ม Unlock
// ถ้า balance ไม่พอ: แสดง "ซื้อ Coin เพิ่ม" → เปิด CoinPackModal
// หลัง unlock สำเร็จ: render chapter content ทันที + optimistic UI update
// กรณี race condition (P2002): แสดง "ปลดล็อคแล้ว" ไม่ error
```

### CoinHistoryPage.tsx
```typescript
// แสดง transaction history แบบ infinite scroll
// Filter ตาม type: ทั้งหมด | ซื้อ | ใช้ | คืน | โบนัส
// แสดง balance before/after ทุก row
```

---

## 13. Environment Variables เพิ่มเติม

```env
# Omise (Opn Payments)
OMISE_PUBLIC_KEY="pkey_test_..."
OMISE_SECRET_KEY="skey_test_..."
OMISE_WEBHOOK_SECRET="whsec_..."   # ตั้งค่าใน Omise Dashboard > Webhooks

# Upstash Redis (Rate Limiting)
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."
```

---

## 14. PostgreSQL Constraints (Run ใน Supabase SQL Editor)

```sql
-- ป้องกัน coin balance ติดลบ
ALTER TABLE "User"
ADD CONSTRAINT "coin_balance_non_negative"
CHECK ("coinBalance" >= 0);

-- ป้องกัน coin price ติดลบ
ALTER TABLE "Chapter"
ADD CONSTRAINT "coin_price_non_negative"
CHECK ("coinPrice" IS NULL OR "coinPrice" >= 0);
```

> **หมายเหตุ:** ไม่ใช้ Supabase RLS บน `CoinLedger` เพราะ Prisma ใช้ service role key (bypass RLS). ใช้ application-level access control แทน (auth check ใน route handler). ถ้าต้องการ RLS เพิ่มเติม ให้ใช้กับ Supabase client SDK เท่านั้น.

---

## 15. Security Checklist

| จุดเสี่ยง | การป้องกัน | ไฟล์ที่เกี่ยวข้อง |
|-----------|-----------|-----------------| 
| Webhook Replay Attack | `gatewayTxId @unique` + HMAC `timingSafeEqual` + timestamp check (≤5min) | coin.security.ts |
| Webhook Header Spoofing | Verify `Omise-Signature` header (not `x-opn-signature`) | coin.security.ts |
| Secret Rotation | Support comma-separated signatures in `Omise-Signature` | coin.security.ts |
| Race Condition / Double Spend | `SELECT FOR UPDATE` + `@@unique([userId, chapterId])` | coin.repository.ts |
| Negative Balance | PostgreSQL CHECK constraint + application-level check | SQL constraint |
| Client Price Manipulation | ราคา chapter มาจาก DB เท่านั้น, ไม่อ่านจาก client | coin.service.ts |
| Unlock Spam | Rate limit 10 req/min ต่อ user | coin.security.ts |
| Payment Spam | Rate limit 5 req/min ต่อ user | coin.security.ts |
| Webhook DDoS | Rate limit 100 req/min ต่อ IP | coin.security.ts |
| Audit Trail | CoinLedger immutable (application-level, no UPDATE/DELETE routes) | coin.repository.ts |
| SQL Injection | Prisma parameterized queries | Auto |
| HTTPS | Vercel enforce อัตโนมัติ | Auto |
| Secret Leak | .env ไม่ commit, ใช้ Vercel env vars | .gitignore |
| Unauthorized Access | NextAuth session check ทุก endpoint | All routes |
| Stale Pending Transactions | Cron cleanup PENDING > 24h → EXPIRED | coin.repository.ts |

---

## 16. Testing Plan

### Unit Tests (Vitest)
```typescript
// ทดสอบ service logic ทุก case
describe("coinService.unlockChapter", () => {
  it("should unlock chapter and deduct coins", ...)
  it("should return alreadyUnlocked=true if chapter already unlocked", ...)
  it("should throw InsufficientCoinsError if balance < price", ...)
  it("should handle race condition (concurrent unlock — P2002)", ...)
  it("should create WriterRevenue entry with 70% split", ...)
  it("should NOT create WriterRevenue if reader is the author", ...)
  it("should return free=true if coinPrice is 0 or null", ...)
})

describe("coinService.processWebhook", () => {
  it("should credit coins on charge.complete", ...)
  it("should ignore duplicate webhook (DuplicateWebhookError)", ...)
  it("should update status to FAILED on charge.failed", ...)
  it("should update status to EXPIRED on charge.expire", ...)
  it("should reject webhooks with invalid signature", ...)
  it("should reject webhooks with timestamp > 5min old", ...)
})

describe("coinRepository.refundCoins", () => {
  it("should refund coins and write ledger entry", ...)
  it("should throw if transaction is not COMPLETED", ...)
  it("should throw if user balance < refund amount", ...)
})
```

### Integration Tests
```typescript
describe("POST /api/coins/checkout", () => {
  it("should return 401 if not authenticated", ...)
  it("should return 429 if rate limited", ...)
  it("should return 400 with invalid coinPackId", ...)
  it("should create charge and return QR URL for promptpay", ...)
})

describe("POST /api/webhooks/omise", () => {
  it("should return 401 with invalid signature", ...)
  it("should return 401 with expired timestamp", ...)
  it("should process valid webhook and credit coins", ...)
})
```

### Load Tests (k6) — ทดสอบ Race Condition
```javascript
// ยิง unlock request พร้อมกัน 50 requests ใน 1 วินาที
// ตรวจว่า CoinSpend ถูกสร้างแค่ 1 record เท่านั้น
// และ balance หักแค่ครั้งเดียว
```

### Webhook Replay Test
```bash
# บันทึก webhook payload ที่ถูกต้อง 1 ครั้ง
# แล้วส่งซ้ำ 10 ครั้ง
# ตรวจว่า coin เพิ่มแค่ครั้งเดียว
```

---

*Coin Module Spec v1.1 — StoriWrite Novel Platform*  
*Stack: Next.js 16 · TypeScript · Prisma · Supabase · Omise (Opn Payments)*
