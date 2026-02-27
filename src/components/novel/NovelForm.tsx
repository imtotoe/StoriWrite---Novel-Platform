"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, X } from "lucide-react";
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
}

export function NovelForm({ novel, genres }: NovelFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    novel?.genres.map((g) => g.id) || []
  );
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(
    novel?.tags.map((t) => t.name) || []
  );
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      synopsis: formData.get("synopsis") as string,
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
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          ยกเลิก
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? "บันทึก" : "สร้างนิยาย"}
        </Button>
      </div>
    </form>
  );
}
