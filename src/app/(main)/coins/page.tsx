import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCoinPacks, getCoinBalance } from "@/modules/coin/coin.service";
import { CoinPurchaseClient } from "@/components/coin/CoinPurchaseClient";

export const metadata = {
    title: "ซื้อ Coin",
    description: "เติม Coin เพื่อปลดล็อคตอนนิยายพิเศษ",
};

export default async function CoinPurchasePage() {
    const session = await auth();
    if (!session) redirect("/login");

    const [packs, balanceData] = await Promise.all([
        getCoinPacks(),
        getCoinBalance(session.user.id),
    ]);

    return (
        <div className="mx-auto max-w-4xl px-4 py-8">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold">เติม Coin</h1>
                <p className="mt-2 text-muted-foreground">
                    เลือกแพ็คเกจ Coin เพื่อปลดล็อคตอนนิยายพิเศษ
                </p>
            </div>

            <CoinPurchaseClient packs={packs} currentBalance={balanceData.balance} />
        </div>
    );
}
