import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { ChapterForm } from "@/components/novel/ChapterForm";

export const metadata = { title: "แก้ไข Chapter" };

export default async function EditChapterPage({
  params,
}: {
  params: Promise<{ id: string; cid: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id, cid } = await params;
  const novel = await prisma.novel.findUnique({
    where: { id },
    select: { id: true, title: true, authorId: true },
  });

  if (!novel) notFound();
  if (novel.authorId !== session.user.id && session.user.role !== "ADMIN") {
    redirect("/writer/novels");
  }

  const chapter = await prisma.chapter.findUnique({
    where: { id: cid, novelId: id },
  });

  if (!chapter) notFound();

  const nextChapterNumber = chapter.chapterNumber;

  return (
    <ChapterForm
      novelId={id}
      novelTitle={novel.title}
      chapter={{
        id: chapter.id,
        title: chapter.title,
        content: chapter.content as import("@tiptap/react").JSONContent,
        chapterNumber: chapter.chapterNumber,
        isPublished: chapter.isPublished,
      }}
      nextChapterNumber={nextChapterNumber}
    />
  );
}
