import Link from "next/link";
import { BookOpen } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2 text-xl font-bold">
        <BookOpen className="h-6 w-6" />
        NovelSpace
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
