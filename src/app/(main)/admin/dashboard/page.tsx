import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, FileText, MessageCircle, Flag, AlertTriangle } from "lucide-react";

export const metadata = { title: "ภาพรวมระบบ" };

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/");

  const [userCount, writerCount, novelCount, publishedNovelCount, chapterCount, commentCount, reportCount, pendingReports] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "WRITER" } }),
      prisma.novel.count(),
      prisma.novel.count({ where: { isPublished: true } }),
      prisma.chapter.count(),
      prisma.comment.count(),
      prisma.report.count(),
      prisma.report.count({ where: { status: "PENDING" } }),
    ]);

  const stats = [
    { label: "ผู้ใช้ทั้งหมด", value: userCount, icon: Users, color: "text-blue-500" },
    { label: "นักเขียน", value: writerCount, icon: Users, color: "text-purple-500" },
    { label: "นิยายทั้งหมด", value: novelCount, icon: BookOpen, color: "text-green-500" },
    { label: "นิยายเผยแพร่", value: publishedNovelCount, icon: BookOpen, color: "text-emerald-500" },
    { label: "ตอนทั้งหมด", value: chapterCount, icon: FileText, color: "text-orange-500" },
    { label: "ความคิดเห็น", value: commentCount, icon: MessageCircle, color: "text-cyan-500" },
    { label: "รายงานทั้งหมด", value: reportCount, icon: Flag, color: "text-red-500" },
    { label: "รายงานรอดำเนินการ", value: pendingReports, icon: AlertTriangle, color: "text-yellow-500" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ภาพรวมระบบ</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
