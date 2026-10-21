import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PlatformPage, StatusBadge } from "@/components/platform/Page";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState, Group, RowLink } from "@/components/ui/primitives";
import { listChurches } from "@/lib/data/platform";
import type { ChurchStatus } from "@/lib/types";
import { requireStaff } from "../guard";

export async function generateMetadata() {
  return { title: (await getTranslations("platform"))("nav.churches") };
}

const FILTERS: (ChurchStatus | "all")[] = ["all", "pending", "verified", "suspended", "rejected"];

export default async function PlatformChurches({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireStaff();
  const t = await getTranslations("platform");
  const ts = await getTranslations("platform.status");
  const sp = await searchParams;
  const status =
    FILTERS.includes(sp.status as ChurchStatus) && sp.status !== "all"
      ? (sp.status as ChurchStatus)
      : undefined;
  const churches = await listChurches({ query: sp.q, status });
  const link = (s: string) => {
    const p = new URLSearchParams();
    if (sp.q) p.set("q", sp.q);
    if (s !== "all") p.set("status", s);
    return `/platform/churches${p.size ? `?${p}` : ""}`;
  };

  return (
    <PlatformPage
      title={t("nav.churches")}
      subtitle={t("churches.count", { count: churches.length })}
    >
      <form className="flex gap-2" role="search">
        {status && <input type="hidden" name="status" value={status} />}
        <input
          name="q"
          defaultValue={sp.q}
          aria-label={t("churches.search")}
          placeholder={t("churches.search")}
          className="min-h-12 min-w-0 flex-1 rounded-xl border-[1.5px] border-field bg-surface px-3.5 text-base outline-none focus:border-primary"
        />
        <Button type="submit" variant="secondary" icon="search">
          {t("search")}
        </Button>
      </form>
      <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
        {FILTERS.map((f) => {
          const on = (status ?? "all") === f;
          return (
            <Link
              key={f}
              href={link(f)}
              aria-current={on ? "true" : undefined}
              className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-semibold no-underline ${
                on
                  ? "bg-primary text-on-primary"
                  : "bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line-strong)]"
              }`}
            >
              {f === "all" ? t("churches.all") : ts(f)}
            </Link>
          );
        })}
      </div>

      {churches.length === 0 ? (
        <Card>
          <EmptyState icon="search" title={t("churches.none")} />
        </Card>
      ) : (
        <Group>
          {churches.map((c) => (
            <RowLink key={c.id} href={`/platform/churches/${c.id}`}>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[15px] leading-5 font-bold">
                  {c.name}
                  <StatusBadge status={c.status} label={ts(c.status)} />
                  {c.givingHidden && (
                    <StatusBadge status="suspended" label={t("church.givingHiddenBadge")} />
                  )}
                </p>
                <p className="t-caption">
                  {[c.town, c.district, c.conference].filter(Boolean).join(" · ")}
                </p>
              </div>
            </RowLink>
          ))}
        </Group>
      )}
    </PlatformPage>
  );
}
