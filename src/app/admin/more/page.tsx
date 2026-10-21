import { getTranslations } from "next-intl/server";
import { AdminNav } from "@/components/shell/BottomNav";
import { Screen, TopBar, PageTitle } from "@/components/shell/Screen";
import { Badge, Group, IconTile, RowLink } from "@/components/ui/primitives";
import { getChurchById, getCurrentAdmin } from "@/lib/data";
import { can } from "@/lib/permissions";

/** Phone "More" tab. Members roll and Transfers (Phase 2) slot in here without a navigation rebuild. */
export default async function AdminMorePage() {
  const admin = (await getCurrentAdmin())!;
  const church = (await getChurchById(admin.churchId))!;
  const t = await getTranslations("adminNav");
  const tc = await getTranslations("common");
  const row = "min-w-0 flex-1 text-[15px] leading-5 font-semibold";

  return (
    <Screen
      top={
        <TopBar>
          <PageTitle>{t("more")}</PageTitle>
        </TopBar>
      }
      nav={<AdminNav />}
    >
      <Group>
        {can(admin, "team.invite", church.id) && (
          <RowLink href="/admin/team">
            <IconTile icon="users" tone="neutral" />
            <p className={row}>{t("team")}</p>
          </RowLink>
        )}
        <RowLink href={`/churches/${church.slug}/about`}>
          <IconTile icon="church" tone="neutral" />
          <p className={row}>{t("churchDetails")}</p>
        </RowLink>
      </Group>
      <Group>
        {[
          { icon: "list" as const, label: t("membersRoll") },
          { icon: "swap" as const, label: t("transfers") },
        ].map((i) => (
          <div key={i.label} className="flex min-h-14 items-center gap-3 px-3.5 py-2">
            <IconTile icon={i.icon} tone="neutral" />
            <p className={row}>{i.label}</p>
            <Badge>{tc("soon")}</Badge>
          </div>
        ))}
      </Group>
      <Group>
        <RowLink href="/">
          <IconTile icon="home" tone="neutral" />
          <p className={row}>{t("memberView")}</p>
        </RowLink>
      </Group>
    </Screen>
  );
}
