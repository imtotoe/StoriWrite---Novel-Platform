import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PlusCircle, Edit, BookOpen, Eye, EyeOff } from "lucide-react";

export const metadata = { title: "นิยายของฉัน" };

export default async function WriterNovelsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const novels = await prisma.novel.findMany({
    where: { authorId: session.user.id },
    include: {
      _count: { select: { chapters: true, votes: true } },
      genres: { include: { genre: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">นิยายของฉัน</h1>
          <p className="text-sm text-muted-foreground">
            {novels.length} เรื่อง
          </p>
        </div>
        <Button asChild>
          <Link href="/writer/novel/new">
            <PlusCircle className="mr-1.5 h-4 w-4" />
            สร้างนิยายใหม่
          </Link>
        </Button>
      </div>

      {novels.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">ยังไม่มีนิยาย</p>
            <Button className="mt-4" asChild>
              <Link href="/writer/novel/new">
                <PlusCircle className="mr-1.5 h-4 w-4" />
                สร้างนิยายเรื่องแรก
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {novels.map((novel) => (
            <Card key={novel.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/writer/novel/${novel.id}/chapters`}
                      className="truncate font-medium hover:underline"
                    >
                      {novel.title}
                    </Link>
                    <Badge variant={novel.isPublished ? "default" : "secondary"} className="shrink-0">
                      {novel.isPublished ? (
                        <><Eye className="mr-1 h-3 w-3" /> เผยแพร่</>
                      ) : (
                        <><EyeOff className="mr-1 h-3 w-3" /> ฉบับร่าง</>
                      )}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{novel._count.chapters} chapters</span>
                    <span>{novel.views.toLocaleString()} views</span>
                    <span>{novel._count.votes} votes</span>
                    {novel.genres.length > 0 && (
                      <span>
                        {novel.genres.map((g) => g.genre.name).join(", ")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/writer/novel/${novel.id}/chapters`}>
                      <BookOpen className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/writer/novel/${novel.id}/edit`}>
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
