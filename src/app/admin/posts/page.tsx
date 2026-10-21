import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { AdminNav } from "@/components/shell/BottomNav";
import { BackButton } from "@/components/shell/BackButton";
import { Screen, TopBar } from "@/components/shell/Screen";
import { ButtonLink } from "@/components/ui/Button";
import { Banner, Card, DateTile, IconTile } from "@/components/ui/primitives";
import { getCurrentAdmin, listAnnouncements, listEvents } from "@/lib/data";
import { can } from "@/lib/permissions";
import { formatDate } from "@/lib/time";
import type { Locale } from "@/lib/types";

export async function generateMetadata() {
  return { title: (await getTranslations("posts"))("title") };
}

export default async function PostsPage({ searchParams }: { searchParams: Promise<{ posted?: string }> }) {
  const admin = (await getCurrentAdmin())!;
  if (!can(admin, "posts.edit", admin.churchId)) redirect("/admin");
  const t = await getTranslations("posts");
  const td = await getTranslations("dashboard");
  const locale = (await getLocale()) as Locale;
  const posted = (await searchParams).posted;
  const [announcements, events] = await Promise.all([
    listAnnouncements(admin.churchId),
    listEvents(admin.churchId),
  ]);
  const short = (iso: string) => formatDate(iso, locale, { day: "numeric", month: "short" });

  return (
    <Screen
      className="lg:max-w-[720px]"
      top={
        <TopBar>
          <BackButton fallback="/admin" />
          <h1 className="t-subhead flex-1">{t("title")}</h1>
        </TopBar>
      }
      banner={
        posted ? (
          <Banner tone="success" icon="check">
            {posted === "event" ? t("eventAdded") : t("posted")}
          </Banner>
        ) : null
      }
      nav={<AdminNav />}
    >
      <div className="grid grid-cols-2 gap-2">
        <ButtonLink href="/admin/posts/announcement" icon="mega" variant="secondary">
          {td("postAnnouncement")}
        </ButtonLink>
        <ButtonLink href="/admin/posts/event" icon="plus" variant="secondary">
          {td("addEvent")}
        </ButtonLink>
      </div>
      <h2 className="t-overline pt-1">{t("live")}</h2>
      {announcements.map((a) => (
        <Card as="article" key={a.id} className="flex-row items-start gap-2.5">
          <IconTile icon="mega" />
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] leading-[22px] font-bold">{a.title}</h3>
            <p className="t-caption">
              {td("announcement")} · {td("hides")}: {a.hideAfter ? short(a.hideAfter) : td("never")}
            </p>
          </div>
        </Card>
      ))}
      {events.map((e) => (
        <div key={e.id} className="flex items-start gap-3">
          <DateTile
            month={formatDate(e.startsAt, locale, { month: "short" })}
            day={formatDate(e.startsAt, locale, { day: "numeric" })}
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] leading-[22px] font-bold">{e.title}</h3>
            <p className="t-caption">
              {e.place} · {td("hides")}: {e.hideAfter ? short(e.hideAfter) : td("never")}
            </p>
          </div>
        </div>
      ))}
    </Screen>
  );
}
