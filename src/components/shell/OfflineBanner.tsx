"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Banner } from "@/components/ui/primitives";
import { formatDate } from "@/lib/time";
import type { Locale } from "@/lib/types";

const KEY = "sl_saved_at";

/**
 * Sits under the top bar and never blocks content. While online it records
 * when pages were last loaded; offline it says what time it is showing.
 */
export function OfflineBanner() {
  const t = useTranslations("states");
  const locale = useLocale() as Locale;
  const [offline, setOffline] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      const isOff = !navigator.onLine;
      setOffline(isOff);
      try {
        if (isOff) setSavedAt(localStorage.getItem(KEY));
        else localStorage.setItem(KEY, new Date().toISOString());
      } catch {
        // Storage can be blocked; the banner still shows, without a time.
      }
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;
  return (
    <Banner tone="offline" icon="off">
      {savedAt
        ? t("offlineSaved", {
            time: formatDate(savedAt, locale, { hour: "numeric", minute: "2-digit" }),
          })
        : t("offline")}
    </Banner>
  );
}
