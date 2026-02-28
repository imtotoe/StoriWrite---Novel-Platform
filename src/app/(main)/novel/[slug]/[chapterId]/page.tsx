import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ChapterReader } from "@/components/reader/ChapterReader";
import { ChapterLockedView } from "@/components/coin/ChapterLockedView";
import type { Metadata } from "next";

interface ChapterPageProps {
  params: Promise<{ slug: string; chapterId: string }>;
}

async function getChapterData(
  slug: string,
  chapterId: string,
  viewerUserId?: string,
  viewerRole?: string
) {
  const decodedSlug = decodeURIComponent(slug);
  const novel = await prisma.novel.findUnique({
    where: { slug: decodedSlug },
    select: {
      id: true,
      title: true,
      slug: true,
      isPublished: true,
      authorId: true,
      chapters: {
        orderBy: { chapterNumber: "asc" },
        select: { id: true, title: true, chapterNumber: true, isPublished: true },
      },
    },
  });

  if (!novel) return null;

  const isOwner = viewerUserId === novel.authorId;
  const isAdmin = viewerRole === "ADMIN";
  const canViewUnpublished = isOwner || isAdmin;

  // Block non-owners from unpublished novels
  if (!novel.isPublished && !canViewUnpublished) return null;

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: {
      id: true,
      title: true,
      chapterNumber: true,
      content: true,
      wordCount: true,
      publishedAt: true,
      isPublished: true,
      novelId: true,
      coinPrice: true,
    },
  });

  if (!chapter || chapter.novelId !== novel.id) return null;
  // Block non-owners from unpublished chapters
  if (!chapter.isPublished && !canViewUnpublished) return null;

  // Check if chapter is locked (coin-gated) and if user has unlocked it
  let isLocked = false;
  let isUnlocked = false;
  let userBalance = 0;

  if (chapter.coinPrice && chapter.coinPrice > 0 && viewerUserId) {
    // Owner and admin can always read
    if (!isOwner && !isAdmin) {
      const unlock = await prisma.coinSpend.findUnique({
        where: { userId_chapterId: { userId: viewerUserId, chapterId } },
      });
      isUnlocked = !!unlock;
      isLocked = !isUnlocked;

      if (isLocked) {
        const user = await prisma.user.findUnique({
          where: { id: viewerUserId },
          select: { coinBalance: true },
        });
        userBalance = user?.coinBalance ?? 0;
      }
    }
  } else if (chapter.coinPrice && chapter.coinPrice > 0 && !viewerUserId) {
    // Not logged in — chapter is locked
    isLocked = true;
  }

  // Filter visible chapters for navigation
  const visibleChapters = canViewUnpublished
    ? novel.chapters
    : novel.chapters.filter((c) => c.isPublished);

  const chapterIndex = visibleChapters.findIndex((c) => c.id === chapterId);
  const prevChapter = chapterIndex > 0 ? visibleChapters[chapterIndex - 1] : null;
  const nextChapter =
    chapterIndex < visibleChapters.length - 1 ? visibleChapters[chapterIndex + 1] : null;

  return {
    novel,
    chapter,
    prevChapter,
    nextChapter,
    canViewUnpublished,
    isLocked,
    isUnlocked,
    userBalance,
  };
}

export async function generateMetadata({ params }: ChapterPageProps): Promise<Metadata> {
  const { slug, chapterId } = await params;
  const data = await getChapterData(slug, chapterId);
  if (!data) return { title: "ไม่พบตอน" };
  return {
    title: `ตอนที่ ${data.chapter.chapterNumber}: ${data.chapter.title} — ${data.novel.title}`,
  };
}

export default async function ChapterPage({ params }: ChapterPageProps) {
  const { slug, chapterId } = await params;
  const session = await auth();
  const data = await getChapterData(
    slug,
    chapterId,
    session?.user?.id,
    session?.user?.role
  );
  if (!data) notFound();

  // If chapter is locked, show locked view instead of content
  if (data.isLocked) {
    return (
      <ChapterLockedView
        chapterId={data.chapter.id}
        chapterTitle={data.chapter.title}
        chapterNumber={data.chapter.chapterNumber}
        coinPrice={data.chapter.coinPrice!}
        novelSlug={data.novel.slug}
        novelTitle={data.novel.title}
        userBalance={data.userBalance}
        isLoggedIn={!!session}
      />
    );
  }

  // Increment view count only for published content (fire-and-forget)
  if (data.novel.isPublished && data.chapter.isPublished) {
    prisma.novel
      .update({ where: { id: data.novel.id }, data: { views: { increment: 1 } } })
      .catch(console.error);
  }

  return (
    <>
      {/* Preview banner for owner viewing unpublished content */}
      {data.canViewUnpublished &&
        (!data.novel.isPublished || !data.chapter.isPublished) && (
          <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-2 text-center text-sm text-yellow-700 dark:text-yellow-400">
            ⚠️ ตัวอย่างก่อนเผยแพร่ — ผู้อ่านจะไม่เห็นเนื้อหานี้จนกว่าจะกด &ldquo;เผยแพร่&rdquo;
          </div>
        )}
      <ChapterReader
        chapter={{
          ...data.chapter,
          content: data.chapter.content as Record<string, unknown>,
          publishedAt: data.chapter.publishedAt?.toISOString() ?? null,
        }}
        novelSlug={data.novel.slug}
        novelTitle={data.novel.title}
        prevChapter={data.prevChapter}
        nextChapter={data.nextChapter}
      />
    </>
  );
}
