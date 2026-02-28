"use client";

import { useEffect, useState } from "react";
import { Coins, TrendingUp, DollarSign, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


interface RevenueData {
    totalCoinsEarned: number;
    totalThbEarned: number;
    pendingWithdrawal: number;
    recentEarnings: {
        id: string;
        coinsEarned: number;
        thbAmount: number;
        createdAt: string;
    }[];
}

export function WriterRevenueCard() {
    const [data, setData] = useState<RevenueData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/writer/revenue")
            .then((r) => {
                if (!r.ok) throw new Error();
                return r.json();
            })
            .then(setData)
            .catch(() => setData(null))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Coins className="h-5 w-5 text-amber-500" />
                        รายได้จาก Coin
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">กำลังโหลด...</p>
                </CardContent>
            </Card>
        );
    }

    if (!data) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Coins className="h-5 w-5 text-amber-500" />
                        รายได้จาก Coin
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">ยังไม่มีรายได้จาก Coin</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-amber-500" />
                    รายได้จาก Coin
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg bg-green-500/10 p-3 text-center">
                        <TrendingUp className="mx-auto mb-1 h-5 w-5 text-green-500" />
                        <p className="text-xl font-bold text-green-600">{data.totalCoinsEarned}</p>
                        <p className="text-xs text-muted-foreground">Coins ที่ได้รับ</p>
                    </div>
                    <div className="rounded-lg bg-amber-500/10 p-3 text-center">
                        <DollarSign className="mx-auto mb-1 h-5 w-5 text-amber-500" />
                        <p className="text-xl font-bold text-amber-600">฿{data.totalThbEarned.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">มูลค่ารวม (THB)</p>
                    </div>
                    <div className="rounded-lg bg-blue-500/10 p-3 text-center">
                        <Download className="mx-auto mb-1 h-5 w-5 text-blue-500" />
                        <p className="text-xl font-bold text-blue-600">฿{data.pendingWithdrawal.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">รอถอน</p>
                    </div>
                </div>

                {data.recentEarnings.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">รายได้ล่าสุด</p>
                        {data.recentEarnings.slice(0, 5).map((e) => (
                            <div key={e.id} className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                    {new Date(e.createdAt).toLocaleDateString("th-TH")}
                                </span>
                                <span className="font-medium text-green-500">+{e.coinsEarned} coins</span>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
