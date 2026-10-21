import { getLocale, getTranslations } from "next-intl/server";
import { PlatformPage } from "@/components/platform/Page";
import { Button } from "@/components/ui/Button";
import { Badge, Card, EmptyState, Group, RowLink } from "@/components/ui/primitives";
import { listPeople } from "@/lib/data/platform";
import { maskKenyanPhone } from "@/lib/phone";
import { formatDate } from "@/lib/time";
import type { Locale } from "@/lib/types";
import { requireStaff } from "../guard";

export async function generateMetadata() {
  return { title: (await getTranslations("platform"))("nav.people") };
}

/**
 * Accounts, newest first. Phone numbers are masked in the list; the full
 * number shows on the person's page, and opening that page is logged.
 */
export default async function PlatformPeople({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireStaff();
  const t = await getTranslations("platform");
  const locale = (await getLocale()) as Locale;
  const { q } = await searchParams;
  const people = await listPeople(q);

  return (
    <PlatformPage title={t("nav.people")} subtitle={t("people.hint")}>
      <form className="flex gap-2" role="search">
        <input
          name="q"
          defaultValue={q}
          aria-label={t("people.search")}
          placeholder={t("people.search")}
          className="min-h-12 min-w-0 flex-1 rounded-xl border-[1.5px] border-field bg-surface px-3.5 text-base outline-none focus:border-primary"
        />
        <Button type="submit" variant="secondary" icon="search">
          {t("search")}
        </Button>
      </form>
      {people.length === 0 ? (
        <Card>
          <EmptyState icon="search" title={t("people.none")} />
        </Card>
      ) : (
        <Group>
          {people.map((p) => (
            <RowLink key={p.id} href={`/platform/people/${p.id}`}>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-[15px] leading-5 font-bold">
                  {p.name || t("people.noName")}
                  {p.isPlatformAdmin && <Badge tone="verified">{t("people.staff")}</Badge>}
                </p>
                <p className="t-caption">
                  {p.phone ? maskKenyanPhone(p.phone) : "—"} ·{" "}
                  {t("people.joined", {
                    date: formatDate(p.createdAt, locale, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }),
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
