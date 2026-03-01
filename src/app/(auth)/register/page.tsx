"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, BookOpen, PenTool } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Role = "READER" | "WRITER";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<Role>("READER");
  const [acceptTerms, setAcceptTerms] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      email: formData.get("email") as string,
      username: formData.get("username") as string,
      password: formData.get("password") as string,
      displayName: (formData.get("displayName") as string) || undefined,
      role,
      acceptTerms,
    };

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (!result.success) {
      const messages: Record<string, string> = {
        EMAIL_EXISTS: "อีเมลนี้ถูกใช้งานแล้ว",
        USERNAME_EXISTS: "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว",
        VALIDATION_ERROR: "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง",
      };
      toast.error(messages[result.error] || "เกิดข้อผิดพลาด กรุณาลองใหม่");
      setLoading(false);
      return;
    }

    // Auto sign in after register
    const signInResult = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (signInResult?.ok) {
      toast.success("สมัครสมาชิกสำเร็จ!");
      router.push("/");
      router.refresh();
    } else {
      router.push("/login");
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Branded left panel — desktop only */}
      <div
        className="hidden md:flex md:w-2/5 flex-col items-center justify-center p-12 text-white"
        style={{
          background:
            "radial-gradient(ellipse at bottom left, hsl(35,80%,40%) 0%, hsl(220,60%,25%) 100%)",
        }}
      >
        <div className="max-w-sm text-center">
          <div className="mb-6 text-6xl">✍️</div>
          <h2 className="text-3xl font-bold tracking-tight">เข้าร่วม StoriWrite</h2>
          <p className="mt-3 text-lg opacity-80">สร้างบัญชีและเริ่มต้นการผจญภัย</p>
          <div className="mt-8 flex flex-col gap-3 text-sm">
            <div className="flex items-center gap-3 rounded-lg bg-white/10 px-4 py-3 text-left">
              <BookOpen className="h-5 w-5 shrink-0 opacity-80" />
              <span className="opacity-90">เป็นผู้อ่าน — เข้าถึงนิยายหลากหลายแนว</span>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-white/10 px-4 py-3 text-left">
              <PenTool className="h-5 w-5 shrink-0 opacity-80" />
              <span className="opacity-90">เป็นนักเขียน — เผยแพร่ผลงานของคุณ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center overflow-y-auto p-6">
        <div className="w-full max-w-sm py-6">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">สมัครสมาชิก</CardTitle>
              <CardDescription>สร้างบัญชีเพื่อเริ่มต้นใช้งาน StoriWrite</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Role selection */}
              <div className="space-y-2">
                <Label>ฉันต้องการ</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("READER")}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-colors",
                      role === "READER"
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-muted-foreground/25"
                    )}
                  >
                    <BookOpen
                      className={cn(
                        "h-6 w-6",
                        role === "READER" ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <span className="text-sm font-medium">อ่านนิยาย</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("WRITER")}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-colors",
                      role === "WRITER"
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-muted-foreground/25"
                    )}
                  >
                    <PenTool
                      className={cn(
                        "h-6 w-6",
                        role === "WRITER" ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <span className="text-sm font-medium">เขียนนิยาย</span>
                  </button>
                </div>
              </div>

              <Separator />

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">อีเมล</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">ชื่อผู้ใช้</Label>
                  <Input
                    id="username"
                    name="username"
                    placeholder="username"
                    required
                    minLength={3}
                    maxLength={20}
                    pattern="^[a-zA-Z0-9_]+$"
                    autoComplete="username"
                  />
                  <p className="text-xs text-muted-foreground">3-20 ตัวอักษร (a-z, 0-9, _)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">ชื่อที่แสดง (ไม่บังคับ)</Label>
                  <Input
                    id="displayName"
                    name="displayName"
                    placeholder="ชื่อที่แสดง"
                    maxLength={50}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">รหัสผ่าน</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="อย่างน้อย 8 ตัวอักษร"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="acceptTerms"
                    checked={acceptTerms}
                    onCheckedChange={(checked) => setAcceptTerms(checked === true)}
                  />
                  <label htmlFor="acceptTerms" className="text-sm leading-snug">
                    ฉันยอมรับ{" "}
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      เงื่อนไขการใช้งาน
                    </a>{" "}
                    และ{" "}
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      นโยบายความเป็นส่วนตัว
                    </a>
                  </label>
                </div>

                <Button type="submit" className="w-full" disabled={loading || !acceptTerms}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  สมัครสมาชิก
                </Button>
              </form>
            </CardContent>

            <CardFooter className="justify-center">
              <p className="text-sm text-muted-foreground">
                มีบัญชีอยู่แล้ว?{" "}
                <Link href="/login" className="font-medium text-primary hover:underline">
                  เข้าสู่ระบบ
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
