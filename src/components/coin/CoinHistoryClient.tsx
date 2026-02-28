"use client";

import { useEffect, useState } from "react";
import { Coins, ArrowUpCircle, ArrowDownCircle, Gift, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HistoryItem {
    id: string;
    type: "PURCHASE" | "SPEND" | "REFUND" | "BONUS";
    amount: number;
    balanceAfter: number;
    description: string;
    createdAt: string;
}

const typeConfig: Record<string, { icon: typeof Coins; color: string; label: string }> = {
    PURCHASE: { icon: ArrowUpCircle, color: "text-green-500", label: "ซื้อ Coin" },
    SPEND: { icon: ArrowDownCircle, color: "text-red-500", label: "ใช้ Coin" },
    REFUND: { icon: RotateCcw, color: "text-blue-500", label: "คืน Coin" },
    BONUS: { icon: Gift, color: "text-purple-500", label: "โบนัส" },
};

export function CoinHistoryClient() {
    const [items, setItems] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [balance, setBalance] = useState(0);

    useEffect(() => {
        Promise.all([
            fetch("/api/coins/history").then((r) => r.json()),
            fetch("/api/coins/balance").then((r) => r.json()),
        ])
            .then(([history, bal]) => {
                setItems(history.items ?? history ?? []);
                setBalance(bal.balance ?? 0);
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Coins className="h-6 w-6 animate-pulse text-amber-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Balance card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Coins className="h-5 w-5 text-amber-500" />
                        ยอด Coin ปัจจุบัน
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold text-amber-500">{balance.toLocaleString()}</p>
                </CardContent>
            </Card>

            {/* History list */}
            <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">ประวัติการใช้งาน</h3>
                {items.length === 0 ? (
                    <p className="py-8 text-center text-muted-foreground">ยังไม่มีประวัติ</p>
                ) : (
                    items.map((item) => {
                        const cfg = typeConfig[item.type] || typeConfig.PURCHASE;
                        const Icon = cfg.icon;
                        return (
                            <div
                                key={item.id}
                                className="flex items-center justify-between rounded-lg border px-4 py-3"
                            >
                                <div className="flex items-center gap-3">
                                    <Icon className={`h-5 w-5 ${cfg.color}`} />
                                    <div>
                                        <p className="text-sm font-medium">{item.description}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(item.createdAt).toLocaleDateString("th-TH", {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-sm font-semibold ${item.amount > 0 ? "text-green-500" : "text-red-500"}`}>
                                        {item.amount > 0 ? "+" : ""}{item.amount}
                                    </p>
                                    <p className="text-xs text-muted-foreground">คงเหลือ {item.balanceAfter}</p>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
