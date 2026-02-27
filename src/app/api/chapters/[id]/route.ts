import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const chapter = await prisma.chapter.findUnique({
    where: { id },
    include: {
      novel: {
        select: { id: true, title: true, slug: true, authorId: true },
      },
    },
  });

  if (!chapter) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Get prev/next chapters
  const [prev, next] = await Promise.all([
    prisma.chapter.findFirst({
      where: { novelId: chapter.novelId, chapterNumber: { lt: chapter.chapterNumber }, isPublished: true },
      orderBy: { chapterNumber: "desc" },
      select: { id: true, title: true, chapterNumber: true },
    }),
    prisma.chapter.findFirst({
      where: { novelId: chapter.novelId, chapterNumber: { gt: chapter.chapterNumber }, isPublished: true },
      orderBy: { chapterNumber: "asc" },
      select: { id: true, title: true, chapterNumber: true },
    }),
  ]);

  return NextResponse.json({ chapter, prev, next });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const chapter = await prisma.chapter.findUnique({
    where: { id },
    include: { novel: { select: { authorId: true } } },
  });

  if (!chapter) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (chapter.novel.authorId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();

  // Recalculate word count if content changed
  if (body.content) {
    body.contentText = extractText(body.content);
    body.wordCount = body.contentText.split(/\s+/).filter(Boolean).length;
  }

  const updated = await prisma.chapter.update({
    where: { id },
    data: body,
  });

  return NextResponse.json({ success: true, chapter: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const chapter = await prisma.chapter.findUnique({
    where: { id },
    include: { novel: { select: { authorId: true } } },
  });

  if (!chapter) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (chapter.novel.authorId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.chapter.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

function extractText(tiptapJson: Record<string, unknown>): string {
  if (!tiptapJson || typeof tiptapJson !== "object") return "";
  let text = "";
  if (tiptapJson.text && typeof tiptapJson.text === "string") text += tiptapJson.text;
  if (Array.isArray(tiptapJson.content)) {
    for (const node of tiptapJson.content) {
      text += extractText(node as Record<string, unknown>) + " ";
    }
  }
  return text.trim();
}
