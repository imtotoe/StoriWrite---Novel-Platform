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
  const novel = await prisma.novel.findUnique({ where: { id } });
  if (!novel) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (novel.authorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.novel.update({
    where: { id },
    data: {
      isPublished: !novel.isPublished,
      status: !novel.isPublished ? "ONGOING" : novel.status,
    },
  });

  return NextResponse.json({ success: true, novel: updated });
}
