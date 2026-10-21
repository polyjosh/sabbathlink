"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocale } from "@/i18n/actions";
import { Segmented } from "@/components/ui/controls";
import type { Locale } from "@/lib/types";

/** EN/SW switch for the top bar; "full" spells out the names (Profile). */
export function LanguageToggle({ full = false }: { full?: boolean }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const router = useRouter();
  const [, start] = useTransition();

  return (
    <Segmented
      label={t("language")}
      value={locale}
      onChange={(next) =>
        start(async () => {
          await setLocale(next);
          document.documentElement.lang = next;
          router.refresh();
        })
      }
      options={[
        { value: "en", label: full ? "English" : "EN" },
        { value: "sw", label: full ? "Kiswahili" : "SW" },
      ]}
    />
  );
}
