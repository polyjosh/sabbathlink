import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { InviteForm } from "@/components/admin/InviteForm";
import { AdminNav } from "@/components/shell/BottomNav";
import { BackButton } from "@/components/shell/BackButton";
import { Screen, TopBar } from "@/components/shell/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, Group } from "@/components/ui/primitives";
import { listAdmins } from "@/lib/data";
import { can } from "@/lib/permissions";
import { maskKenyanPhone } from "@/lib/phone";
import { formatDate } from "@/lib/time";
import type { Locale } from "@/lib/types";
import { requireCurrentAdmin } from "@/lib/session";

export async function generateMetadata() {
  return { title: (await getTranslations("team"))("title") };
}

/** Roles are named after real church offices. Invite by phone number, right here. */
export default async function TeamPage() {
  const me = await requireCurrentAdmin();
  if (!can(me, "team.invite", me.churchId)) redirect("/admin");
  const t = await getTranslations("team");
  const tr = await getTranslations("adminRoles");
  const locale = (await getLocale()) as Locale;
  const admins = await listAdmins(me.churchId);
  const initials = (n: string | null) =>
    n
      ? n
          .split(/\s+/)
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : "+";

  return (
    <Screen
      className="lg:max-w-[720px]"
      top={
        <TopBar>
          <BackButton fallback="/admin/more" />
          <h1 className="t-subhead flex-1">{t("title")}</h1>
        </TopBar>
      }
      nav={<AdminNav />}
    >
      <Group>
        {admins.map((a) => {
          const role =
            a.role === "communication"
              ? tr("communicationLeader")
              : a.role === "treasurer"
                ? t("treasurerNote")
                : tr(a.role);
          return (
            <div key={a.id} className="flex min-h-16 items-center gap-3 py-2 pr-3.5 pl-3.5">
              <span
                aria-hidden="true"
                className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                  a.id === me.id
                    ? "bg-primary text-on-primary"
                    : a.status === "invited"
                      ? "bg-neutral-soft text-neutral-ink"
                      : "bg-primary-soft text-primary-soft-ink"
                }`}
              >
                {initials(a.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] leading-[22px] font-bold">
                  {a.name ?? maskKenyanPhone(a.phone)}{" "}
                  {a.id === me.id && <span className="t-caption font-normal">{t("you")}</span>}
                </p>
                <p className="t-caption">
                  {a.status === "invited"
                    ? t("invited", {
                        role: tr(a.role),
                        day: formatDate(a.invitedAt ?? new Date().toISOString(), locale, {
                          weekday: "short",
                        }),
                      })
                    : a.isOwner
                      ? t("ownerRole", { role: tr(a.role) })
                      : role}
                </p>
              </div>
              {a.isOwner && <Badge tone="verified">{tr("owner")}</Badge>}
              {a.status === "invited" && <Badge tone="warn">{t("invitedBadge")}</Badge>}
            </div>
          );
        })}
      </Group>

      <InviteForm />

      {can(me, "ownership.handover", me.churchId) && (
        <ButtonLink
          href="/admin/team/handover"
          variant="text"
          icon="swap"
          className="self-start !px-1"
        >
          {t("handoverLink")}
        </ButtonLink>
      )}
    </Screen>
  );
}
