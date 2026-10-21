import "server-only";
import { getTranslations } from "next-intl/server";

/** Turns ?done=… / ?error=… from a staff action into the banner at the top of the page. */
export async function noticeFrom(sp: { done?: string; error?: string }) {
  const t = await getTranslations("platform");
  // The keys come from the URL, so each is checked with has() before use.
  type Key = Parameters<typeof t>[0];
  if (sp.error) {
    const key = `error.${sp.error}` as Key;
    return { tone: "warn" as const, text: t.has(key) ? t(key) : t("error.generic") };
  }
  if (sp.done) {
    const key = `done.${sp.done}` as Key;
    return t.has(key) ? { tone: "success" as const, text: t(key) } : null;
  }
  return null;
}
