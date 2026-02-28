import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Edit, Eye, EyeOff, Coins } from "lucide-react";
import { ChapterPublishButton } from "@/components/novel/ChapterPublishButton";
import { NovelPublishButton } from "@/components/novel/NovelPublishButton";

export const metadata = { title: "จัดการ Chapter" };

export default async function ChaptersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const novel = await prisma.novel.findUnique({
    where: { id },
    include: {
      chapters: {
        orderBy: { chapterNumber: "asc" },
      },
    },
  });

  if (!novel) notFound();
  if (novel.authorId !== session.user.id && session.user.role !== "ADMIN") {
    redirect("/writer/novels");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{novel.title}</h1>
          <p className="text-sm text-muted-foreground">
            {novel.chapters.length} chapter{novel.chapters.length !== 1 && "s"}
          </p>
        </div>
        <div className="flex gap-2">
          <NovelPublishButton novelId={id} isPublished={novel.isPublished} />
          <Button variant="outline" size="sm" asChild>
            <Link href={`/writer/novel/${id}/edit`}>
              <Edit className="mr-1.5 h-4 w-4" />
              แก้ไขนิยาย
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={`/writer/novel/${id}/chapter/new`}>
              <PlusCircle className="mr-1.5 h-4 w-4" />
              เขียน Chapter ใหม่
            </Link>
          </Button>
        </div>
      </div>

      {novel.chapters.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">ยังไม่มี Chapter</p>
            <Button className="mt-4" asChild>
              <Link href={`/writer/novel/${id}/chapter/new`}>
                <PlusCircle className="mr-1.5 h-4 w-4" />
                เขียน Chapter แรก
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {novel.chapters.map((chapter) => (
            <Card key={chapter.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-medium">
                    {chapter.chapterNumber}
                  </span>
                  <div>
                    <Link
                      href={`/writer/novel/${id}/chapter/${chapter.id}/edit`}
                      className="font-medium hover:underline"
                    >
                      {chapter.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {chapter.wordCount.toLocaleString()} คำ
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {chapter.coinPrice && chapter.coinPrice > 0 && (
                    <Badge variant="outline" className="gap-1 border-amber-500/30 text-amber-600 dark:text-amber-400">
                      <Coins className="h-3 w-3" />
                      {chapter.coinPrice}
                    </Badge>
                  )}
                  <Badge variant={chapter.isPublished ? "default" : "secondary"}>
                    {chapter.isPublished ? (
                      <><Eye className="mr-1 h-3 w-3" /> เผยแพร่</>
                    ) : (
                      <><EyeOff className="mr-1 h-3 w-3" /> ฉบับร่าง</>
                    )}
                  </Badge>
                  <ChapterPublishButton
                    chapterId={chapter.id}
                    isPublished={chapter.isPublished}
                  />
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/writer/novel/${id}/chapter/${chapter.id}/edit`}>
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
