import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BackButton } from "@/components/shell/BackButton";
import { ChurchNotifyRow, NotificationSwitch } from "@/components/shell/Preferences";
import { Screen, TopBar } from "@/components/shell/Screen";
import { Group, GroupHeading } from "@/components/ui/primitives";
import { getChurchById } from "@/lib/data";
import { getFollowing } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("notifications"))("title") };
}

/** A few plain switches, plus a per-church setting so following many churches stays quiet. */
export default async function NotificationsPage() {
  const t = await getTranslations("notifications");
  const churches = (await Promise.all((await getFollowing()).map(getChurchById))).filter(
    (c) => c !== null,
  );

  return (
    <Screen
      top={
        <TopBar>
          <BackButton fallback="/me" />
          <h1 className="min-w-0 flex-1 text-lg leading-6 font-bold">{t("title")}</h1>
        </TopBar>
      }
    >
      <GroupHeading>{t("tellMeWhen")}</GroupHeading>
      <Group>
        <NotificationSwitch name="programme" label={t("programmePosted")} hint={t("programmePostedHint")} />
        <NotificationSwitch name="posts" label={t("newPosts")} />
        <NotificationSwitch name="reminders" label={t("reminders")} hint={t("remindersHint")} />
        <NotificationSwitch name="giving" label={t("givingChange")} hint={t("givingChangeHint")} />
      </Group>

      {churches.length > 0 && (
        <>
          <GroupHeading>{t("byChurch")}</GroupHeading>
          <Group>
            {churches.map((c) => (
              <ChurchNotifyRow key={c.id} churchId={c.id} name={c.shortName} />
            ))}
          </Group>
        </>
      )}

      <Group>
        <NotificationSwitch name="quiet" label={t("quietHours")} hint={t("quietHoursHint")} />
      </Group>
    </Screen>
  );
}
