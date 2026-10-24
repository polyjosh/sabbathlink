import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ChoristerCard } from "@/components/admin/ChoristerCard";
import { ProgrammeEditor } from "@/components/admin/ProgrammeEditor";
import { StartWeek } from "@/components/admin/StartWeek";
import { extraRecentPeople, getChurchById, getProgramme, listProgrammes } from "@/lib/data";
import { getChorister, listRecentChoristers } from "@/lib/data/songs";
import { can } from "@/lib/permissions";
import { programmeCounts } from "@/lib/programme";
import { addDays, formatDate, nairobiDate, nextSabbath } from "@/lib/time";
import type { Locale } from "@/lib/types";
import { requireCurrentAdmin } from "@/lib/session";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("adminNav"))("programme") };
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export default async function ProgrammePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const admin = await requireCurrentAdmin();
  if (!can(admin, "programme.edit", admin.churchId)) redirect("/admin");
  const church = (await getChurchById(admin.churchId))!;
  const locale = (await getLocale()) as Locale;
  const requested = (await searchParams).week;
  const week = requested && YMD.test(requested) ? requested : nextSabbath();
  const programme = await getProgramme(church.id, week);

  // Newest first.
  const all = await listProgrammes(church.id);
  const previous = all.find((p) => p.sabbathDate < week);

  const fmt = (ymd: string, opts: Intl.DateTimeFormatOptions) =>
    formatDate(nairobiDate(ymd), locale, opts);

  if (!programme) {
    return (
      <StartWeek
        week={week}
        title={fmt(week, { weekday: "long", day: "numeric", month: "long" })}
        previous={
          previous
            ? {
                label: fmt(previous.sabbathDate, { day: "numeric", month: "short" }),
                items: previous.items.filter((i) => i.roles.length).length,
                roles: programmeCounts(previous).total,
              }
            : null
        }
        weeks={weekStrip(week, locale)}
      />
    );
  }

  // People who recently filled each role, newest first, for the picker.
  const recent: Record<string, { name: string; lastOn: string }[]> = {};
  for (const p of all) {
    if (p.sabbathDate >= week) continue;
    for (const it of p.items)
      for (const r of it.roles) {
        if (!r.value || r.roleKey === "sermon_title" || r.roleKey === "theme") continue;
        const list = (recent[r.roleKey] ??= []);
        if (!list.some((x) => x.name === r.value))
          list.push({ name: r.value, lastOn: p.sabbathDate });
      }
  }
  for (const [key, people] of Object.entries(await extraRecentPeople())) {
    const list = (recent[key] ??= []);
    for (const person of people) if (!list.some((x) => x.name === person.name)) list.push(person);
  }

  // Song Service needs the database's session rules, so only with Supabase.
  const chorister = isSupabaseConfigured() ? (
    <ChoristerCard
      week={week}
      initial={await getChorister(church.id, week)}
      recent={await listRecentChoristers(church.id, week)}
    />
  ) : null;

  return (
    <ProgrammeEditor
      key={week}
      chorister={chorister}
      week={week}
      dateShort={fmt(week, { weekday: "short", day: "numeric", month: "short" })}
      dateLong={fmt(week, { day: "numeric", month: "long" })}
      churchName={church.name}
      churchSlug={church.slug}
      initialItems={programme.items}
      initialStatus={programme.status}
      initialSavedAt={programme.updatedAt}
      recent={Object.fromEntries(
        Object.entries(recent).map(([k, v]) => [
          k,
          v
            .slice(0, 5)
            .map((p) => ({
              name: p.name,
              lastOn: fmt(p.lastOn, { day: "numeric", month: "short" }),
            })),
        ]),
      )}
      weeks={weekStrip(week, locale)}
    />
  );
}

/** Previous, current and next Sabbath for the week switcher. */
function weekStrip(week: string, locale: Locale) {
  return [-7, 0, 7].map((d) => {
    const date = addDays(week, d);
    return {
      date,
      label: formatDate(nairobiDate(date), locale, { day: "numeric", month: "short" }),
    };
  });
}
