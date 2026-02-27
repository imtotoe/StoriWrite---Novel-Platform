import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookText, Eye, ThumbsUp, MessageSquare } from "lucide-react";

export const metadata = { title: "Writer Dashboard" };

export default async function WriterDashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [novelCount, totalViews, totalVotes, totalComments] = await Promise.all([
    prisma.novel.count({ where: { authorId: session.user.id } }),
    prisma.novel.aggregate({
      where: { authorId: session.user.id },
      _sum: { views: true },
    }),
    prisma.vote.count({
      where: { novel: { authorId: session.user.id } },
    }),
    prisma.comment.count({
      where: { chapter: { novel: { authorId: session.user.id } } },
    }),
  ]);

  const stats = [
    { label: "นิยายทั้งหมด", value: novelCount, icon: BookText },
    { label: "ยอดวิว", value: totalViews._sum.views ?? 0, icon: Eye },
    { label: "โหวต", value: totalVotes, icon: ThumbsUp },
    { label: "คอมเมนต์", value: totalComments, icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Writer Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
