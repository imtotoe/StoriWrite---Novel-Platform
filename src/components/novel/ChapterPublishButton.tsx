"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Globe, GlobeLock } from "lucide-react";
import { toast } from "sonner";

interface ChapterPublishButtonProps {
  chapterId: string;
  isPublished: boolean;
}

export function ChapterPublishButton({ chapterId, isPublished }: ChapterPublishButtonProps) {
  const router = useRouter();

  async function togglePublish() {
    const res = await fetch(`/api/chapters/${chapterId}/publish`, { method: "POST" });
    const result = await res.json();

    if (result.success) {
      toast.success(result.chapter.isPublished ? "เผยแพร่แล้ว" : "เปลี่ยนเป็นฉบับร่าง");
      router.refresh();
    } else {
      toast.error("เกิดข้อผิดพลาด");
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={togglePublish} title={isPublished ? "เปลี่ยนเป็นฉบับร่าง" : "เผยแพร่"}>
      {isPublished ? <GlobeLock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
    </Button>
  );
}
