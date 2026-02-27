"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import type { JSONContent } from "@tiptap/react";

interface ChapterFormProps {
  novelId: string;
  novelTitle: string;
  chapter?: {
    id: string;
    title: string;
    content: JSONContent;
    chapterNumber: number;
    isPublished: boolean;
  };
  nextChapterNumber: number;
}

export function ChapterForm({
  novelId,
  novelTitle,
  chapter,
  nextChapterNumber,
}: ChapterFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<JSONContent | undefined>(chapter?.content);
  const isEditing = !!chapter;

  const handleContentChange = useCallback((json: JSONContent) => {
    setContent(json);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>, isDraft: boolean) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const chapterNumber = parseInt(formData.get("chapterNumber") as string);

    if (!content || !content.content?.length) {
      toast.error("กรุณาเขียนเนื้อหา");
      setLoading(false);
      return;
    }

    const data = { title, content, chapterNumber, isDraft };

    const url = isEditing
      ? `/api/chapters/${chapter.id}`
      : `/api/novels/${novelId}/chapters`;
    const method = isEditing ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (result.success) {
      toast.success(isDraft ? "บันทึกฉบับร่างแล้ว" : "เผยแพร่แล้ว");
      router.push(`/writer/novel/${novelId}/chapters`);
      router.refresh();
    } else {
      toast.error(result.details?.fieldErrors?.chapterNumber?.[0] || "เกิดข้อผิดพลาด");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
      }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{novelTitle}</p>
          <h1 className="text-2xl font-bold">
            {isEditing ? "แก้ไข Chapter" : "เขียน Chapter ใหม่"}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={(e) => {
              const form = (e.target as HTMLElement).closest("form")!.parentElement!.querySelector("form")!;
              handleSubmit(
                { preventDefault: () => {}, currentTarget: form } as unknown as React.FormEvent<HTMLFormElement>,
                true
              );
            }}
          >
            <Save className="mr-1.5 h-4 w-4" />
            บันทึกร่าง
          </Button>
          <Button
            type="button"
            disabled={loading}
            onClick={(e) => {
              const form = (e.target as HTMLElement).closest("form")!.parentElement!.querySelector("form")!;
              handleSubmit(
                { preventDefault: () => {}, currentTarget: form } as unknown as React.FormEvent<HTMLFormElement>,
                false
              );
            }}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            เผยแพร่
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <div className="space-y-2">
              <Label htmlFor="title">ชื่อ Chapter</Label>
              <Input
                id="title"
                name="title"
                placeholder="ชื่อ Chapter"
                defaultValue={chapter?.title}
                required
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chapterNumber">ลำดับที่</Label>
              <Input
                id="chapterNumber"
                name="chapterNumber"
                type="number"
                min={1}
                defaultValue={chapter?.chapterNumber || nextChapterNumber}
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <TiptapEditor
        content={content}
        onChange={handleContentChange}
        placeholder="เริ่มเขียนเนื้อหา Chapter..."
      />
    </form>
  );
}
