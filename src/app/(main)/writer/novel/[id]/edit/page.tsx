import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { NovelForm } from "@/components/novel/NovelForm";

export const metadata = { title: "แก้ไขนิยาย" };

export default async function EditNovelPage({
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
      genres: { include: { genre: true } },
      tags: { include: { tag: true } },
    },
  });

  if (!novel) notFound();
  if (novel.authorId !== session.user.id && session.user.role !== "ADMIN") {
    redirect("/writer/novels");
  }

  const genres = await prisma.genre.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-2xl">
      <NovelForm
        genres={genres}
        novel={{
          id: novel.id,
          title: novel.title,
          synopsis: novel.synopsis,
          cover: novel.cover,
          status: novel.status,
          genres: novel.genres.map((g) => g.genre),
          tags: novel.tags.map((t) => t.tag),
        }}
      />
    </div>
  );
}
