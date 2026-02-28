import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { getCoinHistory } from "@/modules/coin/coin.service";

// GET — get coin transaction history
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const history = await getCoinHistory(session.user.id, Math.min(limit, 50), offset);
    return NextResponse.json({ history });
  } catch (err) {
    console.error("Failed to fetch coin history:", err);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
