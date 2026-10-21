"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RadioCard } from "@/components/ui/controls";
import { setLocale } from "@/i18n/actions";
import type { Locale } from "@/lib/types";

export function LanguageChoice({ label }: { label: string }) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [, start] = useTransition();
  const choose = (next: Locale) =>
    start(async () => {
      await setLocale(next);
      document.documentElement.lang = next;
      router.refresh();
    });

  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-2">
      <p className="t-label">{label}</p>
      <RadioCard checked={locale === "en"} onSelect={() => choose("en")}>
        <span className="flex-1 font-semibold" lang="en">
          English
        </span>
      </RadioCard>
      <RadioCard checked={locale === "sw"} onSelect={() => choose("sw")}>
        <span className="flex-1 font-semibold" lang="sw">
          Kiswahili
        </span>
      </RadioCard>
    </div>
  );
}
