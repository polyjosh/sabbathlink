import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { SongRequestsSwitch } from "@/components/admin/SongRequestsSwitch";
import { AdminNav } from "@/components/shell/BottomNav";
import { BackButton } from "@/components/shell/BackButton";
import { Screen, TopBar } from "@/components/shell/Screen";
import { Button, ButtonLink } from "@/components/ui/Button";
import { SelectInput, TextArea, TextInput } from "@/components/ui/controls";
import { Badge, Banner, Card, Note } from "@/components/ui/primitives";
import { endSongService } from "@/lib/actions";
import { getChurchById } from "@/lib/data";
import { getSongView } from "@/lib/data/songs";
import { can } from "@/lib/permissions";
import { requireCurrentAdmin } from "@/lib/session";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { formatDate, nairobiDate, nairobiHm, serviceTimeText } from "@/lib/time";
import type { Locale } from "@/lib/types";
import { addHymnal, addHymnTitles, deleteHymnal, startSongService } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("songsAdmin"))("title") };
}

/**
 * Song Service for church admins: start and end this Sabbath's live
 * requests, and keep the hymnals members choose from. The chorister of the
 * day is chosen in the programme editor.
 */
export default async function AdminSongsPage({
  searchParams,
}: {
  searchParams: Promise<{ started?: string; error?: string; added?: string }>;
}) {
  const admin = await requireCurrentAdmin();
  if (!can(admin, "programme.edit", admin.churchId)) redirect("/admin");
  const church = (await getChurchById(admin.churchId))!;
  const t = await getTranslations("songsAdmin");
  const locale = (await getLocale()) as Locale;
  const params = await searchParams;
  const view = await getSongView(church.id);

  const top = (
    <TopBar>
      <BackButton fallback="/admin/more" />
      <h1 className="min-w-0 flex-1 text-lg leading-6 font-bold">{t("title")}</h1>
    </TopBar>
  );

  if (!isSupabaseConfigured() || !view) {
    return (
      <Screen top={top} nav={<AdminNav />}>
        <Note>{t("needsSupabase")}</Note>
      </Screen>
    );
  }

  const session = view.session;
  const live = Boolean(session?.live);
  const added = Number(params.added);
  const banner = params.started
    ? { tone: "success" as const, text: t("startedBanner") }
    : params.error === "off"
      ? { tone: "warn" as const, text: t("offError") }
      : params.error === "name"
        ? { tone: "warn" as const, text: t("nameError") }
        : params.added !== undefined
          ? {
              tone: "success" as const,
              text: t("addedBanner", { count: Number.isFinite(added) ? added : 0 }),
            }
          : null;

  return (
    <Screen top={top} nav={<AdminNav />}>
      {banner && (
        <Banner
          tone={banner.tone}
          icon={banner.tone === "success" ? "check" : "alert"}
          className="rounded-xl"
        >
          {banner.text}
        </Banner>
      )}

      <Card className="gap-3">
        <p className="t-overline">
          {t("thisSabbath", {
            date: formatDate(nairobiDate(view.sabbathDate), locale, {
              weekday: "short",
              day: "numeric",
              month: "short",
            }),
          })}
        </p>
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 text-[15px]">
            {view.chorister ? (
              t.rich("choristerIs", { name: view.chorister, b: (c) => <b>{c}</b> })
            ) : (
              <span className="font-semibold text-accent-ink">{t("noChorister")}</span>
            )}
          </p>
          <ButtonLink href={`/admin/programme?week=${view.sabbathDate}`} size="sm" variant="text">
            {view.chorister ? t("change") : t("choose")}
          </ButtonLink>
        </div>

        {live && session ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="success" icon="music">
                {t("live")}
              </Badge>
              <span className="t-caption">
                {t("until", { time: serviceTimeText(nairobiHm(session.closesAt), locale) })}
              </span>
            </div>
            <ButtonLink href={`/churches/${church.slug}/songs/lead`} size="lg" icon="list">
              {t("openList")}
            </ButtonLink>
            <form action={endSongService.bind(null, session.id)}>
              <Button type="submit" variant="danger" className="w-full">
                {t("end")}
              </Button>
            </form>
          </>
        ) : view.enabled ? (
          <form action={startSongService} className="flex flex-col gap-3">
            <p className="t-small">{session ? t("endedBody") : t("startBody")}</p>
            <SelectInput label={t("closeAfter")} name="minutes" defaultValue="180">
              <option value="120">{t("hours", { count: 2 })}</option>
              <option value="180">{t("hours", { count: 3 })}</option>
              <option value="240">{t("hours", { count: 4 })}</option>
            </SelectInput>
            <Button type="submit" size="lg" icon="music">
              {session ? t("restart") : t("start")}
            </Button>
          </form>
        ) : (
          <Note>{t("offError")}</Note>
        )}
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="t-subhead px-1">{t("hymnals")}</h2>
        <Note tone="info">{t("hymnalsNote")}</Note>
        {view.hymnals.map((h) => (
          <Card key={h.id} className="gap-2">
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 font-bold">{h.name}</p>
              <Badge>{t(`lang.${h.language}`)}</Badge>
              <Badge tone={h.hymns ? "success" : "neutral"}>
                {t("titles", { count: h.hymns })}
              </Badge>
            </div>
            <details>
              <summary className="flex min-h-11 cursor-pointer items-center text-[15px] font-semibold text-primary">
                {t("addTitles")}
              </summary>
              <form action={addHymnTitles} className="flex flex-col gap-2 pt-1">
                <input type="hidden" name="hymnalId" value={h.id} />
                <TextArea
                  label={t("pasteTitles")}
                  hint={t("pasteHint")}
                  name="titles"
                  rows={6}
                  required
                />
                <Button type="submit" variant="secondary">
                  {t("saveTitles")}
                </Button>
              </form>
              <form action={deleteHymnal} className="pt-2">
                <input type="hidden" name="hymnalId" value={h.id} />
                <Button type="submit" variant="text" size="sm" icon="trash" className="text-danger">
                  {t("removeHymnal")}
                </Button>
              </form>
            </details>
          </Card>
        ))}
        <Card className="gap-3">
          <h3 className="t-subhead">{t("addHymnal")}</h3>
          <form action={addHymnal} className="flex flex-col gap-3">
            <TextInput label={t("hymnalName")} name="name" maxLength={60} required />
            <SelectInput label={t("language")} name="language" defaultValue="en">
              <option value="en">{t("lang.en")}</option>
              <option value="sw">{t("lang.sw")}</option>
              <option value="other">{t("lang.other")}</option>
            </SelectInput>
            <TextArea label={t("pasteTitles")} hint={t("pasteHint")} name="titles" rows={4} />
            <Button type="submit" variant="secondary" icon="plus">
              {t("addHymnal")}
            </Button>
          </form>
        </Card>
      </section>

      {can(admin, "church.edit", church.id) && (
        <Card>
          <SongRequestsSwitch on={view.enabled} />
        </Card>
      )}
    </Screen>
  );
}
