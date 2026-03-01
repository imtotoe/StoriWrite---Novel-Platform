"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, X, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Genre {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

interface NovelFormProps {
  novel?: {
    id: string;
    title: string;
    synopsis: string;
    cover: string | null;
    status: string;
    genres: Genre[];
    tags: { id: string; name: string }[];
  };
  genres: Genre[];
  userId: string;
}

export function NovelForm({ novel, genres, userId }: NovelFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    novel?.genres.map((g) => g.id) || []
  );
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(
    novel?.tags.map((t) => t.name) || []
  );
  const [coverUrl, setCoverUrl] = useState<string | null>(novel?.cover || null);
  const [coverPreview, setCoverPreview] = useState<string | null>(novel?.cover || null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const isEditing = !!novel;

  const toggleGenre = (id: string) => {
    setSelectedGenres((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag) && tags.length < 10) {
      setTags([...tags, tag]);
      setTagInput("");
    }
  };

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("รองรับเฉพาะไฟล์ JPG, PNG, WEBP");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("ไฟล์ใหญ่เกินไป (สูงสุด 2MB)");
      return;
    }

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setCoverPreview(localUrl);

    // Upload via API route (uses service role key, bypasses RLS)
    setUploadingCover(true);
    try {
      const novelId = novel?.id || "temp-" + Date.now();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("novelId", novelId);
      const res = await fetch("/api/upload/cover", { method: "POST", body: formData });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");
      setCoverUrl(result.url);
      toast.success("อัพโหลดปกสำเร็จ");
    } catch {
      toast.error("อัพโหลดปกล้มเหลว");
      setCoverPreview(coverUrl);
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      synopsis: formData.get("synopsis") as string,
      cover: coverUrl,
      status: "DRAFT" as const,
      genreIds: selectedGenres,
      tags,
      language: "th",
    };

    if (selectedGenres.length === 0) {
      toast.error("กรุณาเลือกอย่างน้อย 1 แนว");
      setLoading(false);
      return;
    }

    const url = isEditing ? `/api/novels/${novel.id}` : "/api/novels";
    const method = isEditing ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (!result.success) {
      toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่");
      setLoading(false);
      return;
    }

    // If cover was uploaded with temp ID, re-upload with real novel ID
    if (!isEditing && coverUrl && coverUrl.includes("temp-")) {
      // The cover is already uploaded, we just update the novel with the URL
      // For new novels, we could re-upload with proper path, but the URL already works
    }

    toast.success(isEditing ? "อัพเดตนิยายสำเร็จ" : "สร้างนิยายสำเร็จ");
    router.push(`/writer/novel/${result.novel.id}/chapters`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "แก้ไขนิยาย" : "สร้างนิยายใหม่"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">ชื่อนิยาย</Label>
            <Input
              id="title"
              name="title"
              placeholder="ใส่ชื่อนิยาย"
              defaultValue={novel?.title}
              required
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="synopsis">เรื่องย่อ</Label>
            <Textarea
              id="synopsis"
              name="synopsis"
              placeholder="เขียนเรื่องย่อของนิยาย (อย่างน้อย 20 ตัวอักษร)"
              defaultValue={novel?.synopsis}
              required
              minLength={20}
              maxLength={2000}
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label>แนวนิยาย (เลือก 1-3 แนว)</Label>
            <div className="flex flex-wrap gap-2">
              {genres.map((genre) => (
                <button
                  key={genre.id}
                  type="button"
                  onClick={() => toggleGenre(genre.id)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm transition-colors",
                    selectedGenres.includes(genre.id)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  )}
                >
                  {genre.icon} {genre.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>แท็ก (สูงสุด 10)</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="พิมพ์แท็กแล้ว Enter"
                maxLength={30}
              />
              <Button type="button" variant="outline" onClick={addTag}>
                เพิ่ม
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button type="button" onClick={() => setTags(tags.filter((t) => t !== tag))}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Cover Image */}
          <div className="space-y-2">
            <Label>ปกนิยาย</Label>
            <div className="flex items-start gap-4">
              <label
                className={cn(
                  "relative flex h-48 w-32 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors hover:border-primary",
                  uploadingCover && "pointer-events-none opacity-60"
                )}
              >
                {coverPreview ? (
                  <Image
                    src={coverPreview}
                    alt="ปกนิยาย"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <ImagePlus className="h-8 w-8" />
                    <span className="text-xs">เลือกรูป</span>
                  </div>
                )}
                {uploadingCover && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleCoverChange}
                />
              </label>
              <div className="text-xs text-muted-foreground">
                <p>รองรับ JPG, PNG, WEBP</p>
                <p>ขนาดไม่เกิน 2MB</p>
                <p>แนะนำ 2:3 (เช่น 400x600)</p>
                {coverPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => {
                      setCoverUrl(null);
                      setCoverPreview(null);
                    }}
                  >
                    <X className="mr-1 h-3 w-3" />
                    ลบรูปปก
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          ยกเลิก
        </Button>
        <Button type="submit" disabled={loading || uploadingCover}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "บันทึก" : "สร้างนิยาย"}
        </Button>
      </div>
    </form>
  );
}
