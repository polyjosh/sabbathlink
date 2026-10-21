import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminNav } from "@/components/shell/BottomNav";
import { Screen } from "@/components/shell/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Badge, Card } from "@/components/ui/primitives";
import {
  getChurchById,
  getCurrentAdmin,
  getProgramme,
  listActivity,
  listAnnouncements,
  listEvents,
} from "@/lib/data";
import { can } from "@/lib/permissions";
import { emptyRoles, itemTitle, programmeCounts, roleCounts, roleLabel, type ProgrammeT } from "@/lib/programme";
import { formatDate, greetingKey, nairobiDate, nextSabbath, serviceTimeText, timeAgo } from "@/lib/time";
import { getSignedInMember } from "@/lib/session";
import type { Locale } from "@/lib/types";

/** Answers one question first: is this Sabbath's programme ready? */
export default async function AdminDashboard() {
  const admin = (await getCurrentAdmin())!;
  const church = (await getChurchById(admin.churchId))!;
  const member = await getSignedInMember();
  const t = await getTranslations("dashboard");
  const tr = await getTranslations("adminRoles");
  const th = await getTranslations("home");
  const tp = await getTranslations("programme");
  const pt = tp as unknown as ProgrammeT;
  const locale = (await getLocale()) as Locale;

  const date = nextSabbath();
  const programme = await getProgramme(church.id, date);
  const counts = programme ? programmeCounts(programme) : { filled: 0, total: 0 };
  const percent = counts.total ? Math.round((counts.filled / counts.total) * 100) : 0;
  const empty = programme ? emptyRoles(programme) : [];
  const ready = programme?.status === "published" && empty.length === 0;
  const dateLabel = formatDate(nairobiDate(date), locale, { weekday: "short", day: "numeric", month: "short" });
  const ago = programme ? timeAgo(programme.updatedAt, locale) : "";

  const [activity, announcements, events] = await Promise.all([
    listActivity(church.id),
    listAnnouncements(church.id),
    listEvents(church.id),
  ]);

  const status = !programme
    ? t("notStarted")
    : ready
      ? t("readyTitle")
      : t("incomplete");

  const quick: { href: string; icon: IconName; label: string; show: boolean }[] = [
    { href: "/admin/programme", icon: "cal", label: t("updateProgramme"), show: can(admin, "programme.edit", church.id) },
    { href: "/admin/posts/announcement", icon: "mega", label: t("postAnnouncement"), show: can(admin, "posts.edit", church.id) },
    { href: "/admin/posts/event", icon: "plus", label: t("addEvent"), show: can(admin, "posts.edit", church.id) },
  ];

  const ring = (size: "sm" | "lg") => (
    <div
      role="img"
      aria-label={t("percent", { percent })}
      className={`flex shrink-0 items-center justify-center rounded-full ${size === "lg" ? "size-[88px]" : "size-16"}`}
      style={{ background: `conic-gradient(${ready ? "var(--success)" : "var(--accent)"} 0 ${percent}%, var(--line) 0)` }}
    >
      <span
        className={`flex items-center justify-center rounded-full bg-surface font-extrabold ${
          size === "lg" ? "size-[70px] text-xl" : "size-[50px] text-[15px]"
        }`}
      >
        {percent}%
      </span>
    </div>
  );

  return (
    <Screen
      className="lg:max-w-[1120px] lg:px-6"
      top={
        <header className="flex min-h-14 items-center gap-1 py-2 pr-2 pl-4 lg:hidden">
          <div className="min-w-0 flex-1">
            <p className="flex min-h-11 items-center gap-1.5 text-[17px] font-extrabold">{church.shortName}</p>
            <p className="t-caption -mt-1.5">{t("signedInAs", { role: tr(admin.role) })}</p>
          </div>
          <Link
            href={`/churches/${church.slug}`}
            aria-label={t("viewAsMember")}
            className="inline-flex size-11 items-center justify-center rounded-full text-ink"
          >
            <Icon name="eye" />
          </Link>
        </header>
      }
      nav={<AdminNav />}
      contentClassName="lg:gap-6 lg:pt-8"
    >
      {/* Desktop header (D1). */}
      <header className="hidden flex-wrap items-center justify-between gap-4 lg:flex">
        <div>
          <p className="t-small">{formatDate(new Date(), locale, { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="t-display">{th(`greeting.${greetingKey()}`, { name: member?.name.split(" ")[0] ?? "" })}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {church.status === "verified" && (
            <Badge tone="verified" icon="verified">
              {t("verifiedChurch")}
            </Badge>
          )}
          <ButtonLink href={`/churches/${church.slug}`} variant="secondary" icon="eye">
            {t("viewAsMember")}
          </ButtonLink>
        </div>
      </header>

      <Card className="gap-3 lg:gap-[18px] lg:p-5">
        <div className="flex items-start gap-3 lg:flex-wrap lg:gap-5">
          <div className="hidden lg:block">{ring("lg")}</div>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <p className="t-overline">{t("thisSabbath", { date: dateLabel })}</p>
            <h2 className="t-heading lg:hidden">{status}</h2>
            <h2 className="hidden text-[22px] leading-7 font-bold lg:block">
              {empty.length && programme ? t("incompleteLong", { count: empty.length }) : status}
            </h2>
            {programme && empty.length > 0 && (
              <Badge tone="warn" className="self-start lg:hidden">
                {t("rolesEmpty", { count: empty.length })}
              </Badge>
            )}
            {programme && (
              <p className="t-caption lg:hidden">
                {programme.status === "published" ? `${t("published")} · ${ago}` : t("draftSaved", { ago })}
              </p>
            )}
            {programme && empty.length > 0 && (
              <p className="t-small hidden lg:block">
                {t("emptyList", { roles: empty.map((r) => roleLabel(r, pt)).join(", "), ago })}
              </p>
            )}
          </div>
          <div className="lg:hidden">{ring("sm")}</div>
          <div className="hidden gap-2 lg:flex">
            <ButtonLink href="/admin/programme/preview" variant="secondary">
              {t("preview")}
            </ButtonLink>
            <ButtonLink href="/admin/programme" icon="edit">
              {t("finish")}
            </ButtonLink>
          </div>
        </div>
        {!ready && (
          <ButtonLink href="/admin/programme" icon="edit" className="min-h-[52px] lg:hidden">
            {programme ? t("finish") : t("updateProgramme")}
          </ButtonLink>
        )}
        {programme && (
          <div className="hidden grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3 lg:grid">
            {programme.items
              .filter((i) => i.roles.length > 0)
              .map((it) => {
                const c = roleCounts(it);
                return (
                  <div key={it.id} className="flex flex-col gap-1 rounded-xl border border-line px-3.5 py-3">
                    <p className="t-caption">{serviceTimeText(it.startTime, locale)}</p>
                    <p className="t-subhead">{itemTitle(it, pt)}</p>
                    <Badge tone={c.filled === c.total ? "success" : "warn"} className="self-start">
                      {t("ofTotal", c)}
                    </Badge>
                  </div>
                );
              })}
          </div>
        )}
      </Card>

      <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[repeat(auto-fit,minmax(300px,1fr))] lg:gap-5">
        <section className="flex flex-col gap-2.5 lg:rounded-2xl lg:border lg:border-line lg:bg-surface lg:p-3.5">
          <h2 className="t-heading hidden lg:block">{t("quickActions")}</h2>
          <div className="grid grid-cols-3 gap-2 lg:flex lg:flex-col">
            {quick
              .filter((q) => q.show)
              .map((q) => (
                <Link
                  key={q.href}
                  href={q.href}
                  className="flex min-h-[88px] flex-col items-center justify-center gap-1.5 rounded-[14px] border border-line bg-surface px-2 py-3 text-center text-[13px] leading-4 font-bold text-ink no-underline lg:min-h-12 lg:flex-row lg:justify-start lg:gap-3 lg:border-0 lg:p-0 lg:text-[15px]"
                >
                  <span className="flex size-9 items-center justify-center rounded-[10px] bg-primary-soft text-primary">
                    <Icon name={q.icon} size={18} />
                  </span>
                  {q.label}
                </Link>
              ))}
          </div>
        </section>

        <Card className="hidden lg:flex">
          <div className="flex items-center">
            <h2 className="t-heading flex-1">{t("liveOnPage")}</h2>
            <Link href="/admin/posts" className="min-h-10 px-3 text-sm font-semibold no-underline">
              {t("manage")}
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b border-line px-2.5 py-2 text-left text-xs font-bold text-ink-3">{t("item")}</th>
                  <th className="border-b border-line px-2.5 py-2 text-left text-xs font-bold text-ink-3">{t("hides")}</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((a) => (
                  <tr key={a.id}>
                    <td className="px-2.5 py-2">
                      <strong>{a.title}</strong>
                      <br />
                      <span className="t-caption">{t("announcement")}</span>
                    </td>
                    <td className="px-2.5 py-2">
                      {a.hideAfter ? formatDate(a.hideAfter, locale, { day: "numeric", month: "short" }) : t("never")}
                    </td>
                  </tr>
                ))}
                {events.map((e) => (
                  <tr key={e.id}>
                    <td className="px-2.5 py-2">
                      <strong>{e.title}</strong>
                      <br />
                      <span className="t-caption">
                        {t("event", { date: formatDate(e.startsAt, locale, { weekday: "short", day: "numeric", month: "short" }) })}
                      </span>
                    </td>
                    <td className="px-2.5 py-2">
                      {e.hideAfter ? formatDate(e.hideAfter, locale, { day: "numeric", month: "short" }) : t("never")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <section className="flex flex-col lg:gap-3 lg:rounded-2xl lg:border lg:border-line lg:bg-surface lg:p-3.5">
          <h2 className="t-subhead pb-0.5 lg:t-heading">{t("recentActivity")}</h2>
          {activity.map((a) => (
            <div key={a.id} className="flex items-start gap-2.5 py-2">
              <span
                className={`mt-[7px] size-2 shrink-0 rounded-full ${a.tone === "accent" ? "bg-accent" : "bg-primary"}`}
              />
              <div className="min-w-0 flex-1">
                <p className="t-small text-ink">
                  {t.rich(`activity.${a.action}`, {
                    actor: a.actor === "you" ? t("you") : a.actor,
                    subject:
                      a.action === "published"
                        ? formatDate(nairobiDate(a.subject), locale, { day: "numeric", month: "short" })
                        : a.subject,
                    b: (c) => <strong>{c}</strong>,
                  })}
                </p>
                <p className="t-caption">{timeAgo(a.at, locale)}</p>
              </div>
            </div>
          ))}
        </section>
      </div>
    </Screen>
  );
}
