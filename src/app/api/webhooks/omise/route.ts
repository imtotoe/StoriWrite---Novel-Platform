import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { completeCoinPurchase } from "@/modules/coin/coin.service";
import { verifyOmiseSignature, isTimestampValid } from "@/modules/coin/coin.security";

// POST — Omise webhook for charge completion
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("omise-signature") || "";

  // Verify HMAC signature if secret is configured
  const webhookSecret = process.env.OMISE_WEBHOOK_SIGNING_SECRET;
  if (webhookSecret && signature) {
    if (!verifyOmiseSignature(rawBody, signature, webhookSecret)) {
      console.error("Omise webhook: invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate timestamp to prevent replay attacks
  if (event.created_at && !isTimestampValid(event.created_at as string)) {
    console.error("Omise webhook: stale timestamp");
    return NextResponse.json({ error: "Stale webhook" }, { status: 400 });
  }

  // Handle charge.complete events (Omise sends this key)
  if (event.key !== "charge.complete") {
    return NextResponse.json({ received: true });
  }

  const charge = event.data as Record<string, unknown>;
  const chargeId = charge.id as string;

  // Idempotency: find the transaction by gateway ID
  const transaction = await prisma.coinTransaction.findUnique({
    where: { gatewayTxId: chargeId },
  });

  if (!transaction) {
    console.error(`Omise webhook: no transaction for charge ${chargeId}`);
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  if (transaction.status !== "PENDING") {
    // Already processed (idempotent)
    return NextResponse.json({ received: true, status: transaction.status });
  }

  try {
    if (charge.status === "successful") {
      await completeCoinPurchase(transaction.id);
      return NextResponse.json({ received: true, status: "COMPLETED" });
    } else if (charge.status === "failed") {
      await prisma.coinTransaction.update({
        where: { id: transaction.id },
        data: {
          status: "FAILED",
          failureCode: (charge.failure_code as string) || null,
          failureMessage: (charge.failure_message as string) || null,
        },
      });
      return NextResponse.json({ received: true, status: "FAILED" });
    } else if (charge.status === "expired") {
      await prisma.coinTransaction.update({
        where: { id: transaction.id },
        data: { status: "EXPIRED", expiredAt: new Date() },
      });
      return NextResponse.json({ received: true, status: "EXPIRED" });
    }
  } catch (err) {
    console.error("Omise webhook processing error:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
