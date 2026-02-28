"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { Loader2, Save, History, RotateCcw, Clock, Coins } from "lucide-react";
import { toast } from "sonner";
import type { JSONContent } from "@tiptap/react";

interface ChapterVersion {
  id: string;
  wordCount: number;
  savedAt: string;
  label: string | null;
  savedBy: { username: string; displayName: string | null };
}

interface ChapterFormProps {
  novelId: string;
  novelTitle: string;
  chapter?: {
    id: string;
    title: string;
    content: JSONContent;
    chapterNumber: number;
    isPublished: boolean;
    coinPrice?: number | null;
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
  const [wordCount, setWordCount] = useState(0);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [versions, setVersions] = useState<ChapterVersion[]>([]);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const isEditing = !!chapter;
  const dirtyRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const contentRef = useRef<JSONContent | undefined>(content);

  // Keep contentRef in sync
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  const handleContentChange = useCallback((json: JSONContent, words: number) => {
    setContent(json);
    setWordCount(words);
    dirtyRef.current = true;
    setAutoSaveStatus("unsaved");
  }, []);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!isEditing) return;

    autoSaveTimerRef.current = setInterval(async () => {
      if (!dirtyRef.current || !contentRef.current) return;
      dirtyRef.current = false;
      setAutoSaveStatus("saving");

      try {
        // Save version
        await fetch(`/api/chapters/${chapter.id}/versions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: contentRef.current,
            wordCount,
            label: "auto-save",
          }),
        });

        // Update writing session
        await fetch("/api/writer/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            novelId,
            chapterId: chapter.id,
            lastContent: contentRef.current,
            wordCount,
          }),
        });

        setAutoSaveStatus("saved");
      } catch {
        setAutoSaveStatus("unsaved");
      }
    }, 30000);

    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [isEditing, chapter?.id, novelId, wordCount]);

  // Manual save (Ctrl+S)
  useEffect(() => {
    if (!isEditing) return;

    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        manualSave();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isEditing, chapter?.id]);

  async function manualSave() {
    if (!contentRef.current || !chapter) return;
    dirtyRef.current = false;
    setAutoSaveStatus("saving");

    try {
      await fetch(`/api/chapters/${chapter.id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: contentRef.current,
          wordCount,
          label: "manual",
        }),
      });
      setAutoSaveStatus("saved");
      toast.success("บันทึก snapshot แล้ว");
    } catch {
      setAutoSaveStatus("unsaved");
    }
  }

  // Load versions when panel opens
  async function loadVersions() {
    if (!chapter) return;
    const res = await fetch(`/api/chapters/${chapter.id}/versions`);
    const data = await res.json();
    if (data.versions) setVersions(data.versions);
  }

  async function restoreVersion(versionId: string) {
    if (!chapter) return;
    const res = await fetch(`/api/chapters/${chapter.id}/versions/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ versionId }),
    });
    if (res.ok) {
      toast.success("กู้คืนเวอร์ชันแล้ว");
      router.refresh();
      setVersionsOpen(false);
    } else {
      toast.error("เกิดข้อผิดพลาด");
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>, isDraft: boolean) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const chapterNumber = parseInt(formData.get("chapterNumber") as string);
    const coinPriceRaw = formData.get("coinPrice") as string;
    const coinPrice = coinPriceRaw ? parseInt(coinPriceRaw) : 0;

    if (!content || !content.content?.length) {
      toast.error("กรุณาเขียนเนื้อหา");
      setLoading(false);
      return;
    }

    // Save "before-publish" version if publishing
    if (!isDraft && isEditing) {
      await fetch(`/api/chapters/${chapter.id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, wordCount, label: "before-publish" }),
      });
    }

    const data = { title, content, chapterNumber, isDraft, coinPrice };

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
        <div className="flex items-center gap-2">
          {/* Auto-save indicator */}
          {isEditing && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              {autoSaveStatus === "saving" && (
                <><Loader2 className="h-3 w-3 animate-spin" /> กำลังบันทึก...</>
              )}
              {autoSaveStatus === "saved" && (
                <><Clock className="h-3 w-3" /> บันทึกแล้ว</>
              )}
              {autoSaveStatus === "unsaved" && (
                <><Clock className="h-3 w-3 text-yellow-500" /> ยังไม่ได้บันทึก</>
              )}
            </span>
          )}

          {/* Version History */}
          {isEditing && (
            <Sheet open={versionsOpen} onOpenChange={(open) => {
              setVersionsOpen(open);
              if (open) loadVersions();
            }}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <History className="mr-1.5 h-4 w-4" />
                  ประวัติ
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>ประวัติเวอร์ชัน</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-2">
                  {versions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      ยังไม่มีเวอร์ชัน
                    </p>
                  ) : (
                    versions.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {new Date(v.savedAt).toLocaleString("th-TH")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {v.label === "auto-save" && "บันทึกอัตโนมัติ"}
                            {v.label === "manual" && "บันทึกด้วยตนเอง"}
                            {v.label === "before-publish" && "ก่อนเผยแพร่"}
                            {v.label === "before-restore" && "ก่อนกู้คืน"}
                            {" "} — {v.wordCount.toLocaleString()} คำ
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => restoreVersion(v.id)}
                        >
                          <RotateCcw className="mr-1 h-3 w-3" />
                          กู้คืน
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </SheetContent>
            </Sheet>
          )}

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
          <div className="grid gap-4 sm:grid-cols-[1fr_120px_140px]">
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
            <div className="space-y-2">
              <Label htmlFor="coinPrice" className="flex items-center gap-1">
                <Coins className="h-3.5 w-3.5 text-amber-500" />
                ราคา Coin
              </Label>
              <Input
                id="coinPrice"
                name="coinPrice"
                type="number"
                min={0}
                max={100}
                defaultValue={chapter?.coinPrice ?? 0}
                placeholder="0 = ฟรี"
              />
              <p className="text-[11px] text-muted-foreground">0 = อ่านฟรี</p>
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
