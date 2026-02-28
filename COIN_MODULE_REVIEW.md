# Coin Module — Review & Progress

> Audit of `COIN_MODULE_SPEC.md` vs actual implementation  
> Last Updated: 2026-02-28

---

## Database Schema

| Model | Status |
|-------|--------|
| `CoinPack` | ✅ |
| `CoinTransaction` | ✅ |
| `CoinSpend` | ✅ |
| `CoinLedger` | ✅ |
| `WriterRevenue` | ✅ |
| `WithdrawalRequest` | ✅ |
| `User.coinBalance` | ✅ |
| `Chapter.coinPrice` | ✅ |

## Backend

| Item | Status |
|------|--------|
| `coin.types.ts` | ✅ |
| `coin.constants.ts` | ✅ |
| `coin.security.ts` | ✅ |
| `coin.service.ts` | ✅ |
| `coin.repository.ts` | ⏭️ Absorbed into service |
| `coin.validation.ts` | ❌ Not built |
| `coin.errors.ts` | ❌ Not built |

## API Routes

| Route | Status |
|-------|--------|
| `GET /api/coins/packs` | ✅ |
| `POST /api/coins/checkout` | ✅ |
| `POST /api/coins/unlock` | ✅ |
| `GET /api/coins/balance` | ✅ |
| `GET /api/coins/history` | ✅ |
| `POST /api/webhooks/omise` | ✅ |
| `GET /api/writer/revenue` | ✅ NEW |
| `POST /api/coins/refund` | ❌ |
| `GET /api/coins/transactions/[id]` | ❌ |

## Frontend UI

| Component | Status |
|-----------|--------|
| Coin packs seeded in DB | ✅ DONE |
| Coin balance in navbar | ✅ DONE — `CoinBalance.tsx` |
| Coin purchase page (`/coins`) | ✅ DONE — `CoinPurchaseClient.tsx` + page |
| Chapter unlock button (🔒) | ✅ DONE — `ChapterUnlockButton.tsx` |
| Chapter locked view | ✅ DONE — `ChapterLockedView.tsx` |
| Coin-gated chapter page | ✅ DONE — updated `[chapterId]/page.tsx` |
| Coin history page (`/coins/history`) | ✅ DONE — `CoinHistoryClient.tsx` + page |
| Writer revenue in dashboard | ✅ DONE — `WriterRevenueCard.tsx` |
| Withdrawal request page | ❌ Not built |

## Security

| Feature | Status |
|---------|--------|
| HMAC webhook verification | ✅ |
| Timestamp drift check | ✅ |
| Rate limiting (Upstash) | ❌ |
| Idempotency (unique constraint) | ✅ |

## Remaining Items

- Coin validation with Zod schemas
- Custom error classes
- Refund API route (admin)
- Transaction status polling route
- Withdrawal request UI
- Rate limiting with Upstash Redis
