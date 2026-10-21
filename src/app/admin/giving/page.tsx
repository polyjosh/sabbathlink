import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CategoryList } from "@/components/admin/CategoryList";
import { MoveButtons } from "@/components/admin/MoveButtons";
import { AdminNav } from "@/components/shell/BottomNav";
import { BackButton } from "@/components/shell/BackButton";
import { Screen, TopBar } from "@/components/shell/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Banner, EmptyState, Group, GroupHeading, IconTile } from "@/components/ui/primitives";
import { getGivingSettings } from "@/lib/data";
import { can } from "@/lib/permissions";
import { requireCurrentAdmin } from "@/lib/session";

export async function generateMetadata() {
  return { title: (await getTranslations("givingAdmin"))("title") };
}

export default async function GivingSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const admin = await requireCurrentAdmin();
  const t = await getTranslations("givingAdmin");
  const top = (
    <TopBar>
      <BackButton fallback="/admin" />
      <h1 className="t-subhead flex-1">{t("title")}</h1>
    </TopBar>
  );

  // Communication leaders and elders don't see payment settings at all.
  if (!can(admin, "giving.view", admin.churchId)) {
    return (
      <Screen top={top} nav={<AdminNav />} contentClassName="items-center pt-10">
        <EmptyState icon="shield" tone="amber" title={t("title")}>
          <p>{t("noAccess")}</p>
        </EmptyState>
      </Screen>
    );
  }

  const editable = can(admin, "giving.edit", admin.churchId);
  const { methods, categories } = await getGivingSettings(admin.churchId);
  const sent = (await searchParams).sent === "1";

  const summary = (m: (typeof methods)[number]) =>
    m.type === "paybill"
      ? t("paybillSummary", { number: m.number ?? "" })
      : m.type === "till"
        ? t("tillSummary", { number: m.number ?? "" })
        : t("bankSummary", { last4: (m.bankAccountNumber ?? "").replace(/\s/g, "").slice(-4) });
  const name = (m: (typeof methods)[number]) =>
    m.type === "bank"
      ? (m.bankName ?? t("bank"))
      : m.type === "till"
        ? "M-Pesa Till"
        : "M-Pesa Paybill";

  return (
    <Screen
      className="lg:max-w-[720px]"
      top={top}
      banner={
        sent ? (
          <Banner tone="success" icon="check">
            {t("sentForApproval")}
          </Banner>
        ) : null
      }
      nav={<AdminNav />}
    >
      <GroupHeading>{t("methodsOrder")}</GroupHeading>
      <Group>
        {methods.map((m, i) => (
          <div key={m.id} className="flex min-h-16 items-center gap-2 py-1.5 pr-1 pl-1">
            {editable && (
              <MoveButtons
                id={m.id}
                name={name(m)}
                first={i === 0}
                last={i === methods.length - 1}
              />
            )}
            <IconTile
              icon={m.type === "bank" ? "bank" : "mobile"}
              tone={m.type === "bank" ? "teal" : "green"}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] leading-[22px] font-bold">{name(m)}</p>
              <p className="t-caption">{summary(m)}</p>
            </div>
            {editable && (
              <Link
                href={`/admin/giving/${m.id}`}
                aria-label={t("edit", { name: name(m) })}
                className="inline-flex size-11 items-center justify-center rounded-full text-ink"
              >
                <Icon name="edit" size={18} />
              </Link>
            )}
          </div>
        ))}
      </Group>
      {editable && (
        <ButtonLink href="/admin/giving/new" variant="secondary" icon="plus">
          {t("addMethod")}
        </ButtonLink>
      )}

      <GroupHeading>{t("categories")}</GroupHeading>
      <CategoryList categories={categories} editable={editable} />
    </Screen>
  );
}
