"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Settings, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface ReaderTopBarProps {
  novelTitle: string;
  chapterNumber: number;
  visible: boolean;
  onOpenSettings?: () => void;
  onExitImmersive?: () => void;
}

export function ReaderTopBar({
  novelTitle,
  chapterNumber,
  visible,
  onOpenSettings,
  onExitImmersive,
}: ReaderTopBarProps) {
  const [scrollPct, setScrollPct] = useState(0);
  const { data: session } = useSession();
  const user = session?.user;

  useEffect(() => {
    function onScroll() {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      setScrollPct(Math.min(100, Math.round((window.scrollY / docHeight) * 100)));
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={cn(
        "fixed top-[3px] left-0 right-0 z-50 transition-all duration-300",
        visible
          ? "translate-y-0 opacity-100"
          : "-translate-y-full opacity-0 pointer-events-none"
      )}
    >
      <div className="bg-background/90 backdrop-blur-sm border-b">
        <div className="mx-auto flex h-12 max-w-3xl items-center px-4 gap-2">
          {/* Logo — links home */}
          <Link href="/" className="flex items-center gap-1.5 text-primary shrink-0">
            <BookOpen className="h-5 w-5" />
            <span className="text-sm font-bold hidden sm:inline">StoriWrite</span>
          </Link>

          {/* Chapter info + scroll % */}
          <div className="flex-1 mx-3 text-center min-w-0">
            <p className="truncate text-xs text-muted-foreground">{novelTitle}</p>
            <p className="truncate text-xs font-medium">
              ตอนที่ {chapterNumber}
              <span className="ml-2 text-[10px] text-muted-foreground tabular-nums">
                {scrollPct}%
              </span>
            </p>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Settings */}
            {onOpenSettings && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onOpenSettings}
                title="ตั้งค่าการอ่าน"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
            {/* Exit immersive */}
            {onExitImmersive && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onExitImmersive}
                title="ออกจากโหมดเต็มจอ"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            )}
            {/* User avatar or login link */}
            {user ? (
              <Link href={`/author/${user.username}`} className="ml-1">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={user.image ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {(user.name ?? user.username ?? "U")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
            ) : (
              <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground px-1">
                เข้าสู่ระบบ
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
