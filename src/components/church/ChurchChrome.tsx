"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

const TABS = ["programme", "events", "about", "give"] as const;

/**
 * Sticky church header. The About tab shows the full header (name, district,
 * Verified, Follow); the other tabs keep it to one line so content starts
 * higher on a small screen.
 */
export function ChurchChrome({
  slug,
  back,
  share,
  name,
  header,
}: {
  slug: string;
  back: ReactNode;
  share: ReactNode;
  name: string;
  header: ReactNode;
}) {
  const segment = useSelectedLayoutSegment();
  const t = useTranslations("church.tabs");
  const active = segment ?? "programme";
  const full = active === "about";

  return (
    <div className="sticky top-0 z-20 bg-canvas">
      <header className="flex min-h-14 items-center gap-1 px-2 py-2">
        {back}
        <p className={`min-w-0 flex-1 truncate font-bold ${full ? "invisible" : ""}`}>{name}</p>
        {share}
      </header>
      {full && header}
      <nav aria-label={t("label")} className="flex border-b border-line px-2">
        {TABS.map((tab) => {
          const on = tab === active;
          return (
            <Link
              key={tab}
              href={tab === "programme" ? `/churches/${slug}` : `/churches/${slug}/${tab}`}
              aria-current={on ? "page" : undefined}
              scroll={false}
              className={`flex min-h-12 flex-1 items-center justify-center border-b-[3px] px-1 text-[15px] no-underline ${
                on
                  ? "border-primary font-bold text-primary"
                  : "border-transparent font-semibold text-ink-2"
              }`}
            >
              {t(tab)}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
