import type { ReactNode } from "react";
import { Badge, Banner, type BadgeTone } from "@/components/ui/primitives";
import type { ChurchStatus } from "@/lib/types";

/** Content frame for staff pages: wider than the phone screens, still phone-first. */
export function PlatformPage({
  title,
  subtitle,
  actions,
  notice,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  notice?: { tone: "success" | "warn"; text: string } | null;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-[1040px] flex-col gap-4 px-4 pt-4 pb-10">
      {notice && (
        <Banner
          tone={notice.tone}
          icon={notice.tone === "success" ? "check" : "alert"}
          className="rounded-xl"
        >
          {notice.text}
        </Banner>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="t-title">{title}</h1>
          {subtitle && <p className="t-small">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </main>
  );
}

const STATUS_TONE: Record<ChurchStatus, BadgeTone> = {
  verified: "success",
  pending: "warn",
  rejected: "danger",
  suspended: "danger",
};

export function StatusBadge({ status, label }: { status: ChurchStatus; label: string }) {
  return <Badge tone={STATUS_TONE[status]}>{label}</Badge>;
}

/** Two-column label/value rows for detail pages. */
export function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[minmax(0,140px)_minmax(0,1fr)] gap-x-3 gap-y-2 text-[15px] leading-[22px]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="t-caption pt-0.5 font-bold">{k}</dt>
          <dd className="min-w-0 break-words">{v || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
