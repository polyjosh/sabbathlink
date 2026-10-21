import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Facts, PlatformPage, StatusBadge } from "@/components/platform/Page";
import { ReasonForm } from "@/components/platform/ReasonForm";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { TextInput } from "@/components/ui/controls";
import { Badge, Card, GroupHeading } from "@/components/ui/primitives";
import { getChurchDetail, logView } from "@/lib/data/platform";
import { formatKenyanPhone } from "@/lib/phone";
import { itemTitle, type ProgrammeT } from "@/lib/programme";
import { formatDate, serviceTimeText, timeAgo } from "@/lib/time";
import type { Locale } from "@/lib/types";
import * as act from "../../actions";
import { requireStaff } from "../../guard";
import { noticeFrom } from "../../notice";
import { AuditList } from "../../audit/AuditList";

export async function generateMetadata() {
  return { title: (await getTranslations("platform"))("nav.churches") };
}

/** Everything about one church, and the staff actions on it. Opening it is logged. */
export default async function PlatformChurch({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const detail = await getChurchDetail(id);
  if (!detail) notFound();
  await logView("church", id);

  const {
    church: c,
    admins,
    applications,
    announcements,
    events,
    programmes,
    methods,
    changes,
    serviceTimes,
    audit,
  } = detail;
  const t = await getTranslations("platform");
  const ts = await getTranslations("platform.status");
  const tr = await getTranslations("adminRoles");
  const tp = await getTranslations("programme");
  const tw = await getTranslations("weekday");
  const locale = (await getLocale()) as Locale;
  const when = (iso: string) =>
    formatDate(iso, locale, { day: "numeric", month: "short", year: "numeric" });
  const hidden = { church: c.id };

  return (
    <PlatformPage
      notice={await noticeFrom(await searchParams)}
      title={c.name}
      subtitle={[c.town, c.district, c.conference].filter(Boolean).join(" · ")}
      actions={
        c.status !== "rejected" && c.status !== "suspended" ? (
          <Link href={`/churches/${c.slug}`} className="text-sm font-semibold">
            {t("church.publicPage")}
          </Link>
        ) : undefined
      }
    >
      <Card className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={c.status} label={ts(c.status)} />
          {c.givingHidden && <Badge tone="danger">{t("church.givingHiddenBadge")}</Badge>}
          {c.verifiedAt && (
            <span className="t-caption">
              {t("church.verifiedOn", { date: when(c.verifiedAt) })}
            </span>
          )}
        </div>
        {c.statusReason && (
          <p className="t-small">{t("church.reason", { reason: c.statusReason })}</p>
        )}

        <div className="flex flex-col gap-2">
          {c.status === "pending" && (
            <>
              <form action={act.setChurchStatus}>
                <input type="hidden" name="church" value={c.id} />
                <input type="hidden" name="status" value="verified" />
                <Button type="submit" icon="verified">
                  {t("church.verify")}
                </Button>
              </form>
              <p className="t-caption">{t("church.verifyHint")}</p>
              <ReasonForm
                action={act.setChurchStatus}
                hidden={{ ...hidden, status: "rejected" }}
                label={t("church.reject")}
                reasonLabel={t("church.rejectReason")}
                submitLabel={t("church.reject")}
              />
            </>
          )}
          {c.status === "verified" && (
            <ReasonForm
              action={act.setChurchStatus}
              hidden={{ ...hidden, status: "suspended" }}
              label={t("church.suspend")}
              reasonLabel={t("church.suspendReason")}
              submitLabel={t("church.suspend")}
            />
          )}
          {(c.status === "suspended" || c.status === "rejected") && (
            <form action={act.setChurchStatus}>
              <input type="hidden" name="church" value={c.id} />
              <input type="hidden" name="status" value="verified" />
              <Button type="submit" variant="secondary">
                {t("church.reinstate")}
              </Button>
            </form>
          )}
          {c.givingHidden ? (
            <form action={act.setGivingHidden}>
              <input type="hidden" name="church" value={c.id} />
              <input type="hidden" name="hidden" value="false" />
              <Button type="submit" variant="secondary" size="sm">
                {t("church.showGiving")}
              </Button>
            </form>
          ) : (
            <ReasonForm
              action={act.setGivingHidden}
              hidden={{ ...hidden, hidden: "true" }}
              label={t("church.hideGiving")}
              reasonLabel={t("church.hideGivingReason")}
              submitLabel={t("church.hideGiving")}
            />
          )}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex flex-col gap-2">
          <GroupHeading>{t("church.details")}</GroupHeading>
          <Card>
            <Facts
              rows={[
                [t("church.fields.name"), c.name],
                [t("church.fields.district"), c.district],
                [t("church.fields.conference"), c.conference],
                [t("church.fields.town"), [c.town, c.county].filter(Boolean).join(", ")],
                [t("church.fields.landmark"), c.landmark],
                [
                  t("church.fields.location"),
                  c.lat != null && c.lng != null ? (
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lng}#map=17/${c.lat}/${c.lng}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {c.lat.toFixed(5)}, {c.lng.toFixed(5)} · {t("church.openMap")}
                    </a>
                  ) : null,
                ],
                [
                  t("church.fields.serviceTimes"),
                  serviceTimes.length ? (
                    <ul>
                      {serviceTimes.map((s) => (
                        <li key={`${s.kind}-${s.day}-${s.time}`}>
                          {itemTitle({ kind: s.kind, title: s.title }, tp as unknown as ProgrammeT)}{" "}
                          · {tw(s.day)} {serviceTimeText(s.time, locale)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    t("church.noTimes")
                  ),
                ],
                [t("church.fields.kiswahili"), c.kiswahiliService ? t("yes") : t("no")],
                [t("church.fields.created"), when(c.createdAt)],
              ]}
            />
            <details className="[&_summary::-webkit-details-marker]:hidden">
              <summary className="flex min-h-11 cursor-pointer list-none items-center text-[15px] font-semibold text-primary">
                {t("church.edit")}
              </summary>
              <form action={act.updateChurch} className="flex flex-col gap-3 pt-1">
                <input type="hidden" name="church" value={c.id} />
                <TextInput
                  name="name"
                  label={t("church.fields.name")}
                  defaultValue={c.name}
                  required
                  maxLength={120}
                />
                <TextInput
                  name="short_name"
                  label={t("church.fields.shortName")}
                  defaultValue={c.shortName}
                  required
                  maxLength={120}
                />
                <TextInput
                  name="district"
                  label={t("church.fields.district")}
                  defaultValue={c.district}
                  maxLength={120}
                />
                <TextInput
                  name="conference"
                  label={t("church.fields.conference")}
                  defaultValue={c.conference}
                  maxLength={120}
                />
                <TextInput
                  name="town"
                  label={t("church.fields.town")}
                  defaultValue={c.town}
                  maxLength={120}
                />
                <TextInput
                  name="county"
                  label={t("church.fields.county")}
                  defaultValue={c.county}
                  maxLength={120}
                />
                <TextInput
                  name="landmark"
                  label={t("church.fields.landmark")}
                  defaultValue={c.landmark}
                  maxLength={120}
                />
                <label className="flex min-h-11 items-center gap-2.5 text-[15px] font-semibold">
                  <input
                    type="checkbox"
                    name="kiswahili_service"
                    defaultChecked={c.kiswahiliService}
                    className="size-5"
                  />
                  {t("church.fields.kiswahili")}
                </label>
                <Button type="submit" size="sm" className="self-start">
                  {t("save")}
                </Button>
              </form>
            </details>
          </Card>
        </section>

        <section className="flex flex-col gap-2">
          <GroupHeading>{t("church.applications")}</GroupHeading>
          <Card>
            {applications.length === 0 && <p className="t-small">{t("church.noApplication")}</p>}
            {applications.map((a) => (
              <div key={a.id} className="flex flex-col gap-0.5">
                <p className="text-[15px] font-bold">
                  {a.applicant ? (
                    <Link href={`/platform/people/${a.applicant.id}`}>
                      {a.applicant.name ||
                        (a.applicant.phone ? formatKenyanPhone(a.applicant.phone) : "—")}
                    </Link>
                  ) : (
                    "—"
                  )}{" "}
                  · {tr(a.applicantRole)}
                </p>
                <p className="t-caption">
                  {t("church.submitted", { date: when(a.submittedAt) })}
                  {a.decidedAt
                    ? ` · ${t("church.decided", { date: when(a.decidedAt) })}`
                    : ` · ${t("church.undecided")}`}
                </p>
                {a.decisionNote && <p className="t-small">{a.decisionNote}</p>}
                {a.letter ? (
                  a.letter.url ? (
                    <a
                      href={a.letter.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center gap-2 self-start text-[15px] font-semibold"
                    >
                      <Icon name="file" size={18} />
                      {t("church.openLetter")} · {a.letter.name}
                    </a>
                  ) : (
                    <p className="t-caption">{t("church.letterExpired")}</p>
                  )
                ) : (
                  <p className="t-caption">{t("church.noLetter")}</p>
                )}
              </div>
            ))}
          </Card>
        </section>
      </div>

      <section className="flex flex-col gap-2">
        <GroupHeading>{t("church.team")}</GroupHeading>
        <Card className="gap-3">
          {admins.length === 0 && <p className="t-small">{t("church.noTeam")}</p>}
          {admins.map((a) => (
            <div
              key={a.id}
              className="flex flex-col gap-2 border-b border-line-soft pb-3 last:border-0 last:pb-0"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[15px] font-bold">
                  {a.userId ? (
                    <Link href={`/platform/people/${a.userId}`}>
                      {a.name || formatKenyanPhone(a.phone)}
                    </Link>
                  ) : (
                    formatKenyanPhone(a.phone)
                  )}
                </p>
                <Badge>{tr(a.role)}</Badge>
                {a.isOwner && <Badge tone="verified">{tr("owner")}</Badge>}
                {a.status === "invited" && <Badge tone="warn">{t("church.invited")}</Badge>}
              </div>
              <div className="flex flex-wrap gap-2">
                {!a.isOwner && a.status === "active" && (
                  <form action={act.makeOwner}>
                    <input type="hidden" name="admin" value={a.id} />
                    <input type="hidden" name="church" value={c.id} />
                    <Button type="submit" variant="secondary" size="sm">
                      {t("church.makeOwner")}
                    </Button>
                  </form>
                )}
                {!a.isOwner && (
                  <ReasonForm
                    action={act.removeAdmin}
                    hidden={{ admin: a.id, back: `/platform/churches/${c.id}` }}
                    label={t("church.removeAdmin")}
                    reasonLabel={t("reasonLabel")}
                    submitLabel={t("church.removeAdmin")}
                  />
                )}
              </div>
            </div>
          ))}
          <p className="t-caption">{t("church.teamHint")}</p>
        </Card>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex flex-col gap-2">
          <GroupHeading>{t("church.giving")}</GroupHeading>
          <Card>
            {methods.length === 0 && <p className="t-small">{t("church.noGiving")}</p>}
            {methods.map((m) => (
              <p key={m.id} className="text-[15px]">
                <strong>{t(`church.methods.${m.type}`)}</strong>{" "}
                {m.type === "bank"
                  ? `${m.bank_name ?? ""} ${m.bank_account_number ?? ""}`
                  : m.number}{" "}
                · {m.account_name}
              </p>
            ))}
            {changes.length > 0 && (
              <p className="t-caption">
                {t("church.changes", {
                  waiting: changes.filter((x) => !x.approved_at).length,
                  total: changes.length,
                })}
              </p>
            )}
            <p className="t-caption">{t("church.givingHint")}</p>
          </Card>
        </section>

        <section className="flex flex-col gap-2">
          <GroupHeading>{t("church.programmes")}</GroupHeading>
          <Card>
            {programmes.length === 0 && <p className="t-small">{t("church.noProgrammes")}</p>}
            {programmes.map((p) => (
              <p key={p.id} className="text-[15px]">
                {formatDate(`${p.sabbath_date}T12:00:00+03:00`, locale, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}{" "}
                · {p.status === "published" ? t("church.published") : t("church.draft")} ·{" "}
                <span className="t-caption">{timeAgo(p.updated_at, locale)}</span>
              </p>
            ))}
          </Card>
        </section>
      </div>

      <section className="flex flex-col gap-2">
        <GroupHeading>{t("church.posts")}</GroupHeading>
        <Card className="gap-3">
          {announcements.length + events.length === 0 && (
            <p className="t-small">{t("church.noPosts")}</p>
          )}
          {[
            ...announcements.map((a) => ({
              kind: "announcement" as const,
              id: a.id,
              title: a.title,
              at: a.posted_at,
              sub: a.body,
            })),
            ...events.map((e) => ({
              kind: "event" as const,
              id: e.id,
              title: e.title,
              at: e.starts_at,
              sub: e.place,
            })),
          ].map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-1.5 border-b border-line-soft pb-3 last:border-0 last:pb-0"
            >
              <p className="text-[15px] font-bold">
                {p.title} <Badge>{t(`church.kind.${p.kind}`)}</Badge>
              </p>
              <p className="t-caption">
                {when(p.at)} · {p.sub}
              </p>
              <ReasonForm
                action={act.removePost}
                hidden={{ church: c.id, post: p.id, kind: p.kind }}
                label={t("church.removePost")}
                reasonLabel={t("reasonLabel")}
                submitLabel={t("church.removePost")}
              />
            </div>
          ))}
        </Card>
      </section>

      <section className="flex flex-col gap-2">
        <GroupHeading>{t("church.activity")}</GroupHeading>
        <AuditList entries={audit} showChurch={false} />
      </section>
    </PlatformPage>
  );
}
