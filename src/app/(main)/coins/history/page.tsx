import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CoinHistoryClient } from "@/components/coin/CoinHistoryClient";

export const metadata = {
    title: "ประวัติ Coin",
    description: "ดูประวัติการซื้อและใช้ Coin",
};

export default async function CoinHistoryPage() {
    const session = await auth();
    if (!session) redirect("/login");

    return (
        <div className="mx-auto max-w-2xl px-4 py-8">
            <h1 className="mb-6 text-2xl font-bold">ประวัติ Coin</h1>
            <CoinHistoryClient />
        </div>
    );
}
