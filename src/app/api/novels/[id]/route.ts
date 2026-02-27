import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const novel = await prisma.novel.findUnique({ where: { id } });
  if (!novel) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (novel.authorId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { genreIds, tags, ...data } = body;

  const updated = await prisma.novel.update({
    where: { id },
    data: {
      ...data,
      ...(genreIds && {
        genres: {
          deleteMany: {},
          create: genreIds.map((genreId: string) => ({ genreId })),
        },
      }),
    },
    include: {
      genres: { include: { genre: true } },
      tags: { include: { tag: true } },
    },
  });

  return NextResponse.json({ success: true, novel: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const novel = await prisma.novel.findUnique({ where: { id } });
  if (!novel) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (novel.authorId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.novel.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
