export interface CoinPackDTO {
  id: string;
  name: string;
  price: number;
  priceDisplay: string;
  coins: number;
  bonusCoins: number;
  totalCoins: number;
  isFeatured: boolean;
}

export interface CreateChargeRequest {
  coinPackId: string;
  paymentMethod: "promptpay" | "credit_card" | "truemoney";
  returnUri?: string;
  token?: string;          // Omise card token (for credit_card)
  phoneNumber?: string;    // phone number (for truemoney)
}

export interface CreateChargeResponse {
  transactionId: string;
  chargeId: string;
  paymentMethod: string;
  amount: number;
  qrCodeUrl?: string;
  authorizeUri?: string;
  expiresAt?: string;
}

export interface UnlockChapterRequest {
  chapterId: string;
}

export interface UnlockChapterResponse {
  success: boolean;
  alreadyUnlocked?: boolean;
  newBalance: number;
  coinsSpent: number;
}

export interface CoinBalanceResponse {
  balance: number;
  totalPurchased: number;
  totalSpent: number;
}

export interface CoinHistoryItem {
  id: string;
  type: "PURCHASE" | "SPEND" | "REFUND" | "BONUS";
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}
