export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NovelCard } from "@/components/novel/NovelCard";
import { ArrowRight, BookOpen, PenTool, TrendingUp, Sparkles, Clock } from "lucide-react";
import { ReadingResumeBanner } from "@/components/reader/ReadingResumeBanner";

async function getFeaturedNovels() {
  return prisma.novel.findMany({
    where: { isPublished: true, isFeatured: true },
    include: {
      author: { select: { id: true, username: true, displayName: true, avatar: true } },
      genres: { include: { genre: true } },
      tags: { include: { tag: true } },
      _count: { select: { votes: true, chapters: true } },
    },
    orderBy: { views: "desc" },
    take: 6,
  });
}

async function getPopularNovels() {
  return prisma.novel.findMany({
    where: { isPublished: true },
    include: {
      author: { select: { id: true, username: true, displayName: true, avatar: true } },
      genres: { include: { genre: true } },
      tags: { include: { tag: true } },
      _count: { select: { votes: true, chapters: true } },
    },
    orderBy: { views: "desc" },
    take: 8,
  });
}

async function getLatestNovels() {
  return prisma.novel.findMany({
    where: { isPublished: true },
    include: {
      author: { select: { id: true, username: true, displayName: true, avatar: true } },
      genres: { include: { genre: true } },
      tags: { include: { tag: true } },
      _count: { select: { votes: true, chapters: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 8,
  });
}

async function getRecentlyUpdatedWithChapters() {
  return prisma.novel.findMany({
    where: {
      isPublished: true,
      chapters: { some: { isPublished: true } },
    },
    include: {
      author: { select: { id: true, username: true, displayName: true, avatar: true } },
      genres: { include: { genre: true } },
      tags: { include: { tag: true } },
      _count: { select: { votes: true, chapters: true } },
      chapters: {
        where: { isPublished: true },
        orderBy: { publishedAt: "desc" },
        take: 1,
        select: { id: true, title: true, chapterNumber: true, publishedAt: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });
}

async function getGenres() {
  return prisma.genre.findMany({ orderBy: { name: "asc" } });
}

function mapNovel(n: Awaited<ReturnType<typeof getPopularNovels>>[number]) {
  return {
    ...n,
    genres: n.genres.map((g) => g.genre),
    tags: n.tags.map((t) => t.tag),
    voteCount: n._count.votes,
    chapterCount: n._count.chapters,
  };
}

export default async function HomePage() {
  const [featured, popular, latest, recentUpdates, genres] = await Promise.all([
    getFeaturedNovels(),
    getPopularNovels(),
    getLatestNovels(),
    getRecentlyUpdatedWithChapters(),
    getGenres(),
  ]);

  const hasContent = popular.length > 0 || latest.length > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl px-6 py-12 md:px-12 md:py-16" style={{ background: "radial-gradient(ellipse at 0% 100%, hsl(35,80%,55%,0.18) 0%, transparent 60%), radial-gradient(ellipse at 100% 0%, hsl(220,70%,60%,0.12) 0%, transparent 60%), hsl(var(--muted))" }}>
        {/* Decorative book emoji */}
        <div className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 select-none text-[120px] opacity-10 md:right-12 md:text-[180px]" aria-hidden="true">
          📖
        </div>
        <div className="relative max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
            ค้นพบโลกแห่งนิยาย
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            อ่านและเขียนนิยายออนไลน์ หลากหลายแนว จากนักเขียนทั่วประเทศ
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/explore">
                <BookOpen className="mr-2 h-4 w-4" />
                เริ่มอ่านเลย
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/register">
                <PenTool className="mr-2 h-4 w-4" />
                เริ่มเขียน
              </Link>
            </Button>
          </div>
          {/* Social proof stats */}
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
              นิยายหลากหลายแนว
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
              อัพเดตทุกวัน
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
              ฟรีเข้าอ่านได้เลย
            </span>
          </div>
        </div>
      </section>


      {/* Reading Resume */}
      <ReadingResumeBanner />

      {/* Genre Quick Links */}
      {genres.length > 0 && (
        <section>
          <div className="flex flex-wrap gap-2">
            {genres.map((genre) => (
              <Link key={genre.id} href={`/explore?genre=${genre.slug}`}>
                <Badge
                  variant="outline"
                  className="cursor-pointer px-3 py-1.5 text-sm transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  {genre.icon} {genre.name}
                </Badge>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured */}
      {featured.length > 0 && (
        <section>
          <SectionHeader
            icon={<Sparkles className="h-5 w-5 text-yellow-500" />}
            title="แนะนำ"
            href="/explore?sort=popular"
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {featured.map((novel) => (
              <NovelCard key={novel.id} novel={mapNovel(novel)} />
            ))}
          </div>
        </section>
      )}

      {/* Popular */}
      {popular.length > 0 && (
        <section>
          <SectionHeader
            icon={<TrendingUp className="h-5 w-5 text-red-500" />}
            title="ยอดนิยม"
            href="/explore?sort=popular"
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {popular.map((novel) => (
              <NovelCard key={novel.id} novel={mapNovel(novel)} />
            ))}
          </div>
        </section>
      )}

      {/* Recently Updated */}
      {recentUpdates.length > 0 && (
        <section>
          <SectionHeader
            icon={<Clock className="h-5 w-5 text-blue-500" />}
            title="อัพเดตล่าสุด"
            href="/explore?sort=latest"
          />
          <div className="space-y-2">
            {recentUpdates.map((novel) => {
              const latestChapter = novel.chapters[0];
              return (
                <div
                  key={novel.id}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Link
                      href={`/novel/${novel.slug}`}
                      className="h-12 w-9 shrink-0 overflow-hidden rounded bg-muted block"
                    >
                      {novel.cover ? (
                        <img
                          src={novel.cover}
                          alt={novel.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </Link>
                    <div className="min-w-0">
                      <Link
                        href={`/novel/${novel.slug}`}
                        className="block truncate text-sm font-medium hover:text-primary"
                      >
                        {novel.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {novel.author.displayName || novel.author.username}
                      </p>
                    </div>
                  </div>
                  {latestChapter && (
                    <Link
                      href={`/novel/${novel.slug}/${latestChapter.id}`}
                      className="shrink-0 text-xs text-muted-foreground hover:text-primary ml-4"
                    >
                      ตอนที่ {latestChapter.chapterNumber}: {latestChapter.title}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Latest */}
      {latest.length > 0 && (
        <section>
          <SectionHeader
            icon={<BookOpen className="h-5 w-5 text-green-500" />}
            title="นิยายใหม่"
            href="/explore?sort=latest"
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {latest.map((novel) => (
              <NovelCard key={novel.id} novel={mapNovel(novel)} />
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {!hasContent && (
        <section className="py-16 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">ยังไม่มีนิยาย</h2>
          <p className="mt-2 text-muted-foreground">
            เป็นคนแรกที่เขียนนิยายบน StoriWrite!
          </p>
          <Button className="mt-6" asChild>
            <Link href="/register">เริ่มเขียนนิยาย</Link>
          </Button>
        </section>
      )}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  href: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-xl font-bold">
        {icon}
        {title}
      </h2>
      <Button variant="ghost" size="sm" asChild>
        <Link href={href}>
          ดูทั้งหมด
          <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}
