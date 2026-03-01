"use client";

import { useState } from "react";
import { AlignJustify } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { useReaderSettings } from "@/lib/useReaderSettings";
import { cn } from "@/lib/utils";
import type { ReadingTheme, FontFamily } from "@/lib/useReaderSettings";

interface MobileReaderSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenChapterList: () => void;
}

type SubMenu = "theme" | "font" | null;

const themeOptions: {
  value: ReadingTheme;
  label: string;
  bg: string;
  border: string;
  check: string;
}[] = [
    { value: "default", label: "ปกติ", bg: "bg-white", border: "border-gray-300", check: "text-gray-700" },
    { value: "sepia", label: "ซีเปีย", bg: "bg-[#F5EFDC]", border: "border-[#C5A97D]", check: "text-[#5C4B3E]" },
    { value: "dark", label: "มืด", bg: "bg-[#1E1E1E]", border: "border-[#555]", check: "text-white" },
  ];

const fontOptions: { value: FontFamily; label: string; className: string }[] = [
  { value: "sans", label: "Sans", className: "font-sans" },
  { value: "sarabun", label: "Sarabun", className: "font-[Sarabun]" },
  { value: "serif", label: "Serif", className: "font-serif" },
];

export function MobileReaderSheet({
  open,
  onOpenChange,
  onOpenChapterList,
}: MobileReaderSheetProps) {
  const [subMenu, setSubMenu] = useState<SubMenu>(null);

  const {
    fontSize, setFontSize,
    readingTheme, setReadingTheme,
    fontFamily, setFontFamily,
  } = useReaderSettings();

  function toggleSubMenu(menu: SubMenu) {
    setSubMenu((prev) => (prev === menu ? null : menu));
  }

  function handleClose(v: boolean) {
    if (!v) setSubMenu(null);
    onOpenChange(v);
  }

  const currentTheme = themeOptions.find((t) => t.value === readingTheme) ?? themeOptions[0];
  const currentFont = fontOptions.find((f) => f.value === fontFamily) ?? fontOptions[0];

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl px-0 pt-0 pb-0 [&>button]:hidden"
        style={{ height: "auto" }}
      >
        {/* ─── Drag handle ─── */}
        <div className="flex justify-center pt-2.5 pb-0.5">
          <div className="h-1 w-10 rounded-full bg-muted-foreground/25" />
        </div>

        {/* ─── Row 1: Font-size slider ─── */}
        <div className="flex items-center gap-3 px-5 py-3">
          <span className="text-xs text-muted-foreground shrink-0 select-none">A</span>
          <Slider
            value={[fontSize]}
            onValueChange={([v]) => setFontSize(v)}
            min={12}
            max={32}
            step={1}
            className="flex-1"
          />
          <span className="text-base font-semibold text-muted-foreground shrink-0 select-none">A</span>
        </div>

        {/* ─── Sub-menu: Theme circles ─── */}
        {subMenu === "theme" && (
          <div className="border-t px-5 py-3">
            <div className="flex items-center justify-around">
              {themeOptions.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setReadingTheme(t.value)}
                  className="flex flex-col items-center gap-1.5"
                >
                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all",
                      t.bg,
                      readingTheme === t.value
                        ? "border-primary scale-110 shadow-md"
                        : t.border
                    )}
                  >
                    {readingTheme === t.value ? (
                      <span className={cn("text-sm font-bold", t.check)}>✓</span>
                    ) : (
                      <span className={cn("text-xs opacity-60", t.check)}>Aa</span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── Sub-menu: Font ─── */}
        {subMenu === "font" && (
          <div className="border-t px-5 py-3 space-y-3">
            {/* Font-family cards only — font size already in Row 1 */}
            <div className="grid grid-cols-3 gap-2">
              {fontOptions.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFontFamily(f.value)}
                  className={cn(
                    "rounded-xl border-2 py-3 text-sm transition-colors",
                    f.className,
                    fontFamily === f.value
                      ? "border-primary bg-primary/10"
                      : "border-border hover:bg-accent"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── Row 2: Action toolbar ─── */}
        <div className="border-t flex items-stretch divide-x">
          {/* Chapter list */}
          <button
            onClick={() => { onOpenChapterList(); onOpenChange(false); }}
            className="flex flex-1 flex-col items-center gap-1 py-3 text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
          >
            <AlignJustify className="h-5 w-5" />
            <span className="text-[10px]">สารบัญ</span>
          </button>

          {/* Theme */}
          <button
            onClick={() => toggleSubMenu("theme")}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-3 transition-colors",
              subMenu === "theme"
                ? "text-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
            )}
          >
            {/* Small circle preview of current theme */}
            <div
              className={cn(
                "h-5 w-5 rounded-full border-2 transition-all",
                currentTheme.bg,
                subMenu === "theme" ? "border-primary" : currentTheme.border
              )}
            />
            <span className="text-[10px]">ธีม</span>
          </button>

          {/* Font */}
          <button
            onClick={() => toggleSubMenu("font")}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-3 transition-colors",
              subMenu === "font"
                ? "text-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
            )}
          >
            <span
              className={cn(
                "text-lg font-bold leading-none",
                currentFont.className
              )}
            >
              A
            </span>
            <span className="text-[10px]">ฟอนต์</span>
          </button>
        </div>

        {/* Safe-area bottom spacer */}
        <div className="h-safe-bottom" style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
      </SheetContent>
    </Sheet>
  );
}
