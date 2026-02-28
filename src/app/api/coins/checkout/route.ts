import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import Omise from "omise";

const omise = Omise({
  secretKey: process.env.OMISE_SECRET_KEY!,
});

// POST — create charge via Omise
export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { coinPackId, paymentMethod, returnUri, token, phoneNumber } = body;

  if (!coinPackId || !paymentMethod) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const validMethods = ["promptpay", "credit_card", "truemoney"];
  if (!validMethods.includes(paymentMethod)) {
    return NextResponse.json({ error: "Unsupported payment method" }, { status: 400 });
  }

  const pack = await prisma.coinPack.findUnique({ where: { id: coinPackId } });
  if (!pack || !pack.isActive) {
    return NextResponse.json({ error: "Invalid coin pack" }, { status: 400 });
  }

  const statusUrl = returnUri || `${process.env.NEXT_PUBLIC_APP_URL}/coins`;

  try {
    let charge: Awaited<ReturnType<typeof omise.charges.create>>;

    if (paymentMethod === "promptpay") {
      const source = await omise.sources.create({
        amount: pack.price,
        currency: "THB",
        type: "promptpay",
      });

      charge = await omise.charges.create({
        amount: pack.price,
        currency: "THB",
        source: source.id,
        return_uri: statusUrl,
      });
    } else if (paymentMethod === "truemoney") {
      if (!phoneNumber) {
        return NextResponse.json({ error: "phoneNumber is required for TrueMoney" }, { status: 400 });
      }

      const source = await omise.sources.create({
        amount: pack.price,
        currency: "THB",
        type: "truemoney",
        phone_number: phoneNumber,
      });

      charge = await omise.charges.create({
        amount: pack.price,
        currency: "THB",
        source: source.id,
        return_uri: statusUrl,
      });
    } else if (paymentMethod === "credit_card") {
      if (!token) {
        return NextResponse.json({ error: "token is required for credit card" }, { status: 400 });
      }

      charge = await omise.charges.create({
        amount: pack.price,
        currency: "THB",
        card: token,
        return_uri: statusUrl,
      });
    } else {
      return NextResponse.json({ error: "Unsupported payment method" }, { status: 400 });
    }

    // Create pending transaction
    const transaction = await prisma.coinTransaction.create({
      data: {
        userId: session.user.id,
        coinPackId: pack.id,
        coinsGranted: pack.coins + pack.bonusCoins,
        paidAmount: pack.price,
        paymentGateway: "omise",
        gatewayTxId: charge.id,
        gatewayPayload: JSON.parse(JSON.stringify(charge)),
        paymentMethod,
        status: "PENDING",
      },
    });

    const qrCodeUrl = charge.source?.scannable_code?.image?.download_uri;

    return NextResponse.json({
      transactionId: transaction.id,
      chargeId: charge.id,
      paymentMethod,
      amount: pack.price,
      qrCodeUrl,
      authorizeUri: charge.authorize_uri,
      expiresAt: charge.expires_at,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Payment creation failed";
    console.error("Omise charge error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
