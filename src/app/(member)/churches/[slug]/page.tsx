import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { FollowButton } from "@/components/church/FollowButton";
import { buildShareMessages } from "@/components/programme/messages.server";
import { ShareProgramme } from "@/components/programme/ShareProgramme";
import { Timeline } from "@/components/programme/Timeline";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { getChurch, getUpcomingProgramme } from "@/lib/data";
import { getFollowing } from "@/lib/session";
import { formatDate, nairobiDate } from "@/lib/time";
import type { Locale } from "@/lib/types";

/** Programme tab: this Sabbath's timeline with WhatsApp sharing. */
export default async function ChurchProgrammePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const church = await getChurch((await params).slug);
  if (!church) notFound();
  const t = await getTranslations("programme");
  const tr = await getTranslations("adminRoles");
  const tw = await getTranslations("weekday");
  const locale = (await getLocale()) as Locale;
  const programme = await getUpcomingProgramme(church.id);

  if (!programme) {
    const following = (await getFollowing()).includes(church.id);
    return (
      <main className="flex flex-1 flex-col items-center px-4 pt-10 pb-4">
        <EmptyState
          icon="cal"
          title={t("notPostedTitle")}
          action={following ? null : <FollowButton churchId={church.id} following={false} size="md" />}
        >
          <p>{t("notPostedBody")}</p>
        </EmptyState>
      </main>
    );
  }

  const updatedDay = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
  })
    .format(new Date(programme.updatedAt))
    .toLowerCase() as "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

  return (
    <>
      <main className="flex flex-1 flex-col gap-3 px-4 pt-4 pb-4">
        <div className="flex flex-col gap-1.5 pb-1">
          <h1 className="t-title">
            {t("sabbathOf", {
              date: formatDate(nairobiDate(programme.sabbathDate), locale, {
                day: "numeric",
                month: "long",
              }),
            })}
          </h1>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="success" icon="check">
              {t("savedOffline")}
            </Badge>
            <span className="t-caption">
              {t("updatedBy", { day: tw(updatedDay), role: tr(programme.updatedByRole) })}
            </span>
          </div>
        </div>
        <Timeline items={programme.items} sunset={programme.sunset} />
      </main>
      <div className="sticky bottom-0 z-20 border-t border-line bg-canvas px-4 pt-3 pb-[18px]">
        <ShareProgramme
          messages={await buildShareMessages(church, programme)}
          defaultLocale={locale}
        />
      </div>
    </>
  );
}
