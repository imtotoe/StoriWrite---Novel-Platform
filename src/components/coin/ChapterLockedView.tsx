"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Coins, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChapterUnlockButton } from "./ChapterUnlockButton";

interface ChapterLockedViewProps {
    chapterId: string;
    chapterTitle: string;
    chapterNumber: number;
    coinPrice: number;
    novelSlug: string;
    novelTitle: string;
    userBalance: number;
    isLoggedIn: boolean;
}

export function ChapterLockedView({
    chapterId,
    chapterTitle,
    chapterNumber,
    coinPrice,
    novelSlug,
    novelTitle,
    userBalance,
    isLoggedIn,
}: ChapterLockedViewProps) {
    const router = useRouter();

    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
            {/* Lock icon */}
            <div className="mb-6 rounded-full bg-amber-500/10 p-6">
                <Lock className="h-12 w-12 text-amber-500" />
            </div>

            {/* Chapter info */}
            <h1 className="mb-2 text-xl font-bold">
                ตอนที่ {chapterNumber}: {chapterTitle}
            </h1>
            <p className="mb-1 text-sm text-muted-foreground">{novelTitle}</p>

            {/* Price */}
            <div className="mb-6 mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-5 py-2.5">
                <Coins className="h-5 w-5 text-amber-500" />
                <span className="text-lg font-bold">{coinPrice}</span>
                <span className="text-muted-foreground">Coin</span>
            </div>

            {/* Actions */}
            {isLoggedIn ? (
                <div className="flex flex-col items-center gap-3">
                    <ChapterUnlockButton
                        chapterId={chapterId}
                        coinPrice={coinPrice}
                        chapterTitle={`ตอนที่ ${chapterNumber}: ${chapterTitle}`}
                        isUnlocked={false}
                        userBalance={userBalance}
                        onUnlocked={() => router.refresh()}
                    />
                    {userBalance < coinPrice && (
                        <Button variant="link" asChild>
                            <Link href="/coins">
                                <Coins className="mr-1 h-4 w-4" />
                                เติม Coin
                            </Link>
                        </Button>
                    )}
                </div>
            ) : (
                <Button asChild>
                    <Link href="/login">เข้าสู่ระบบเพื่อปลดล็อค</Link>
                </Button>
            )}

            {/* Back to novel */}
            <Button variant="ghost" size="sm" className="mt-6" asChild>
                <Link href={`/novel/${novelSlug}`}>
                    <BookOpen className="mr-1 h-4 w-4" />
                    กลับไปสารบัญ
                </Link>
            </Button>
        </div>
    );
}
