"use client";

import { useState } from "react";
import { Lock, Coins, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

interface ChapterUnlockButtonProps {
    chapterId: string;
    coinPrice: number;
    chapterTitle: string;
    isUnlocked: boolean;
    userBalance: number;
    onUnlocked?: () => void;
}

export function ChapterUnlockButton({
    chapterId,
    coinPrice,
    chapterTitle,
    isUnlocked,
    userBalance,
    onUnlocked,
}: ChapterUnlockButtonProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [unlocked, setUnlocked] = useState(isUnlocked);

    if (unlocked || coinPrice <= 0) return null;

    const canAfford = userBalance >= coinPrice;

    const handleUnlock = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/coins/unlock", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chapterId }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "เกิดข้อผิดพลาด");
                return;
            }

            setUnlocked(true);
            setOpen(false);
            onUnlocked?.();
        } catch {
            setError("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Lock className="h-4 w-4" />
                    <Coins className="h-4 w-4 text-amber-500" />
                    {coinPrice} Coin
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>ปลดล็อคตอนนี้</DialogTitle>
                    <DialogDescription>
                        {chapterTitle}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex items-center justify-between rounded-lg bg-muted p-4">
                        <span>ราคา</span>
                        <span className="flex items-center gap-1 font-semibold">
                            <Coins className="h-4 w-4 text-amber-500" />
                            {coinPrice} Coin
                        </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted p-4">
                        <span>Coin ของคุณ</span>
                        <span className={`font-semibold ${canAfford ? "text-green-500" : "text-red-500"}`}>
                            {userBalance.toLocaleString()} Coin
                        </span>
                    </div>

                    {!canAfford && (
                        <p className="text-center text-sm text-red-500">
                            Coin ไม่เพียงพอ — ต้องการอีก {coinPrice - userBalance} Coin
                        </p>
                    )}

                    {error && (
                        <p className="text-center text-sm text-red-500">{error}</p>
                    )}
                </div>

                <DialogFooter>
                    {canAfford ? (
                        <Button onClick={handleUnlock} disabled={loading} className="w-full">
                            {loading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Coins className="mr-2 h-4 w-4" />
                            )}
                            ยืนยันปลดล็อค
                        </Button>
                    ) : (
                        <Button asChild className="w-full">
                            <a href="/coins">เติม Coin</a>
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
