import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getCoinBalance } from "@/modules/coin/coin.service";

// GET — get user coin balance
export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const balance = await getCoinBalance(session.user.id);
    return NextResponse.json(balance);
  } catch (err) {
    console.error("Failed to fetch coin balance:", err);
    return NextResponse.json({ error: "Failed to fetch balance" }, { status: 500 });
  }
}
