import { WriterSidebar } from "@/components/layout/WriterLayout";

export default function WriterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-7xl">
      <WriterSidebar />
      <div className="flex-1 p-4 md:p-6">{children}</div>
    </div>
  );
}
