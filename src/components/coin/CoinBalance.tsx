"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Coins } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function CoinBalance() {
    const { data: session } = useSession();
    const [balance, setBalance] = useState<number | null>(null);

    useEffect(() => {
        if (!session) return;
        fetch("/api/coins/balance")
            .then((r) => r.json())
            .then((d) => setBalance(d.balance ?? 0))
            .catch(() => setBalance(0));
    }, [session]);

    if (!session || balance === null) return null;

    return (
        <Button variant="ghost" size="sm" asChild className="gap-1.5 text-amber-500">
            <Link href="/coins">
                <Coins className="h-4 w-4" />
                <span className="font-semibold">{balance.toLocaleString()}</span>
            </Link>
        </Button>
    );
}
