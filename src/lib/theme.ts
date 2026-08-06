import { useEffect } from "react";
import { useCatalog } from "@/lib/catalog";

export type ThemeKey =
  | "primary_color"
  | "secondary_color"
  | "bg_color"
  | "card_bg"
  | "text_color"
  | "accent_color";

export const THEME_DEFAULTS: Record<ThemeKey, string> = {
  primary_color: "#6366F1",
  secondary_color: "#4F46E5",
  bg_color: "#0F172A",
  card_bg: "#1E293B",
  text_color: "#F8FAFC",
  accent_color: "#10B981",
};

export const THEME_LABELS: Record<ThemeKey, string> = {
  primary_color: "اللون الأساسي",
  secondary_color: "اللون الثانوي",
  bg_color: "لون الخلفية",
  card_bg: "لون الكروت",
  text_color: "لون النص",
  accent_color: "لون التمييز",
};

export const THEME_KEYS = Object.keys(THEME_DEFAULTS) as ThemeKey[];

/** settings key used in the database (key/value settings table) */
export const themeSettingKey = (k: ThemeKey) => `theme_${k}`;

export function readTheme(settings: Record<string, string>): Record<ThemeKey, string> {
  const out = { ...THEME_DEFAULTS };
  for (const k of THEME_KEYS) {
    const v = settings[themeSettingKey(k)];
    if (v && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v.trim())) out[k] = v.trim();
  }
  return out;
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function readableOn(hex: string): string {
  return luminance(hex) > 0.5 ? "#0B0F19" : "#FFFFFF";
}

function mix(hex: string, target: string, amount: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  const out = a.map((v, i) => Math.round(v + (b[i]! - v) * amount));
  return `#${out.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function themeCssVars(t: Record<ThemeKey, string>): Record<string, string> {
  const light = luminance(t.bg_color) > 0.5;
  return {
    "--background": t.bg_color,
    "--foreground": t.text_color,
    "--card": t.card_bg,
    "--card-foreground": t.text_color,
    "--popover": t.card_bg,
    "--popover-foreground": t.text_color,
    "--surface": t.card_bg,
    "--surface-2": mix(t.card_bg, light ? "#000000" : "#ffffff", 0.08),
    "--primary": t.primary_color,
    "--primary-foreground": readableOn(t.primary_color),
    "--neon": mix(t.primary_color, "#ffffff", 0.15),
    "--secondary": t.secondary_color,
    "--secondary-foreground": readableOn(t.secondary_color),
    "--accent": t.accent_color,
    "--accent-foreground": readableOn(t.accent_color),
    "--muted": mix(t.card_bg, light ? "#000000" : "#ffffff", 0.04),
    "--muted-foreground": mix(t.text_color, t.bg_color, 0.45),
    "--border": rgba(t.text_color, 0.16),
    "--input": mix(t.card_bg, light ? "#000000" : "#ffffff", 0.06),
    "--ring": t.primary_color,
    "--gradient-brand": `linear-gradient(135deg, ${t.primary_color} 0%, ${t.secondary_color} 100%)`,
    "--gradient-radial-red": `radial-gradient(circle at 50% 0%, ${rgba(t.primary_color, 0.35)}, transparent 60%)`,
    "--shadow-glow": `0 0 40px -8px ${rgba(t.primary_color, 0.6)}`,
    "--shadow-glow-lg": `0 0 80px -10px ${rgba(t.primary_color, 0.55)}`,
  };
}

export function applyTheme(t: Record<ThemeKey, string>) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const vars = themeCssVars(t);
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
}

/** Fetches theme colors from the backend settings and applies them as CSS variables. */
export function useSiteTheme() {
  const settings = useCatalog((s) => s.settings);
  useEffect(() => {
    applyTheme(readTheme(settings));
  }, [settings]);
}
