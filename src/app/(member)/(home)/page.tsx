import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { MemberNav } from "@/components/shell/BottomNav";
import { LanguageToggle } from "@/components/shell/LanguageToggle";
import { OfflineBanner } from "@/components/shell/OfflineBanner";
import { Screen, TopBar } from "@/components/shell/Screen";
import { ShareLink } from "@/components/church/ShareLink";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { LogoMark } from "@/components/ui/Logo";
import { Avatar, Badge, Banner, Card } from "@/components/ui/primitives";
import { getChurchById, getUpcomingProgramme, listEvents } from "@/lib/data";
import { isSongServiceLive } from "@/lib/data/songs";
import { directionsUrl } from "@/lib/geo";
import { itemTitle, leadRole, roleLabel, SITE_URL, type ProgrammeT } from "@/lib/programme";
import { getFollowing, getSignedInMember } from "@/lib/session";
import { formatDate, greetingKey, nairobiDate, nextSabbath, serviceTime } from "@/lib/time";
import type { Locale } from "@/lib/types";

const TOWNS = ["Nairobi", "Ongata Rongai", "Kisumu", "Mombasa", "Nakuru", "Eldoret"];

export default async function HomePage() {
  const t = await getTranslations("home");
  const tp = await getTranslations("programme");
  const tc = await getTranslations("common");
  const locale = (await getLocale()) as Locale;
  const member = await getSignedInMember();
  const following = await getFollowing();
  const churches = (await Promise.all(following.map(getChurchById))).filter((c) => c !== null);
  const [myChurch, ...others] = churches;

  const sabbath = nextSabbath();
  const sabbathLabel = formatDate(nairobiDate(sabbath), locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const top = (
    <TopBar className="pr-2 pl-4">
      <LogoMark size={32} />
      <p className="min-w-0 flex-1 truncate pl-1 text-[17px] leading-[22px] font-bold">
        {member
          ? t(`greeting.${greetingKey()}`, { name: member.name.split(" ")[0] ?? "" })
          : t("welcome")}
      </p>
      <LanguageToggle />
    </TopBar>
  );

  const search = (
    <Link
      href="/churches?focus=1"
      className="flex min-h-12 items-center gap-2.5 rounded-full border border-line-strong bg-surface px-3.5 text-ink-2 no-underline"
    >
      <Icon name="search" />
      {t("search")}
    </Link>
  );

  if (!myChurch) {
    return (
      <Screen top={top} banner={<OfflineBanner />} nav={<MemberNav />} contentClassName="gap-4">
        {search}
        <Card className="items-center gap-2.5 px-5 py-7 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Icon name="church" size={30} />
          </span>
          <h1 className="t-heading">{t("findTitle")}</h1>
          <p className="t-small">{t("findBody")}</p>
          <ButtonLink href="/churches?near=1" icon="pin" className="mt-1.5 w-full">
            {t("nearMe")}
          </ButtonLink>
        </Card>
        <section className="flex flex-col gap-2.5">
          <h2 className="t-subhead">{t("byTown")}</h2>
          <div className="flex flex-wrap gap-2">
            {TOWNS.map((town) => (
              <Link
                key={town}
                href={`/churches?q=${encodeURIComponent(town)}`}
                className="inline-flex h-10 items-center rounded-full border border-field bg-surface px-3.5 text-sm font-semibold text-ink-label no-underline"
              >
                {town}
              </Link>
            ))}
          </div>
        </section>
      </Screen>
    );
  }

  const programme = await getUpcomingProgramme(myChurch.id);
  const songLive = await isSongServiceLive(myChurch.id);
  const [nextEvent] = await listEvents(myChurch.id);
  const pt = tp as unknown as ProgrammeT;
  const summary = programme?.items.filter((i) => i.kind !== "vespers").slice(0, 3) ?? [];
  const othersWithProgramme = await Promise.all(
    others.map(async (c) => ({ church: c, ready: Boolean(await getUpcomingProgramme(c.id)) })),
  );

  return (
    <Screen top={top} banner={<OfflineBanner />} nav={<MemberNav />}>
      {search}
      {songLive && (
        <Link href={`/churches/${myChurch.slug}/songs`} className="no-underline">
          <Banner
            tone="success"
            icon="music"
            className="rounded-xl"
            action={<Icon name="right" size={18} />}
          >
            {t("songLive", { church: myChurch.shortName })}
          </Banner>
        </Link>
      )}

      <section
        aria-label={t("myChurch")}
        className="flex flex-col overflow-hidden rounded-[18px] border border-line bg-surface"
      >
        <Link
          href={`/churches/${myChurch.slug}/about`}
          className="flex flex-col gap-0.5 bg-header px-4 py-3.5 text-white no-underline"
        >
          <p className="t-overline text-[#F0C063]">{t("myChurch")}</p>
          <div className="flex items-center gap-1.5">
            <h1 className="t-heading">{myChurch.shortName}</h1>
            {myChurch.status === "verified" && (
              <Icon name="verified" size={18} label={tc("verified")} />
            )}
          </div>
        </Link>

        <div className="flex flex-col px-4 pt-3 pb-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="t-subhead">{t("thisSabbath", { date: sabbathLabel })}</h2>
            {programme ? (
              <Badge tone="success">{tp("ready")}</Badge>
            ) : (
              <Badge tone="neutral">{tp("notPosted")}</Badge>
            )}
          </div>

          {summary.map((item) => {
            const time = serviceTime(item.startTime, locale);
            const lead = leadRole(item);
            return (
              <div key={item.id} className="grid grid-cols-[58px_minmax(0,1fr)] items-baseline gap-2.5 py-1.5">
                <div>
                  <span className="text-[15px] leading-5 font-bold num">{time.time}</span>
                  {locale === "sw" && <p className="t-caption">{time.period}</p>}
                </div>
                <div>
                  <p className="text-[15px] leading-[22px] font-bold">{itemTitle(item, pt)}</p>
                  {lead && (
                    <p className="t-small">
                      {roleLabel(lead, pt)} · {lead.value ?? tc("tba")}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          <Link
            href={`/churches/${myChurch.slug}`}
            className="inline-flex min-h-11 items-center gap-2 self-start font-semibold text-primary no-underline"
          >
            {t("seeFull")}
            <Icon name="right" size={18} />
          </Link>

          {nextEvent && (
            <>
              <div className="h-px bg-line" />
              <div className="flex items-center gap-2.5 py-3">
                <Icon name="cal" size={18} className="text-accent-ink" />
                <p className="t-small min-w-0 flex-1">
                  <strong className="text-ink">{t("next")}</strong> {nextEvent.title} ·{" "}
                  {formatDate(nextEvent.startsAt, locale, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-3 border-t border-line">
          {[
            { href: `/churches/${myChurch.slug}/give`, icon: "heart" as const, label: t("give") },
            { href: directionsUrl(myChurch), icon: "nav" as const, label: t("directions"), external: true },
          ].map((a) => (
            <Link
              key={a.label}
              href={a.href}
              {...(a.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="flex min-h-[60px] flex-col items-center justify-center gap-1 py-2.5 text-[13px] font-bold text-primary no-underline"
            >
              <Icon name={a.icon} />
              {a.label}
            </Link>
          ))}
          <ShareLink
            title={myChurch.name}
            url={`${SITE_URL}/churches/${myChurch.slug}`}
            label={t("share")}
          />
        </div>
      </section>

      {othersWithProgramme.length > 0 && (
        <section className="flex flex-col">
          <h2 className="t-subhead pb-0.5">{t("following")}</h2>
          {othersWithProgramme.map(({ church, ready }) => (
            <Link
              key={church.id}
              href={`/churches/${church.slug}`}
              className="flex min-h-[60px] items-center gap-3 py-2.5 text-ink no-underline"
            >
              <Avatar initials={church.initials} />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] leading-[22px] font-bold">{church.shortName}</p>
                <p className="t-caption">
                  {ready ? t("programmeReady", { date: sabbathLabel }) : t("programmePending")}
                </p>
              </div>
              <Icon name="right" className="text-ink-muted" />
            </Link>
          ))}
        </section>
      )}
    </Screen>
  );
}
