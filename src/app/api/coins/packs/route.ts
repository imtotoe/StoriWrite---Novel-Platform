import { NextResponse } from "next/server";
import { getCoinPacks } from "@/modules/coin/coin.service";

// GET — list active coin packs
export async function GET() {
  try {
    const packs = await getCoinPacks();
    return NextResponse.json({ packs });
  } catch (err) {
    console.error("Failed to fetch coin packs:", err);
    return NextResponse.json({ error: "Failed to fetch coin packs" }, { status: 500 });
  }
}
