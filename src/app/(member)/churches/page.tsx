import Link from "next/link";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { FollowButton } from "@/components/church/FollowButton";
import { NearMeChip } from "@/components/church/NearMeChip";
import { MemberNav } from "@/components/shell/BottomNav";
import { OfflineBanner } from "@/components/shell/OfflineBanner";
import { PageTitle, Screen, TopBar } from "@/components/shell/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Avatar, Badge, Card, EmptyState } from "@/components/ui/primitives";
import { listChurches } from "@/lib/data";
import { DEFAULT_CENTRE, directionsUrl, distanceKm, formatKm, type LatLng } from "@/lib/geo";
import { SITE_URL } from "@/lib/programme";
import { getFollowing } from "@/lib/session";
import { serviceTimeText } from "@/lib/time";
import type { Church, Locale } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("directory");
  return { title: t("title") };
}

type Params = Promise<Record<string, string | undefined>>;

function withParams(base: Record<string, string | undefined>, change: Record<string, string | null>) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...base, ...change })) {
    if (v !== null && v !== undefined && v !== "") next.set(k, v);
  }
  const s = next.toString();
  return s ? `/churches?${s}` : "/churches";
}

export default async function DirectoryPage({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const t = await getTranslations("directory");
  const tc = await getTranslations("common");
  const locale = (await getLocale()) as Locale;
  const query = params.q?.trim() ?? "";
  const near = params.near === "1";
  const kiswahili = params.sw === "1";
  const view = params.view === "map" ? "map" : "list";

  const lat = Number(params.lat);
  const lng = Number(params.lng);
  const hasLocation = Number.isFinite(lat) && Number.isFinite(lng) && params.lat !== undefined;
  const centre: LatLng = hasLocation ? { lat, lng } : DEFAULT_CENTRE;
  const place = hasLocation ? t("yourLocation") : "Ongata Rongai";

  const following = new Set(await getFollowing());
  const churches = (await listChurches({ query, kiswahili }))
    .map((c) => ({ church: c, km: distanceKm(centre, c) }))
    .sort((a, b) => (near || !query ? a.km - b.km : a.church.name.localeCompare(b.church.name)));

  const count = query
    ? t("countMatching", { count: churches.length, query })
    : near
      ? t("countNear", { count: churches.length, place })
      : t("countAll", { count: churches.length });

  const top = (
    <>
      <TopBar className="pr-4">
        <PageTitle>{t("title")}</PageTitle>
        <nav aria-label={t("view")} className="flex gap-0.5 rounded-full bg-seg p-[3px]">
          {(["list", "map"] as const).map((v) => (
            <Link
              key={v}
              href={withParams(params, { view: v === "list" ? null : "map", pin: null })}
              aria-current={view === v ? "page" : undefined}
              className={`inline-flex h-[38px] items-center gap-1.5 rounded-full px-3 text-[13px] font-bold no-underline ${
                view === v
                  ? "bg-surface text-primary shadow-[0_1px_2px_rgba(22,37,42,.12)]"
                  : "text-neutral-ink"
              }`}
            >
              <Icon name={v === "list" ? "list" : "map"} size={18} />
              {t(v)}
            </Link>
          ))}
        </nav>
      </TopBar>
      <div className="flex flex-col gap-2.5 px-4 pb-2.5">
        <form
          action="/churches"
          role="search"
          className={`flex min-h-12 items-center gap-2.5 rounded-full bg-surface pr-1.5 pl-3.5 text-ink-2 ${
            query ? "border-2 border-primary" : "border border-line-strong"
          }`}
        >
          <Icon name="search" />
          {view === "map" && <input type="hidden" name="view" value="map" />}
          {near && <input type="hidden" name="near" value="1" />}
          <input
            name="q"
            type="search"
            defaultValue={query}
            autoFocus={params.focus === "1"}
            aria-label={t("searchLabel")}
            placeholder={t("searchPlaceholder")}
            enterKeyHint="search"
            className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-2"
          />
          {query && (
            <Link
              href={withParams(params, { q: null })}
              aria-label={t("clearSearch")}
              className="inline-flex size-10 items-center justify-center rounded-full text-primary"
            >
              <Icon name="x" size={18} />
            </Link>
          )}
        </form>
        {view === "list" && (
          <div role="group" aria-label={t("filters")} className="flex gap-2 overflow-x-auto">
            <NearMeChip on={near} />
            <Link
              href={withParams(params, { sw: kiswahili ? null : "1" })}
              aria-pressed={kiswahili}
              className={`inline-flex h-10 shrink-0 items-center rounded-full border px-3.5 text-sm font-semibold no-underline ${
                kiswahili
                  ? "border-primary bg-primary text-on-primary"
                  : "border-field bg-surface text-ink-label"
              }`}
            >
              {t("kiswahili")}
            </Link>
          </div>
        )}
      </div>
    </>
  );

  if (churches.length === 0) {
    return (
      <Screen top={top} banner={<OfflineBanner />} nav={<MemberNav />} contentClassName="items-center pt-10">
        <EmptyState
          icon="search"
          title={t("noResults", { query })}
          action={
            <ButtonLink href="/churches" variant="secondary">
              {t("showAll")}
            </ButtonLink>
          }
        >
          <p>{t("noResultsBody")}</p>
        </EmptyState>
        <div className="my-5 h-px w-full bg-line" />
        <div className="flex flex-col items-center gap-1 text-center">
          <h2 className="t-subhead">{t("missingTitle")}</h2>
          <p className="t-small max-w-[280px]">{t("missingBody")}</p>
          <InviteButton label={t("invite")} text={t("inviteText", { url: `${SITE_URL}/register` })} />
        </div>
      </Screen>
    );
  }

  if (view === "map") {
    const selected = churches.find((c) => c.church.slug === params.pin) ?? churches[0]!;
    return (
      <Screen top={top} nav={<MemberNav />} contentClassName="!p-0">
        <SchematicMap
          centre={centre}
          churches={churches.map((c) => c.church)}
          selected={selected.church}
          params={params}
          label={t("mapLabel", { place })}
          pinLabel={(name, n) => t("pin", { name, n })}
        />
        <div className="px-4 pb-4">
          <Card as="article" className="-mt-24 relative shadow-[0_8px_24px_rgba(22,37,42,.18)]">
            <div className="flex items-start gap-3">
              <Avatar initials={selected.church.initials} tone="amber" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h2 className="t-subhead">{selected.church.shortName}</h2>
                  <Icon name="verified" size={18} className="text-primary" label={tc("verified")} />
                </div>
                <p className="t-small">
                  {formatKm(selected.km)} · {selected.church.landmark}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <ButtonLink href={`/churches/${selected.church.slug}`} size="sm" className="flex-1">
                {t("openChurch")}
              </ButtonLink>
              <a
                href={directionsUrl(selected.church)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-surface px-3.5 text-[15px] font-semibold text-primary no-underline shadow-[inset_0_0_0_1.5px_var(--primary)]"
              >
                <Icon name="nav" size={18} />
                {t("directions")}
              </a>
            </div>
          </Card>
          <p className="t-caption mt-3">{t("mapNote")}</p>
        </div>
      </Screen>
    );
  }

  return (
    <Screen top={top} banner={<OfflineBanner />} nav={<MemberNav />} contentClassName="gap-3">
      <p className="t-caption">{count}</p>
      {churches.map(({ church, km }) => (
        <ChurchCard
          key={church.id}
          church={church}
          meta={`${church.district} · ${formatKm(km)}`}
          following={following.has(church.id)}
          locale={locale}
          labels={{
            verified: tc("verified"),
            ss: (time) => t("sabbathSchool", { time }),
            ds: (time) => t("divineService", { time }),
          }}
        />
      ))}
    </Screen>
  );
}

/** English shows "8:30"; Swahili spells out "saa 2:30 asubuhi" so the period is clear. */
function shortTimeFor(hm: string, locale: Locale) {
  return locale === "sw" ? serviceTimeText(hm, "sw") : serviceTimeText(hm, "en").replace(/ (am|pm)$/, "");
}

function ChurchCard({
  church,
  meta,
  following,
  locale,
  labels,
}: {
  church: Church;
  meta: string;
  following: boolean;
  locale: Locale;
  labels: { verified: string; ss: (t: string) => string; ds: (t: string) => string };
}) {
  const ss = church.serviceTimes.find((s) => s.kind === "sabbath_school");
  const ds = church.serviceTimes.find((s) => s.kind === "divine_service");
  return (
    <Card as="article">
      <div className="flex items-start gap-3">
        <Avatar initials={church.initials} />
        <Link href={`/churches/${church.slug}`} className="min-w-0 flex-1 text-ink no-underline">
          <span className="flex items-center gap-1.5">
            <h2 className="t-subhead truncate">{church.shortName}</h2>
            {church.status === "verified" && (
              <Icon name="verified" size={18} className="text-primary" label={labels.verified} />
            )}
          </span>
          <p className="t-small">{meta}</p>
        </Link>
        <FollowButton churchId={church.id} following={following} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ss && <Badge>{labels.ss(shortTimeFor(ss.time, locale))}</Badge>}
        {ds && <Badge>{labels.ds(shortTimeFor(ds.time, locale))}</Badge>}
      </div>
    </Card>
  );
}

function InviteButton({ label, text }: { label: string; text: string }) {
  return (
    <a
      href={`https://wa.me/?text=${encodeURIComponent(text)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-12 items-center gap-2 px-3 font-semibold text-primary no-underline"
    >
      <Icon name="chat" />
      {label}
    </a>
  );
}

/**
 * A light schematic map: pins placed by bearing and distance from the
 * centre, no map tiles downloaded. Real tiles are a later decision
 * (Google Maps or OpenStreetMap) and would load only when tapped.
 */
function SchematicMap({
  centre,
  churches,
  selected,
  params,
  label,
  pinLabel,
}: {
  centre: LatLng;
  churches: Church[];
  selected: Church;
  params: Record<string, string | undefined>;
  label: string;
  pinLabel: (name: string, n: number) => string;
}) {
  const nearby = churches.filter((c) => distanceKm(centre, c) < 25);
  const maxKm = Math.max(5, ...nearby.map((c) => distanceKm(centre, c)));
  const pos = (c: LatLng) => {
    const dx = (c.lng - centre.lng) * Math.cos((centre.lat * Math.PI) / 180) * 111;
    const dy = (c.lat - centre.lat) * 111;
    const scale = 42 / maxKm;
    return { left: `${50 + dx * scale}%`, top: `${45 - dy * scale}%` };
  };
  return (
    <div role="group" aria-label={label} className="relative h-[520px] overflow-hidden bg-map">
      <div aria-hidden="true">
        <div className="absolute top-[150px] -left-5 h-3 w-[120%] -rotate-[14deg] rounded-md bg-map-road" />
        <div className="absolute -top-5 left-[42%] h-[600px] w-3 rotate-[8deg] rounded-md bg-map-road" />
        <div className="absolute top-[330px] left-10 h-2 w-[85%] rotate-[22deg] rounded-md bg-map-road" />
        <div className="absolute top-10 right-6 h-20 w-28 rounded-[20px] bg-map-green" />
        <div
          className="absolute size-[18px] -translate-1/2 rounded-full border-[3px] border-white bg-[#2F7FD0] shadow-[0_0_0_8px_rgba(47,127,208,.18)]"
          style={{ left: "50%", top: "45%" }}
        />
      </div>
      {nearby.map((c, i) => {
        const on = c.id === selected.id;
        return (
          <Link
            key={c.id}
            href={withParams(params, { pin: c.slug })}
            aria-label={pinLabel(c.shortName, i + 1)}
            aria-current={on ? "true" : undefined}
            scroll={false}
            style={pos(c)}
            className={`absolute flex size-11 -translate-x-1/2 -translate-y-full items-center justify-center no-underline`}
          >
            <span
              className={`flex size-9 -rotate-45 items-center justify-center rounded-[18px_18px_18px_4px] shadow-[0_2px_6px_rgba(22,37,42,.25)] ${
                on ? "bg-sun" : "bg-[#0F4C5C]"
              }`}
            >
              <span className={`rotate-45 text-[13px] font-extrabold ${on ? "text-[#2A1C02]" : "text-white"}`}>
                {i + 1}
              </span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

