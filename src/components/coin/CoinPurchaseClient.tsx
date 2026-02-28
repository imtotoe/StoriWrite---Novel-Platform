"use client";

import { useState } from "react";
import { Coins, Sparkles, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CoinPack {
    id: string;
    name: string;
    price: number;
    priceDisplay: string;
    coins: number;
    bonusCoins: number;
    totalCoins: number;
    isFeatured: boolean;
}

interface CoinPurchaseClientProps {
    packs: CoinPack[];
    currentBalance: number;
}

export function CoinPurchaseClient({ packs, currentBalance }: CoinPurchaseClientProps) {
    const [selectedPack, setSelectedPack] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

    const handlePurchase = async () => {
        if (!selectedPack) return;
        setLoading(true);
        setResult(null);

        try {
            const res = await fetch("/api/coins/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ coinPackId: selectedPack, paymentMethod: "promptpay" }),
            });
            const data = await res.json();

            if (!res.ok) {
                setResult({ success: false, message: data.error || "เกิดข้อผิดพลาด" });
                return;
            }

            // In production, this would show QR code or redirect
            // For now, we show the transaction was created
            setResult({
                success: true,
                message: `สร้างรายการสำเร็จ! Transaction ID: ${data.transactionId}`,
            });
        } catch {
            setResult({ success: false, message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Current balance */}
            <div className="text-center">
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-6 py-3">
                    <Coins className="h-6 w-6 text-amber-500" />
                    <span className="text-2xl font-bold text-amber-500">{currentBalance.toLocaleString()}</span>
                    <span className="text-muted-foreground">Coins</span>
                </div>
            </div>

            {/* Coin pack grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {packs.map((pack) => (
                    <Card
                        key={pack.id}
                        className={cn(
                            "relative cursor-pointer transition-all hover:shadow-lg",
                            selectedPack === pack.id && "ring-2 ring-primary shadow-lg",
                            pack.isFeatured && "border-amber-500/50"
                        )}
                        onClick={() => setSelectedPack(pack.id)}
                    >
                        {pack.isFeatured && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-0.5 text-xs font-semibold text-white">
                                    <Sparkles className="h-3 w-3" /> ยอดนิยม
                                </span>
                            </div>
                        )}
                        <CardContent className="pt-6 text-center">
                            <div className="mb-2 flex items-center justify-center gap-1">
                                <Coins className="h-5 w-5 text-amber-500" />
                                <span className="text-3xl font-bold">{pack.coins}</span>
                            </div>
                            {pack.bonusCoins > 0 && (
                                <p className="mb-2 text-sm font-medium text-green-500">
                                    +{pack.bonusCoins} โบนัส
                                </p>
                            )}
                            <p className="text-lg font-semibold">{pack.priceDisplay}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                ~{(pack.price / 100 / pack.totalCoins).toFixed(2)} บาท/coin
                            </p>
                            {selectedPack === pack.id && (
                                <CheckCircle className="mx-auto mt-3 h-5 w-5 text-primary" />
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Purchase button */}
            <div className="text-center">
                <Button
                    size="lg"
                    className="min-w-[200px]"
                    disabled={!selectedPack || loading}
                    onClick={handlePurchase}
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            กำลังดำเนินการ...
                        </>
                    ) : (
                        <>
                            <Coins className="mr-2 h-4 w-4" />
                            ซื้อ Coin
                        </>
                    )}
                </Button>
            </div>

            {/* Result message */}
            {result && (
                <div
                    className={cn(
                        "mx-auto max-w-md rounded-lg p-4 text-center text-sm",
                        result.success ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                    )}
                >
                    {result.message}
                </div>
            )}
        </div>
    );
}
