import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
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
  if (chapter.novel.authorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.chapter.update({
    where: { id },
    data: {
      isPublished: !chapter.isPublished,
      publishedAt: !chapter.isPublished ? new Date() : null,
    },
  });

  return NextResponse.json({ success: true, chapter: updated });
}
