import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { ChapterForm } from "@/components/novel/ChapterForm";

export const metadata = { title: "เขียน Chapter ใหม่" };

export default async function NewChapterPage({
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
        orderBy: { chapterNumber: "desc" },
        take: 1,
        select: { chapterNumber: true },
      },
    },
  });

  if (!novel) notFound();
  if (novel.authorId !== session.user.id && session.user.role !== "ADMIN") {
    redirect("/writer/novels");
  }

  const nextChapterNumber = (novel.chapters[0]?.chapterNumber ?? 0) + 1;

  return (
    <ChapterForm
      novelId={id}
      novelTitle={novel.title}
      nextChapterNumber={nextChapterNumber}
    />
  );
}
