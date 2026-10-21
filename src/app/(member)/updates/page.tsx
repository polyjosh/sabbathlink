import Link from "next/link";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { MemberNav } from "@/components/shell/BottomNav";
import { OfflineBanner } from "@/components/shell/OfflineBanner";
import { PageTitle, Screen, TopBar } from "@/components/shell/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { Card, DateTile, EmptyState, IconTile } from "@/components/ui/primitives";
import { getChurchById, listAnnouncements, listEvents } from "@/lib/data";
import { getFollowing } from "@/lib/session";
import { formatDate, nairobiHm, serviceTimeText } from "@/lib/time";
import type { Locale } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("updates"))("title") };
}

/** Announcements and events from every church the member follows. */
export default async function UpdatesPage() {
  const t = await getTranslations("updates");
  const locale = (await getLocale()) as Locale;
  const churches = (await Promise.all((await getFollowing()).map(getChurchById))).filter(
    (c) => c !== null,
  );
  const feed = (
    await Promise.all(
      churches.map(async (church) => [
        ...(await listAnnouncements(church.id)).map((a) => ({
          kind: "announcement" as const,
          at: a.postedAt,
          church,
          a,
        })),
        ...(await listEvents(church.id)).map((e) => ({
          kind: "event" as const,
          at: e.startsAt,
          church,
          e,
        })),
      ]),
    )
  ).flat();
  const announcements = feed.filter((f) => f.kind === "announcement");
  const events = feed.filter((f) => f.kind === "event").sort((a, b) => a.at.localeCompare(b.at));

  const top = (
    <TopBar>
      <PageTitle>{t("title")}</PageTitle>
    </TopBar>
  );

  if (feed.length === 0) {
    return (
      <Screen top={top} nav={<MemberNav />} contentClassName="items-center justify-center pb-20">
        <EmptyState
          icon="bell"
          title={t("emptyTitle")}
          action={
            <ButtonLink href="/churches" variant="secondary">
              {t("findChurches")}
            </ButtonLink>
          }
        >
          <p>{t("emptyBody")}</p>
        </EmptyState>
      </Screen>
    );
  }

  return (
    <Screen top={top} banner={<OfflineBanner />} nav={<MemberNav />}>
      {announcements.map((f) =>
        f.kind === "announcement" ? (
          <Card as="article" key={f.a.id} className="gap-1.5">
            <div className="flex items-start gap-2.5">
              <IconTile icon="mega" />
              <div className="min-w-0 flex-1">
                <Link href={`/churches/${f.church.slug}/events`} className="t-caption font-semibold no-underline">
                  {f.church.shortName}
                </Link>
                <h2 className="text-[15px] leading-[22px] font-bold">{f.a.title}</h2>
                <p className="t-small">{f.a.body}</p>
              </div>
            </div>
          </Card>
        ) : null,
      )}
      {events.map((f) =>
        f.kind === "event" ? (
          <Link
            key={f.e.id}
            href={`/churches/${f.church.slug}/events`}
            className="flex items-start gap-3 text-ink no-underline"
          >
            <DateTile
              month={formatDate(f.e.startsAt, locale, { month: "short" })}
              day={formatDate(f.e.startsAt, locale, { day: "numeric" })}
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] leading-[22px] font-bold">{f.e.title}</h2>
              <p className="t-small">
                {f.church.shortName} · {serviceTimeText(nairobiHm(f.e.startsAt), locale)} ·{" "}
                {f.e.place}
              </p>
            </div>
          </Link>
        ) : null,
      )}
    </Screen>
  );
}
