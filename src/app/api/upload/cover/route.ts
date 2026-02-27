import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadCover } from "@/lib/supabase";

export async function POST(request: Request) {
  const session = await auth();
  if (!session || (session.user.role !== "WRITER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const novelId = formData.get("novelId") as string | null;

  if (!file || !novelId) {
    return NextResponse.json({ error: "Missing file or novelId" }, { status: 400 });
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 2MB)" }, { status: 400 });
  }

  try {
    const url = await uploadCover(file, session.user.id, novelId);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
