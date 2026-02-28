export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  BookOpen,
  Eye,
  Heart,
  Clock,
  ChevronRight,
  BookMarked,
  Lock,
  Coins,
} from "lucide-react";
import { BookmarkButton } from "@/components/community/BookmarkButton";
import { VoteButton } from "@/components/community/VoteButton";
import { CompletionAlertButton } from "@/components/novel/CompletionAlertButton";
import type { Metadata } from "next";

interface NovelPageProps {
  params: Promise<{ slug: string }>;
}

async function getNovel(slug: string) {
  const decodedSlug = decodeURIComponent(slug);
  return prisma.novel.findUnique({
    where: { slug: decodedSlug },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatar: true,
          bio: true,
          _count: { select: { novels: true, followers: true } },
        },
      },
      genres: { include: { genre: true } },
      tags: { include: { tag: true } },
      _count: { select: { votes: true, chapters: true, bookmarks: true } },
      chapters: {
        where: { isPublished: true },
        orderBy: { chapterNumber: "asc" },
        select: {
          id: true,
          title: true,
          chapterNumber: true,
          wordCount: true,
          publishedAt: true,
          coinPrice: true,
        },
      },
    },
  });
}

export async function generateMetadata({ params }: NovelPageProps): Promise<Metadata> {
  const { slug } = await params;
  const novel = await getNovel(slug);
  if (!novel) return { title: "ไม่พบนิยาย" };
  return {
    title: novel.title,
    description: novel.synopsis.slice(0, 160),
  };
}

const statusLabel: Record<string, string> = {
  ONGOING: "กำลังเขียน",
  COMPLETED: "จบแล้ว",
  HIATUS: "พักเขียน",
  DRAFT: "ฉบับร่าง",
};

export default async function NovelDetailPage({ params }: NovelPageProps) {
  const { slug } = await params;
  const [novel, session] = await Promise.all([getNovel(slug), auth()]);

  const isOwner = session?.user?.id === novel?.authorId;
  const isAdmin = session?.user?.role === "ADMIN";

  if (!novel || (!novel.isPublished && !isOwner && !isAdmin)) {
    notFound();
  }
  let isBookmarked = false;
  let hasVoted = false;
  if (session?.user?.id) {
    const [bookmark, vote] = await Promise.all([
      prisma.bookmark.findUnique({
        where: { userId_novelId: { userId: session.user.id, novelId: novel.id } },
      }),
      prisma.vote.findUnique({
        where: { userId_novelId: { userId: session.user.id, novelId: novel.id } },
      }),
    ]);
    isBookmarked = !!bookmark;
    hasVoted = !!vote;
  }

  const totalWords = novel.chapters.reduce((sum, ch) => sum + ch.wordCount, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row">
        {/* Cover */}
        <div className="w-40 shrink-0 self-start sm:w-48">
          <div className="aspect-[2/3] overflow-hidden rounded-lg bg-muted">
            {novel.cover ? (
              <img
                src={novel.cover}
                alt={novel.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <BookOpen className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">{novel.title}</h1>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline">{statusLabel[novel.status]}</Badge>
              {novel.genres.map((g) => (
                <Link key={g.genre.id} href={`/explore?genre=${g.genre.slug}`}>
                  <Badge variant="secondary" className="cursor-pointer">
                    {g.genre.icon} {g.genre.name}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>

          {/* Author */}
          <Link
            href={`/author/${novel.author.username}`}
            className="flex items-center gap-2 hover:underline"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={novel.author.avatar ?? undefined} />
              <AvatarFallback>
                {(novel.author.displayName ?? novel.author.username)[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">
                {novel.author.displayName || novel.author.username}
              </p>
              <p className="text-xs text-muted-foreground">@{novel.author.username}</p>
            </div>
          </Link>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              {novel._count.chapters} ตอน
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {novel.views.toLocaleString()} อ่าน
            </span>
            <span className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              {novel._count.votes} โหวต
            </span>
            <span className="flex items-center gap-1">
              <BookMarked className="h-4 w-4" />
              {novel._count.bookmarks} บุ๊คมาร์ก
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {totalWords.toLocaleString()} คำ
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {novel.chapters.length > 0 && (
              <Button asChild>
                <Link href={`/novel/${novel.slug}/${novel.chapters[0].id}`}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  เริ่มอ่าน
                </Link>
              </Button>
            )}
            <VoteButton
              novelId={novel.id}
              initialVoted={hasVoted}
              initialCount={novel._count.votes}
              isLoggedIn={!!session}
            />
            <BookmarkButton
              novelId={novel.id}
              initialBookmarked={isBookmarked}
              isLoggedIn={!!session}
            />
            {session && novel.status === "ONGOING" && (
              <CompletionAlertButton novelId={novel.id} novelStatus={novel.status} />
            )}
          </div>

          {/* Tags */}
          {novel.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {novel.tags.map((t) => (
                <Badge key={t.tag.id} variant="outline" className="text-xs">
                  #{t.tag.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <Separator className="my-6" />

      {/* Synopsis */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">เรื่องย่อ</h2>
        <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {novel.synopsis}
        </p>
      </section>

      <Separator className="my-6" />

      {/* Chapter List */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">
          สารบัญ ({novel.chapters.length} ตอน)
        </h2>
        {novel.chapters.length > 0 ? (
          <div className="space-y-1">
            {novel.chapters.map((chapter) => (
              <Link
                key={chapter.id}
                href={`/novel/${novel.slug}/${chapter.id}`}
                className="flex items-center justify-between rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-accent"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="shrink-0 text-muted-foreground w-12">
                    ตอนที่ {chapter.chapterNumber}
                  </span>
                  <span className="truncate">{chapter.title}</span>
                  {chapter.coinPrice && chapter.coinPrice > 0 && (
                    <span className="inline-flex items-center gap-0.5 shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-600 dark:text-amber-400">
                      <Coins className="h-3 w-3" />
                      {chapter.coinPrice}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                  <span>{chapter.wordCount.toLocaleString()} คำ · ~{Math.max(1, Math.ceil(chapter.wordCount / 250))} นาที</span>
                  {chapter.publishedAt && (
                    <span>
                      {new Date(chapter.publishedAt).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            ยังไม่มีตอนที่เผยแพร่
          </p>
        )}
      </section>
    </div>
  );
}


