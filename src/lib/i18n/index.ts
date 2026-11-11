import { create } from "zustand";
import english from "./en.json";

export type Language = "ar" | "en";
export const LANGUAGE_KEY = "fpi-language";
export const languageDirection = (language: Language) => language === "ar" ? "rtl" : "ltr";
export const resolveLanguage = (value: string | null): Language => value === "en" ? "en" : "ar";

export const useLanguage = create<{ language: Language; setLanguage: (language: Language) => void }>((set) => ({
  language: "ar",
  setLanguage: (language) => {
    set({ language });
    try { localStorage.setItem(LANGUAGE_KEY, language); } catch { /* Storage is optional. */ }
  },
}));

const dictionary: Record<string, string> = english;
const normalize = (text: string) => text.trim().replace(/\s+/g, " ");
// Longest phrases first, so composed labels retain numbers and product brands.
const phrases = Object.keys(dictionary).filter((key) => key.length > 1).sort((a, b) => b.length - a.length);

export function translate(text: string, language: Language): string {
  if (language === "ar" || !/[\u0600-\u06ff]/.test(text)) return text;
  const key = normalize(text);
  if (dictionary[key]) return dictionary[key];
  let result = key;
  for (const phrase of phrases) {
    if (result.includes(phrase)) result = result.split(phrase).join(dictionary[phrase]);
  }
  return text.startsWith(" ") ? ` ${result} ` : result;
}

export const t = (text: string) => translate(text, useLanguage.getState().language);
export const locale = () => useLanguage.getState().language === "en" ? "en-IQ" : "ar-IQ";

export function pageMeta(title: string, description: string) {
  return [
    { title }, { name: "description", content: description },
    { property: "og:title", content: title }, { property: "og:description", content: description },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ];
}