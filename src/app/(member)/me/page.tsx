import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { signOut } from "@/app/(auth)/actions";
import { MemberNav } from "@/components/shell/BottomNav";
import { LanguageToggle } from "@/components/shell/LanguageToggle";
import { AppearanceRow, LowDataRow } from "@/components/shell/Preferences";
import { PageTitle, Screen, TopBar } from "@/components/shell/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Avatar, Badge, Card, Group, GroupHeading, IconTile, RowLink } from "@/components/ui/primitives";
import { getChurchById, getCurrentAdmin } from "@/lib/data";
import { formatKenyanPhone } from "@/lib/phone";
import { getFollowing, getSignedInMember } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("me"))("title") };
}

export default async function ProfilePage() {
  const t = await getTranslations("me");
  const member = await getSignedInMember();
  const admin = member ? await getCurrentAdmin() : null;
  const churches = (await Promise.all((await getFollowing()).map(getChurchById))).filter(
    (c) => c !== null,
  );

  return (
    <Screen
      top={
        <TopBar>
          <PageTitle>{t("title")}</PageTitle>
        </TopBar>
      }
      nav={<MemberNav />}
    >
      {member ? (
        <div className="flex items-center gap-3 px-0.5 pt-1 pb-0.5">
          <Avatar initials={member.initials} tone="solid" size="lg" />
          <div className="min-w-0 flex-1">
            <p className="t-subhead">{member.name}</p>
            <p className="t-small">{formatKenyanPhone(member.phone)}</p>
          </div>
          <Link
            href="/me#edit"
            aria-label={t("editProfile")}
            className="inline-flex size-11 items-center justify-center rounded-full text-ink"
          >
            <Icon name="edit" />
          </Link>
        </div>
      ) : (
        <Card className="flex-row items-center gap-3">
          <Avatar initials="?" tone="neutral" />
          <div className="min-w-0 flex-1">
            <p className="t-subhead">{t("visitor")}</p>
            <p className="t-caption">{t("visitorBody")}</p>
          </div>
          <ButtonLink href="/sign-in" size="sm">
            {t("signIn")}
          </ButtonLink>
        </Card>
      )}

      <Group>
        <div className="flex min-h-14 items-center gap-3 px-3.5 py-2">
          <IconTile icon="globe" tone="neutral" />
          <p className="min-w-0 flex-1 text-[15px] leading-5 font-semibold">{t("language")}</p>
          <LanguageToggle full />
        </div>
        <LowDataRow />
        <AppearanceRow />
      </Group>

      <GroupHeading>{t("churchesYouFollow")}</GroupHeading>
      {churches.length > 0 ? (
        <Group>
          {churches.map((c, i) => (
            <RowLink key={c.id} href={`/churches/${c.slug}`}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-[13px] font-extrabold text-primary-soft-ink">
                {c.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] leading-5 font-semibold">{c.shortName}</p>
                {i === 0 && <p className="t-caption">{t("myChurchHint")}</p>}
              </div>
            </RowLink>
          ))}
        </Group>
      ) : (
        <p className="t-small px-1">{t("noneFollowed")}</p>
      )}

      <Group>
        <RowLink href="/me/notifications">
          <IconTile icon="bell" tone="neutral" />
          <p className="min-w-0 flex-1 text-[15px] leading-5 font-semibold">{t("notifications")}</p>
        </RowLink>
        {/* Transfers arrive in Phase 2; the row reserves their place. */}
        <div className="flex min-h-14 items-center gap-3 px-3.5 py-2">
          <IconTile icon="swap" tone="neutral" />
          <p className="min-w-0 flex-1 text-[15px] leading-5 font-semibold">{t("membership")}</p>
          <Badge tone="warn">{(await getTranslations("common"))("soon")}</Badge>
        </div>
        <RowLink href={admin ? "/admin" : "/register"}>
          <IconTile icon="church" tone="neutral" />
          <p className="min-w-0 flex-1 text-[15px] leading-5 font-semibold">
            {admin ? t("manageChurch") : t("registerChurch")}
          </p>
        </RowLink>
      </Group>

      {member && (
        <form action={signOut}>
          <button type="submit" className="min-h-12 cursor-pointer px-1 font-semibold text-primary">
            {t("signOut")}
          </button>
        </form>
      )}
    </Screen>
  );
}
