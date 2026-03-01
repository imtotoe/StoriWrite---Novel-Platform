import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FontFamily = "sans" | "serif" | "sarabun" | "mono";
export type ReadingTheme = "default" | "sepia" | "dark" | "night";

interface ReaderSettingsState {
  fontSize: number;
  lineHeight: number;
  fontFamily: FontFamily;
  paragraphSpacing: number;
  maxWidth: number;
  readingTheme: ReadingTheme;
  blueLightFilter: number;
  brightness: number;
  immersiveMode: boolean;

  setFontSize: (v: number) => void;
  setLineHeight: (v: number) => void;
  setFontFamily: (v: FontFamily) => void;
  setParagraphSpacing: (v: number) => void;
  setMaxWidth: (v: number) => void;
  setReadingTheme: (v: ReadingTheme) => void;
  setBlueLightFilter: (v: number) => void;
  setBrightness: (v: number) => void;
  setImmersiveMode: (v: boolean) => void;
  toggleImmersiveMode: () => void;
  resetAll: () => void;
}

const defaults = {
  fontSize: 18,
  lineHeight: 1.8,
  fontFamily: "sans" as FontFamily,
  paragraphSpacing: 0.8,
  maxWidth: 720,
  readingTheme: "default" as ReadingTheme,
  blueLightFilter: 0,
  brightness: 100,
  immersiveMode: false,
};

export const useReaderSettings = create<ReaderSettingsState>()(
  persist(
    (set, get) => ({
      ...defaults,
      setFontSize: (v) => set({ fontSize: Math.max(12, Math.min(32, v)) }),
      setLineHeight: (v) => set({ lineHeight: Math.max(1.2, Math.min(3.0, v)) }),
      setFontFamily: (v) => set({ fontFamily: v }),
      setParagraphSpacing: (v) => set({ paragraphSpacing: Math.max(0, Math.min(3, v)) }),
      setMaxWidth: (v) => set({ maxWidth: Math.max(600, Math.min(1000, v)) }),
      setReadingTheme: (v) => set({ readingTheme: v }),
      setBlueLightFilter: (v) => set({ blueLightFilter: Math.max(0, Math.min(100, v)) }),
      setBrightness: (v) => set({ brightness: Math.max(50, Math.min(150, v)) }),
      setImmersiveMode: (v) => set({ immersiveMode: v }),
      toggleImmersiveMode: () => set({ immersiveMode: !get().immersiveMode }),
      resetAll: () => set(defaults),
    }),
    { name: "reader-settings" }
  )
);
