import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chapterSchema } from "@/lib/validations";
import { extractText } from "@/lib/utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const chapters = await prisma.chapter.findMany({
    where: { novelId: id },
    select: {
      id: true,
      title: true,
      chapterNumber: true,
      wordCount: true,
      isPublished: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { chapterNumber: "asc" },
  });

  return NextResponse.json({ chapters });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const novel = await prisma.novel.findUnique({ where: { id } });
  if (!novel) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (novel.authorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const validated = chapterSchema.safeParse(body);
  if (!validated.success) {
    return NextResponse.json(
      { success: false, error: "VALIDATION_ERROR", details: validated.error.flatten() },
      { status: 400 }
    );
  }

  const { title, content, chapterNumber, isDraft, coinPrice } = validated.data;

  // Extract plain text for search and word count
  const contentText = extractText(content);
  const wordCount = contentText.split(/\s+/).filter(Boolean).length;

  const chapter = await prisma.chapter.create({
    data: {
      title,
      content: content as unknown as import("@/generated/prisma/client").Prisma.InputJsonValue,
      contentText,
      chapterNumber,
      wordCount,
      isPublished: !isDraft,
      publishedAt: !isDraft ? new Date() : null,
      novelId: id,
      coinPrice: coinPrice && coinPrice > 0 ? coinPrice : null,
    },
  });

  return NextResponse.json({ success: true, chapter }, { status: 201 });
}

