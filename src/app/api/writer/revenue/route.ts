import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const writerId = session.user.id;

    const [earnings, totalStats, pendingWithdrawals] = await Promise.all([
        // Recent earnings
        prisma.writerRevenue.findMany({
            where: { writerId },
            orderBy: { createdAt: "desc" },
            take: 10,
            select: {
                id: true,
                coinsEarned: true,
                thbAmount: true,
                createdAt: true,
            },
        }),
        // Aggregate totals
        prisma.writerRevenue.aggregate({
            where: { writerId },
            _sum: { coinsEarned: true, thbAmount: true },
        }),
        // Pending withdrawal amount
        prisma.withdrawalRequest.aggregate({
            where: { writerId, status: "PENDING" },
            _sum: { amount: true },
        }),
    ]);

    return NextResponse.json({
        totalCoinsEarned: totalStats._sum.coinsEarned ?? 0,
        totalThbEarned: Number(totalStats._sum.thbAmount ?? 0),
        pendingWithdrawal: Number(pendingWithdrawals._sum.amount ?? 0),
        recentEarnings: earnings.map((e) => ({
            ...e,
            thbAmount: Number(e.thbAmount),
            createdAt: e.createdAt.toISOString(),
        })),
    });
}
