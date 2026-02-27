import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { novelSchema } from "@/lib/validations";
import slugify from "slugify";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const genre = searchParams.get("genre");
  const status = searchParams.get("status");
  const sort = searchParams.get("sort") || "latest";
  const search = searchParams.get("search");
  const authorId = searchParams.get("authorId");

  const where: Record<string, unknown> = { isPublished: true };

  if (genre) where.genres = { some: { genre: { slug: genre } } };
  if (status) where.status = status;
  if (authorId) where.authorId = authorId;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { synopsis: { contains: search, mode: "insensitive" } },
    ];
  }

  const orderBy =
    sort === "popular" ? { views: "desc" as const } :
    sort === "top_voted" ? { votes: { _count: "desc" as const } } :
    { createdAt: "desc" as const };

  const [novels, total] = await Promise.all([
    prisma.novel.findMany({
      where,
      include: {
        author: { select: { id: true, username: true, displayName: true, avatar: true } },
        genres: { include: { genre: true } },
        tags: { include: { tag: true } },
        _count: { select: { votes: true, chapters: true } },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.novel.count({ where }),
  ]);

  return NextResponse.json({
    novels: novels.map((n) => ({
      ...n,
      genres: n.genres.map((g) => g.genre),
      tags: n.tags.map((t) => t.tag),
      voteCount: n._count.votes,
      chapterCount: n._count.chapters,
    })),
    total,
    pages: Math.ceil(total / limit),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session || (session.user.role !== "WRITER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const validated = novelSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      { success: false, error: "VALIDATION_ERROR", details: validated.error.flatten() },
      { status: 400 }
    );
  }

  const { title, synopsis, status, genreIds, tags, language } = validated.data;

  let slug = slugify(title, { lower: true, strict: true });
  const existingSlug = await prisma.novel.findUnique({ where: { slug } });
  if (existingSlug) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const novel = await prisma.novel.create({
    data: {
      title,
      slug,
      synopsis,
      status,
      language,
      authorId: session.user.id,
      cover: body.cover || null,
      genres: {
        create: genreIds.map((genreId: string) => ({ genreId })),
      },
      tags: {
        create: await Promise.all(
          tags.map(async (tagName: string) => {
            const tagSlug = slugify(tagName, { lower: true, strict: true });
            const tag = await prisma.tag.upsert({
              where: { slug: tagSlug },
              update: {},
              create: { name: tagName, slug: tagSlug },
            });
            return { tagId: tag.id };
          })
        ),
      },
    },
    include: {
      genres: { include: { genre: true } },
      tags: { include: { tag: true } },
    },
  });

  return NextResponse.json({ success: true, novel }, { status: 201 });
}
