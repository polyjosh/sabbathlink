import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { FollowButton } from "@/components/church/FollowButton";
import { Card, DateTile, EmptyState, IconTile } from "@/components/ui/primitives";
import { getChurch, listAnnouncements, listEvents } from "@/lib/data";
import { getFollowing } from "@/lib/session";
import { formatDate, serviceTimeText, nairobiHm } from "@/lib/time";
import type { ChurchEvent, Locale } from "@/lib/types";

/** Announcements first, then dated events. Expired items hide themselves. */
export default async function ChurchEventsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ past?: string }>;
}) {
  const church = await getChurch((await params).slug);
  if (!church) notFound();
  const showPast = (await searchParams).past === "1";
  const t = await getTranslations("church");
  const locale = (await getLocale()) as Locale;
  const [announcements, upcoming, past] = await Promise.all([
    listAnnouncements(church.id),
    listEvents(church.id),
    showPast ? listEvents(church.id, { past: true }) : Promise.resolve([]),
  ]);
  const day = (iso: string) => formatDate(iso, locale, { weekday: "short" });
  const date = (iso: string) => formatDate(iso, locale, { day: "numeric", month: "short" });

  const eventRow = (e: ChurchEvent) => (
    <div key={e.id} className="flex items-start gap-3">
      <DateTile
        month={formatDate(e.startsAt, locale, { month: "short" })}
        day={formatDate(e.startsAt, locale, { day: "numeric" })}
      />
      <div className="min-w-0 flex-1">
        <h3 className="text-[15px] leading-[22px] font-bold">{e.title}</h3>
        <p className="t-small">
          {day(e.startsAt)} · {serviceTimeText(nairobiHm(e.startsAt), locale)}
          {e.endsAt && ` – ${serviceTimeText(nairobiHm(e.endsAt), locale)}`} · {e.place}
        </p>
      </div>
    </div>
  );

  return (
    <main className="flex flex-1 flex-col gap-3.5 px-4 pt-3.5 pb-4">
      {announcements.length > 0 && (
        <>
          <h2 className="t-overline">{t("announcements")}</h2>
          {announcements.map((a) => (
            <Card as="article" key={a.id} className="gap-1.5">
              <div className="flex items-start gap-2.5">
                <IconTile icon="mega" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] leading-[22px] font-bold">{a.title}</h3>
                  <p className="t-small">{a.body}</p>
                  <p className="t-caption mt-1">
                    {a.hideAfter
                      ? t("postedUntil", { day: day(a.postedAt), date: date(a.hideAfter) })
                      : t("posted", { day: day(a.postedAt) })}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </>
      )}

      <h2 className="t-overline pt-1">{t("upcomingEvents")}</h2>
      {upcoming.length > 0 ? (
        upcoming.map(eventRow)
      ) : (
        <EmptyState
          icon="cal"
          title={t("noEvents")}
          className="py-4"
          action={
            !(await getFollowing()).includes(church.id) && (
              <FollowButton churchId={church.id} following={false} size="md" />
            )
          }
        >
          <p>{t("noEventsBody")}</p>
        </EmptyState>
      )}

      {showPast && past.length > 0 && (
        <>
          <h2 className="t-overline pt-1">{t("pastEvents")}</h2>
          <div className="flex flex-col gap-3.5 opacity-80">{past.map(eventRow)}</div>
        </>
      )}
      <Link
        href={showPast ? "?" : "?past=1"}
        scroll={false}
        className="inline-flex min-h-12 items-center self-start text-[15px] font-semibold text-primary no-underline"
      >
        {showPast ? t("hidePast") : t("showPast")}
      </Link>
    </main>
  );
}
