import type { Locale } from "@/lib/types";

export const LOCALES: readonly Locale[] = ["en", "sw"];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: string | undefined): value is Locale {
  return value === "en" || value === "sw";
}
