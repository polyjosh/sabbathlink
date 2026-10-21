import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { PlatformPage, StatusBadge } from "@/components/platform/Page";
import { Card, EmptyState, Group, RowLink } from "@/components/ui/primitives";
import { getStats, listOpenApplications } from "@/lib/data/platform";
import { formatKenyanPhone } from "@/lib/phone";
import { timeAgo } from "@/lib/time";
import type { Locale } from "@/lib/types";
import { requireStaff } from "./guard";

export async function generateMetadata() {
  return { title: (await getTranslations("platform"))("nav.overview") };
}

/** What needs staff attention first: churches waiting to be verified. */
export default async function PlatformOverview() {
  await requireStaff();
  const t = await getTranslations("platform");
  const ts = await getTranslations("platform.status");
  const tr = await getTranslations("adminRoles");
  const locale = (await getLocale()) as Locale;
  const [stats, applications] = await Promise.all([getStats(), listOpenApplications()]);

  const tiles: { label: string; value: number; href: string; alert?: boolean }[] = [
    {
      label: t("stats.waiting"),
      value: stats.applications,
      href: "/platform/churches?status=pending",
      alert: stats.applications > 0,
    },
    {
      label: t("stats.verified"),
      value: stats.churches.verified ?? 0,
      href: "/platform/churches?status=verified",
    },
    {
      label: t("stats.suspended"),
      value: (stats.churches.suspended ?? 0) + (stats.churches.rejected ?? 0),
      href: "/platform/churches?status=suspended",
    },
    { label: t("stats.accounts"), value: stats.accounts, href: "/platform/people" },
    { label: t("stats.admins"), value: stats.admins, href: "/platform/people" },
    { label: t("stats.paymentChanges"), value: stats.paymentChanges, href: "/platform/churches" },
  ];

  return (
    <PlatformPage title={t("nav.overview")} subtitle={t("overviewHint")}>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {tiles.map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            className={`flex flex-col gap-1 rounded-2xl border bg-surface p-3.5 text-ink no-underline ${
              tile.alert ? "border-accent" : "border-line"
            }`}
          >
            <span className="text-[28px] leading-8 font-extrabold">{tile.value}</span>
            <span className="t-caption font-bold">{tile.label}</span>
          </Link>
        ))}
      </div>

      <h2 className="t-heading">{t("applications.title")}</h2>
      {applications.length === 0 ? (
        <Card>
          <EmptyState icon="check" title={t("applications.none")} />
        </Card>
      ) : (
        <Group>
          {applications.map((a) => (
            <RowLink key={a.id} href={`/platform/churches/${a.church.id}`}>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[15px] leading-5 font-bold">
                  {a.church.name}
                  <StatusBadge status={a.church.status} label={ts(a.church.status)} />
                </p>
                <p className="t-caption">
                  {[a.church.town, a.church.district, a.church.conference]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="t-caption">
                  {t("applications.by", {
                    name:
                      a.applicant?.name ||
                      (a.applicant?.phone ? formatKenyanPhone(a.applicant.phone) : "—"),
                    role: tr(a.applicantRole),
                    ago: timeAgo(a.submittedAt, locale),
                  })}
                </p>
              </div>
            </RowLink>
          ))}
        </Group>
      )}
    </PlatformPage>
  );
}
