"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { addDays } from "@/lib/time";

export function WeekSwitcher({
  weeks,
  current,
}: {
  weeks: { date: string; label: string }[];
  current: string;
}) {
  const t = useTranslations("editor");
  const link = "inline-flex min-h-10 items-center justify-center rounded-[9px] px-3 text-sm font-bold no-underline";
  return (
    <nav aria-label={t("week")} className="flex items-center gap-1 rounded-xl border border-line bg-surface p-[3px]">
      <Link href={`/admin/programme?week=${addDays(current, -7)}`} aria-label={t("prevWeek")} className={`${link} text-neutral-ink`}>
        <Icon name="left" size={18} />
      </Link>
      {weeks.map((w) => (
        <Link
          key={w.date}
          href={`/admin/programme?week=${w.date}`}
          aria-current={w.date === current ? "page" : undefined}
          className={`${link} ${w.date === current ? "bg-primary text-on-primary" : "text-neutral-ink"}`}
        >
          {w.label}
        </Link>
      ))}
      <Link href={`/admin/programme?week=${addDays(current, 7)}`} aria-label={t("nextWeek")} className={`${link} text-neutral-ink`}>
        <Icon name="right" size={18} />
      </Link>
    </nav>
  );
}
