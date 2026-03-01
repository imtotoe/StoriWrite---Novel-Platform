"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, List, Maximize2 } from "lucide-react";
import { toast } from "sonner";
import { ChapterContent } from "./ChapterContent";
import { ReaderSettings, ReaderSettingsHandle } from "./ReaderSettings";
import { CommentSection } from "@/components/community/CommentSection";
import { ReadingProgress } from "./ReadingProgress";
import { ProgressBar } from "./ProgressBar";
import { ReaderTopBar } from "./ReaderTopBar";
import { ChapterListSheet } from "./ChapterListSheet";
import { MobileReaderSheet } from "./MobileReaderSheet";
import { Separator } from "@/components/ui/separator";
import { useReaderSettings } from "@/lib/useReaderSettings";
import { cn } from "@/lib/utils";
import type { JSONContent } from "@tiptap/react";
import type { ReadingTheme } from "@/lib/useReaderSettings";

interface ChapterData {
  id: string;
  title: string;
  chapterNumber: number;
  content: JSONContent;
  wordCount: number;
  publishedAt: string | null;
}

interface ChapterNav {
  id: string;
  title: string;
  chapterNumber: number;
  coinPrice?: number | null;
}

interface ChapterReaderProps {
  chapter: ChapterData;
  novelSlug: string;
  novelTitle: string;
  prevChapter: ChapterNav | null;
  nextChapter: ChapterNav | null;
  allChapters?: ChapterNav[];
}

const readingThemeStyles: Record<string, { bg: string; text: string }> = {
  default: { bg: "", text: "" },
  sepia: { bg: "bg-[#F5EFDC]", text: "text-[#5C4B3E]" },
  dark: { bg: "bg-[#1E1E1E]", text: "text-[#D4D4D4]" },
  night: { bg: "bg-[#0A0A0A]", text: "text-[#A89B8C]" },
};

const fontFamilyMap: Record<string, string> = {
  sans: "font-sans",
  serif: "font-serif",
  sarabun: "font-[Sarabun]",
  mono: "font-mono",
};

const themeOrder: ReadingTheme[] = ["default", "sepia", "dark", "night"];

export function ChapterReader({
  chapter,
  novelSlug,
  novelTitle,
  prevChapter,
  nextChapter,
  allChapters,
}: ChapterReaderProps) {
  const {
    fontSize,
    lineHeight,
    fontFamily,
    paragraphSpacing,
    maxWidth,
    readingTheme,
    blueLightFilter,
    brightness,
    immersiveMode,
    toggleImmersiveMode,
    setReadingTheme,
    setImmersiveMode,
  } = useReaderSettings();

  const router = useRouter();
  const theme = readingThemeStyles[readingTheme] || readingThemeStyles.default;

  // --- UI state ---
  const [controlsVisible, setControlsVisible] = useState(true);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [chapterListOpen, setChapterListOpen] = useState(false);
  const settingsRef = useRef<ReaderSettingsHandle>(null);
  const commentsRef = useRef<HTMLDivElement>(null);

  // Hide site navbar & footer when immersive
  useEffect(() => {
    const navbar = document.querySelector("nav");
    const footer = document.querySelector("footer");
    if (immersiveMode) {
      navbar?.classList.add("!hidden");
      footer?.classList.add("!hidden");
      document.body.style.paddingTop = "0";
    } else {
      navbar?.classList.remove("!hidden");
      footer?.classList.remove("!hidden");
      document.body.style.paddingTop = "";
    }
    return () => {
      navbar?.classList.remove("!hidden");
      footer?.classList.remove("!hidden");
      document.body.style.paddingTop = "";
    };
  }, [immersiveMode]);

  // Auto-hide top bar on scroll down (immersive only)
  const handleScroll = useCallback(() => {
    if (!immersiveMode) return;
    const currentY = window.scrollY;
    if (currentY > lastScrollY && currentY > 100) {
      setControlsVisible(false);
    } else {
      setControlsVisible(true);
    }
    setLastScrollY(currentY);
  }, [immersiveMode, lastScrollY]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Tap on reading area → open mobile sheet on small screens, nothing on desktop
  const handleContentClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("a, button, [role=button]")) return;
    if (window.innerWidth < 768) {
      setMobileSheetOpen(true);
    }
  }, []);

  function cycleTheme() {
    const idx = themeOrder.indexOf(readingTheme);
    const next = themeOrder[(idx + 1) % themeOrder.length];
    setReadingTheme(next);
  }

  function scrollToComments() {
    setImmersiveMode(false);
    setTimeout(() => {
      commentsRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  function openSettings() {
    settingsRef.current?.open();
  }

  // --- Swipe navigation (mobile, immersive mode only) ---
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!immersiveMode) return;

    function handleTouchStart(e: TouchEvent) {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    }

    function handleTouchEnd(e: TouchEvent) {
      if (!touchStartRef.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      touchStartRef.current = null;

      // Must be mostly horizontal and exceed threshold
      if (Math.abs(dx) < 80 || Math.abs(dy) > 50) return;

      if (dx < 0 && nextChapter) {
        toast.info(`ตอนถัดไป → ตอนที่ ${nextChapter.chapterNumber}`);
        router.push(`/novel/${novelSlug}/${nextChapter.id}`);
      } else if (dx > 0 && prevChapter) {
        toast.info(`← ตอนก่อนหน้า ตอนที่ ${prevChapter.chapterNumber}`);
        router.push(`/novel/${novelSlug}/${prevChapter.id}`);
      } else if (dx < 0 && !nextChapter) {
        toast.info("ยังไม่มีตอนถัดไป");
      } else if (dx > 0 && !prevChapter) {
        toast.info("นี่คือตอนแรก");
      }
    }

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [immersiveMode, nextChapter, prevChapter, novelSlug, router]);

  return (
    <div className={cn("relative", immersiveMode && "min-h-screen")}>
      {/* Reading Progress Bar */}
      <ProgressBar />

      {/* Immersive: minimal top bar */}
      {immersiveMode && (
        <ReaderTopBar
          novelTitle={novelTitle}
          chapterNumber={chapter.chapterNumber}
          visible={controlsVisible && !mobileSheetOpen}
          onOpenSettings={openSettings}
          onExitImmersive={() => setImmersiveMode(false)}
        />
      )}

      {/* Normal mode: standard top nav */}
      {!immersiveMode && (
        <div className="z-40 sticky top-14 border-b bg-background/95 backdrop-blur transition-all duration-300">
          <div className="mx-auto flex h-12 max-w-3xl items-center justify-between px-4">
            <div className="flex items-center gap-2 min-w-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                <Link href={`/novel/${novelSlug}`}>
                  <List className="h-4 w-4" />
                </Link>
              </Button>
              <span className="truncate text-xs text-muted-foreground">
                {novelTitle}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={toggleImmersiveMode}
                title="โหมดอ่านเต็มจอ"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <ReaderSettings ref={settingsRef} />
            </div>
          </div>
        </div>
      )}

      {/* Reading Area */}
      <div
        className={cn(
          "min-h-screen transition-colors duration-300",
          theme.bg,
          theme.text
        )}
        style={{ filter: `brightness(${brightness}%)` }}
        onClick={handleContentClick}
      >
        {/* Chapter Header */}
        <div
          className={cn("mx-auto px-4 pt-8 pb-4", immersiveMode && "px-6 sm:px-8")}
          style={{ maxWidth }}
        >
          <p className="text-sm opacity-70">ตอนที่ {chapter.chapterNumber}</p>
          <h1 className="mt-1 text-xl font-bold md:text-2xl">{chapter.title}</h1>
          <div className="mt-2 flex items-center gap-3 text-xs opacity-60">
            <span>
              {chapter.wordCount.toLocaleString()} คำ · ~
              {Math.max(1, Math.ceil(chapter.wordCount / 250))} นาที
            </span>
            {chapter.publishedAt && (
              <span>
                {new Date(chapter.publishedAt).toLocaleDateString("th-TH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div
          className={cn("mx-auto px-4 pb-12", immersiveMode && "px-6 sm:px-8")}
          style={{ maxWidth }}
        >
          <ChapterContent
            content={chapter.content}
            fontSize={fontSize}
            lineHeight={lineHeight}
            fontFamily={fontFamilyMap[fontFamily] || ""}
            paragraphSpacing={paragraphSpacing}
          />
        </div>

        {/* Blue light filter overlay */}
        {blueLightFilter > 0 && (
          <div
            className="pointer-events-none fixed inset-0 z-50"
            style={{
              backgroundColor: `rgba(255, 180, 50, ${blueLightFilter / 400})`,
              mixBlendMode: "multiply",
            }}
          />
        )}
      </div>

      {/* Reading Progress Tracker */}
      <ReadingProgress chapterId={chapter.id} />

      {/* Mobile bottom sheet */}
      <MobileReaderSheet
        open={mobileSheetOpen}
        onOpenChange={setMobileSheetOpen}
        onOpenChapterList={() => setChapterListOpen(true)}
      />

      {/* Chapter list sheet */}
      {allChapters && allChapters.length > 0 && (
        <ChapterListSheet
          chapters={allChapters}
          currentChapterId={chapter.id}
          novelSlug={novelSlug}
          open={chapterListOpen}
          onOpenChange={setChapterListOpen}
        />
      )}

      {/* Comments */}
      <div ref={commentsRef}>
        {!immersiveMode && (
          <div className="mx-auto max-w-3xl px-4 pb-8">
            <Separator className="mb-8" />
            <CommentSection chapterId={chapter.id} />
          </div>
        )}
      </div>

      {/* Bottom Navigation — normal mode only */}
      {!immersiveMode && (
        <div className="border-t bg-muted/30">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
            {prevChapter ? (
              <Button variant="outline" asChild>
                <Link href={`/novel/${novelSlug}/${prevChapter.id}`}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  ตอนที่ {prevChapter.chapterNumber}
                </Link>
              </Button>
            ) : (
              <div />
            )}

            <Button variant="ghost" size="sm" asChild>
              <Link href={`/novel/${novelSlug}`}>สารบัญ</Link>
            </Button>

            {nextChapter ? (
              <Button variant="outline" asChild>
                <Link href={`/novel/${novelSlug}/${nextChapter.id}`}>
                  ตอนที่ {nextChapter.chapterNumber}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <div />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
