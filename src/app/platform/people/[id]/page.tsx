import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Facts, PlatformPage, StatusBadge } from "@/components/platform/Page";
import { ReasonForm } from "@/components/platform/ReasonForm";
import { Button, ButtonLink, buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Badge, Card, GroupHeading } from "@/components/ui/primitives";
import { getPersonDetail, logView } from "@/lib/data/platform";
import { formatKenyanPhone } from "@/lib/phone";
import { getSignedInMember } from "@/lib/session";
import { formatDate } from "@/lib/time";
import type { Locale } from "@/lib/types";
import * as act from "../../actions";
import { requireStaff } from "../../guard";
import { noticeFrom } from "../../notice";

export async function generateMetadata() {
  return { title: (await getTranslations("platform"))("nav.people") };
}

/** One account: contact options, churches, roles and messages. Opening it is logged. */
export default async function PlatformPerson({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  await requireStaff();
  const { id } = await params;
  const detail = await getPersonDetail(id);
  if (!detail) notFound();
  await logView("person", id);

  const { person: p, follows, roles, messages, isPlatformAdmin } = detail;
  const me = await getSignedInMember();
  const t = await getTranslations("platform");
  const ts = await getTranslations("platform.status");
  const tr = await getTranslations("adminRoles");
  const locale = (await getLocale()) as Locale;
  const when = (iso: string) =>
    formatDate(iso, locale, { day: "numeric", month: "short", year: "numeric" });
  const digits = p.phone?.replace(/^\+/, "") ?? "";

  return (
    <PlatformPage
      notice={await noticeFrom(await searchParams)}
      title={p.name || t("people.noName")}
      subtitle={p.phone ? formatKenyanPhone(p.phone) : undefined}
    >
      <Card className="gap-3">
        <GroupHeading>{t("person.contact")}</GroupHeading>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/platform/messages/new?person=${p.id}`} icon="send" size="sm">
            {t("person.message")}
          </ButtonLink>
          {p.phone && (
            <>
              <a href={`tel:${p.phone}`} className={buttonClass("secondary", "sm")}>
                <Icon name="mobile" size={18} />
                {t("person.call")}
              </a>
              <a href={`sms:${p.phone}`} className={buttonClass("secondary", "sm")}>
                <Icon name="chat" size={18} />
                {t("person.sms")}
              </a>
              <a
                href={`https://wa.me/${digits}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass("share", "sm")}
              >
                {t("person.whatsapp")}
              </a>
            </>
          )}
        </div>
        <p className="t-caption">{t("person.contactHint")}</p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex flex-col gap-2">
          <GroupHeading>{t("person.account")}</GroupHeading>
          <Card>
            <Facts
              rows={[
                [t("person.name"), p.name],
                [t("person.phone"), p.phone ? formatKenyanPhone(p.phone) : ""],
                [t("person.joined"), when(p.createdAt)],
                [t("person.staff"), isPlatformAdmin ? t("yes") : t("no")],
              ]}
            />
            {isPlatformAdmin ? (
              me?.id !== p.id && (
                <form action={act.setPlatformAdmin}>
                  <input type="hidden" name="user" value={p.id} />
                  <input type="hidden" name="on" value="false" />
                  <Button type="submit" variant="danger" size="sm">
                    {t("person.removeStaff")}
                  </Button>
                </form>
              )
            ) : (
              <details className="rounded-xl border border-line [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex min-h-11 cursor-pointer list-none items-center px-3.5 text-[15px] font-semibold text-primary">
                  {t("person.makeStaff")}
                </summary>
                <form action={act.setPlatformAdmin} className="flex flex-col gap-2 px-3.5 pb-3.5">
                  <input type="hidden" name="user" value={p.id} />
                  <input type="hidden" name="on" value="true" />
                  <p className="t-small">{t("person.makeStaffWarning")}</p>
                  <Button type="submit" size="sm" className="self-start">
                    {t("person.makeStaffConfirm")}
                  </Button>
                </form>
              </details>
            )}
          </Card>
        </section>

        <section className="flex flex-col gap-2">
          <GroupHeading>{t("person.roles")}</GroupHeading>
          <Card className="gap-3">
            {roles.length === 0 && <p className="t-small">{t("person.noRoles")}</p>}
            {roles.map((r) => (
              <div key={r.id} className="flex flex-col gap-2">
                <p className="flex flex-wrap items-center gap-2 text-[15px] font-bold">
                  <Link href={`/platform/churches/${r.church.id}`}>{r.church.name}</Link>
                  <Badge>{tr(r.role)}</Badge>
                  {r.isOwner && <Badge tone="verified">{tr("owner")}</Badge>}
                  {r.status === "invited" && <Badge tone="warn">{t("church.invited")}</Badge>}
                </p>
                {!r.isOwner && (
                  <ReasonForm
                    action={act.removeAdmin}
                    hidden={{ admin: r.id, back: `/platform/people/${p.id}` }}
                    label={t("church.removeAdmin")}
                    reasonLabel={t("reasonLabel")}
                    submitLabel={t("church.removeAdmin")}
                  />
                )}
              </div>
            ))}
          </Card>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex flex-col gap-2">
          <GroupHeading>{t("person.follows")}</GroupHeading>
          <Card>
            {follows.length === 0 && <p className="t-small">{t("person.noFollows")}</p>}
            {follows.map((f) => (
              <p key={f.church.id} className="flex flex-wrap items-center gap-2 text-[15px]">
                <Link href={`/platform/churches/${f.church.id}`}>{f.church.name}</Link>
                <StatusBadge status={f.church.status} label={ts(f.church.status)} />
                <span className="t-caption">{t("person.since", { date: when(f.followedAt) })}</span>
              </p>
            ))}
          </Card>
        </section>

        <section className="flex flex-col gap-2">
          <GroupHeading>{t("person.messages")}</GroupHeading>
          <Card>
            {messages.length === 0 && <p className="t-small">{t("person.noMessages")}</p>}
            {messages.map((m) => (
              <p key={m.id} className="text-[15px]">
                <strong>{m.title}</strong>{" "}
                <span className="t-caption">
                  · {when(m.sent_at)} · {m.readAt ? t("person.read") : t("person.unread")}
                  {m.smsStatus !== "none" &&
                    ` · SMS ${t(`smsStatus.${m.smsStatus as "queued" | "sent" | "failed"}`)}`}
                </span>
              </p>
            ))}
          </Card>
        </section>
      </div>
    </PlatformPage>
  );
}
