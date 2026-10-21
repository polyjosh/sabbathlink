import type { Locale } from "./types";

/** All display times are Nairobi time; storage is UTC. */
export const TIME_ZONE = "Africa/Nairobi";

const intlLocale = (locale: Locale) => (locale === "sw" ? "sw-KE" : "en-KE");

/** "HH:mm" -> { hour, minute } */
function parseHm(hm: string) {
  const [h = "0", m = "0"] = hm.split(":");
  return { hour: Number(h), minute: Number(m) };
}

export type SwahiliPeriod = "asubuhi" | "mchana" | "alasiri" | "jioni" | "usiku";

/**
 * Swahili time counts hours from sunrise (about 6:00), so 8:30 am is
 * "saa 2:30 asubuhi" and 3:00 pm is "saa 9:00 alasiri".
 */
export function toSwahiliTime(hm: string): { time: string; period: SwahiliPeriod } {
  const { hour, minute } = parseHm(hm);
  const swHour = (hour + 6) % 12 || 12;
  let period: SwahiliPeriod;
  if (hour >= 5 && hour < 12) period = "asubuhi";
  else if (hour >= 12 && hour < 15) period = "mchana";
  else if (hour >= 15 && hour < 17) period = "alasiri";
  else if (hour >= 17 && hour < 19) period = "jioni";
  else period = "usiku";
  return { time: `${swHour}:${String(minute).padStart(2, "0")}`, period };
}

/** 12-hour clock for English: { time: "8:30", period: "am" } */
export function toClockTime(hm: string): { time: string; period: "am" | "pm" } {
  const { hour, minute } = parseHm(hm);
  const h12 = hour % 12 || 12;
  return { time: `${h12}:${String(minute).padStart(2, "0")}`, period: hour < 12 ? "am" : "pm" };
}

/** Programme time split into a big number and a small period, per locale. */
export function serviceTime(hm: string, locale: Locale) {
  return locale === "sw" ? toSwahiliTime(hm) : toClockTime(hm);
}

/** "8:30 am" / "saa 2:30 asubuhi" */
export function serviceTimeText(hm: string, locale: Locale) {
  const t = serviceTime(hm, locale);
  return locale === "sw" ? `saa ${t.time} ${t.period}` : `${t.time} ${t.period}`;
}

/** Parses a "YYYY-MM-DD" Nairobi date to a Date at Nairobi noon (safe for formatting). */
export function nairobiDate(ymd: string): Date {
  return new Date(`${ymd}T12:00:00+03:00`);
}

export function formatDate(
  date: Date | string,
  locale: Locale,
  opts: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(intlLocale(locale), { timeZone: TIME_ZONE, ...opts }).format(d);
}

/** Wall-clock "HH:mm" of an instant, in Nairobi. */
export function nairobiHm(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("hour")}:${get("minute")}`;
}

/** "YYYY-MM-DD" of the next Sabbath (today if today is Saturday), in Nairobi. */
export function nextSabbath(now: Date = new Date()): string {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(now);
  const d = new Date(`${ymd}T00:00:00Z`);
  const add = (6 - d.getUTCDay() + 7) % 7;
  d.setUTCDate(d.getUTCDate() + add);
  return d.toISOString().slice(0, 10);
}

export function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Expiring content: true while the item should still be shown. */
export function isVisible(hideAfter: string | null, now: Date = new Date()): boolean {
  return hideAfter === null || new Date(hideAfter).getTime() > now.getTime();
}

/** Greeting by Nairobi hour. */
export function greetingKey(now: Date = new Date()): "morning" | "afternoon" | "evening" {
  const hour = Number(nairobiHm(now.toISOString()).slice(0, 2));
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

/** "10 min ago" / "dakika 10 zilizopita" */
export function timeAgo(iso: string, locale: Locale, now: Date = new Date()): string {
  const rtf = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: "auto" });
  const seconds = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(0, "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  return rtf.format(Math.round(seconds / 86400), "day");
}
