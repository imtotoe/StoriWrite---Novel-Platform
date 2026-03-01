"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* Branded left panel — desktop only */}
      <div
        className="hidden md:flex md:w-1/2 flex-col items-center justify-center p-12 text-white"
        style={{ background: "radial-gradient(ellipse at bottom left, hsl(35,80%,40%) 0%, hsl(220,60%,25%) 100%)" }}
      >
        <div className="max-w-sm text-center">
          <div className="mb-6 text-6xl">📖</div>
          <h2 className="text-3xl font-bold tracking-tight">StoriWrite</h2>
          <p className="mt-3 text-lg opacity-80">แพลตฟอร์มอ่านและเขียนนิยายออนไลน์</p>
          <blockquote className="mt-8 border-l-2 border-white/40 pl-4 text-left text-sm opacity-70 italic">
            &ldquo;เรื่องราวที่ดีเริ่มต้นจากนักเขียนที่กล้าเล่า&rdquo;
          </blockquote>
          <div className="mt-8 flex flex-col gap-2 text-sm opacity-60">
            <span>✦ นิยายหลากหลายแนว</span>
            <span>✦ อัพเดตทุกวัน</span>
            <span>✦ ฟรีเข้าอ่านได้เลย</span>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}


function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [loading, setLoading] = useState(false);

  const error = searchParams.get("error");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      toast.error(
        result.error === "CredentialsSignin"
          ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง"
          : "เกิดข้อผิดพลาด กรุณาลองใหม่"
      );
      setLoading(false);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  async function handleGoogleSignIn() {
    await signIn("google", { callbackUrl });
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">เข้าสู่ระบบ</CardTitle>
        <CardDescription>เข้าสู่ระบบเพื่ออ่านและเขียนนิยาย</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error === "ACCOUNT_BANNED" && (
          <div className="rounded-md bg-destructive/10 p-3 text-center text-sm text-destructive">
            บัญชีของคุณถูกระงับการใช้งาน
          </div>
        )}

        <Button
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignIn}
          type="button"
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          เข้าสู่ระบบด้วย Google
        </Button>

        <div className="relative">
          <Separator />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
            หรือ
          </span>
        </div>

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
            <Label htmlFor="password">รหัสผ่าน</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="รหัสผ่าน"
              required
              autoComplete="current-password"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            เข้าสู่ระบบ
          </Button>
        </form>
      </CardContent>

      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          ยังไม่มีบัญชี?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            สมัครสมาชิก
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
