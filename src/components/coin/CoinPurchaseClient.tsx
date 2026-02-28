"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Coins, Sparkles, CheckCircle, Loader2, QrCode, CreditCard, Smartphone, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type PaymentMethod = "promptpay" | "credit_card" | "truemoney";

interface CheckoutResult {
    transactionId: string;
    chargeId: string;
    paymentMethod: string;
    amount: number;
    qrCodeUrl?: string;
    authorizeUri?: string;
    expiresAt?: string;
}

interface CoinPurchaseClientProps {
    packs: CoinPack[];
    currentBalance: number;
}

const paymentMethods: { id: PaymentMethod; label: string; icon: typeof QrCode; description: string }[] = [
    { id: "promptpay", label: "PromptPay", icon: QrCode, description: "สแกน QR Code ชำระผ่าน PromptPay" },
    { id: "credit_card", label: "บัตรเครดิต", icon: CreditCard, description: "Visa / Mastercard / JCB" },
    { id: "truemoney", label: "TrueMoney", icon: Smartphone, description: "ชำระผ่าน TrueMoney Wallet" },
];

export function CoinPurchaseClient({ packs, currentBalance }: CoinPurchaseClientProps) {
    const [selectedPack, setSelectedPack] = useState<string | null>(null);
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("promptpay");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);

    const handlePurchase = async () => {
        if (!selectedPack) return;
        setLoading(true);
        setError(null);

        try {
            const body: Record<string, string> = {
                coinPackId: selectedPack,
                paymentMethod: selectedMethod,
            };

            if (selectedMethod === "truemoney") {
                if (!phoneNumber || phoneNumber.length !== 10) {
                    setError("กรุณากรอกเบอร์โทรศัพท์ 10 หลัก");
                    setLoading(false);
                    return;
                }
                body.phoneNumber = phoneNumber;
            }

            const res = await fetch("/api/coins/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "เกิดข้อผิดพลาด");
                return;
            }

            // For credit card and truemoney — redirect to authorize URI
            if (data.authorizeUri && selectedMethod !== "promptpay") {
                window.location.href = data.authorizeUri;
                return;
            }

            // For PromptPay — show QR code
            setCheckoutResult(data);
        } catch {
            setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
        } finally {
            setLoading(false);
        }
    };

    // PromptPay QR code view after checkout
    if (checkoutResult && checkoutResult.qrCodeUrl) {
        return (
            <div className="mx-auto max-w-md space-y-6">
                <div className="text-center">
                    <h2 className="text-xl font-bold">สแกน QR Code เพื่อชำระเงิน</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        PromptPay — ฿{(checkoutResult.amount / 100).toFixed(2)}
                    </p>
                </div>

                <Card>
                    <CardContent className="flex flex-col items-center py-8">
                        <div className="rounded-xl border-4 border-amber-500/20 bg-white p-4">
                            <Image
                                src={checkoutResult.qrCodeUrl}
                                alt="PromptPay QR Code"
                                width={240}
                                height={240}
                                className="h-60 w-60"
                                unoptimized
                            />
                        </div>
                        {checkoutResult.expiresAt && (
                            <p className="mt-4 text-xs text-muted-foreground">
                                หมดอายุ: {new Date(checkoutResult.expiresAt).toLocaleString("th-TH")}
                            </p>
                        )}
                        <p className="mt-2 text-sm text-muted-foreground">
                            Coin จะเข้าบัญชีอัตโนมัติหลังชำระเงินสำเร็จ
                        </p>
                    </CardContent>
                </Card>

                <div className="flex flex-col items-center gap-2">
                    <Button variant="outline" onClick={() => setCheckoutResult(null)}>
                        เลือกแพ็คเกจอื่น
                    </Button>
                    <Button variant="link" size="sm" asChild>
                        <Link href="/coins/history">
                            <History className="mr-1 h-3.5 w-3.5" />
                            ดูประวัติ
                        </Link>
                    </Button>
                </div>
            </div>
        );
    }

    // Checkout created but no QR (credit card redirect pending or error)
    if (checkoutResult && !checkoutResult.qrCodeUrl) {
        return (
            <div className="mx-auto max-w-md space-y-6 text-center">
                <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                <h2 className="text-xl font-bold">สร้างรายการสำเร็จ</h2>
                <p className="text-muted-foreground">
                    {checkoutResult.authorizeUri
                        ? "กำลังนำคุณไปยังหน้าชำระเงิน..."
                        : "รอการยืนยันจากระบบชำระเงิน Coin จะเข้าบัญชีอัตโนมัติ"}
                </p>
                {checkoutResult.authorizeUri && (
                    <Button asChild>
                        <a href={checkoutResult.authorizeUri}>ไปหน้าชำระเงิน</a>
                    </Button>
                )}
                <Button variant="outline" onClick={() => setCheckoutResult(null)}>
                    กลับ
                </Button>
            </div>
        );
    }

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

            {/* Payment method selection */}
            {selectedPack && (
                <div className="mx-auto max-w-lg space-y-4">
                    <h3 className="text-center text-sm font-semibold text-muted-foreground">เลือกวิธีชำระเงิน</h3>
                    <div className="grid gap-3 sm:grid-cols-3">
                        {paymentMethods.map((method) => {
                            const Icon = method.icon;
                            return (
                                <button
                                    key={method.id}
                                    type="button"
                                    onClick={() => setSelectedMethod(method.id)}
                                    className={cn(
                                        "flex flex-col items-center gap-2 rounded-lg border p-4 transition-all hover:bg-accent",
                                        selectedMethod === method.id && "ring-2 ring-primary bg-accent"
                                    )}
                                >
                                    <Icon className={cn("h-6 w-6", selectedMethod === method.id ? "text-primary" : "text-muted-foreground")} />
                                    <span className="text-sm font-medium">{method.label}</span>
                                    <span className="text-[11px] text-muted-foreground leading-tight text-center">
                                        {method.description}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* TrueMoney phone number */}
                    {selectedMethod === "truemoney" && (
                        <div className="mx-auto max-w-xs space-y-2">
                            <Label htmlFor="phoneNumber">เบอร์โทรศัพท์</Label>
                            <Input
                                id="phoneNumber"
                                type="tel"
                                placeholder="08XXXXXXXX"
                                maxLength={10}
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                            />
                        </div>
                    )}
                </div>
            )}

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

            {/* Error message */}
            {error && (
                <div className="mx-auto max-w-md rounded-lg bg-red-500/10 p-4 text-center text-sm text-red-600">
                    {error}
                </div>
            )}

            {/* Link to history */}
            <div className="text-center">
                <Button variant="link" size="sm" asChild>
                    <Link href="/coins/history">
                        <History className="mr-1 h-3.5 w-3.5" />
                        ดูประวัติ Coin
                    </Link>
                </Button>
            </div>
        </div>
    );
}
