import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { NovelForm } from "@/components/novel/NovelForm";

export const metadata = { title: "สร้างนิยายใหม่" };

export default async function NewNovelPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const genres = await prisma.genre.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-2xl">
      <NovelForm genres={genres} />
    </div>
  );
}
