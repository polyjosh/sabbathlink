import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PlatformPage } from "@/components/platform/Page";
import { listAudit } from "@/lib/data/platform";
import { requireStaff } from "../guard";
import { AuditList } from "./AuditList";

export async function generateMetadata() {
  return { title: (await getTranslations("platform"))("nav.audit") };
}

/** Action groups staff filter by; each matches audit_log.action by prefix. */
const FILTERS = [
  "all",
  "church",
  "viewed",
  "message",
  "admin",
  "platform_admin",
  "posted",
  "published",
] as const;

export default async function PlatformAudit({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  await requireStaff();
  const t = await getTranslations("platform");
  const { action } = await searchParams;
  const filter = FILTERS.find((f) => f === action) ?? "all";
  // Church admins' own actions ("posted", "published") have no dot; staff actions do ("church.verified").
  const prefix =
    filter === "all"
      ? undefined
      : filter === "posted" || filter === "published"
        ? filter
        : `${filter}.`;
  const entries = await listAudit({ action: prefix });

  return (
    <PlatformPage title={t("nav.audit")} subtitle={t("audit.hint")}>
      <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "all" ? "/platform/audit" : `/platform/audit?action=${f}`}
            aria-current={filter === f ? "true" : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold no-underline ${
              filter === f
                ? "bg-primary text-on-primary"
                : "bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line-strong)]"
            }`}
          >
            {t(`audit.filters.${f}`)}
          </Link>
        ))}
      </div>
      <AuditList entries={entries} />
    </PlatformPage>
  );
}
