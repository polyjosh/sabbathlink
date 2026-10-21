import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { BackButton } from "@/components/shell/BackButton";
import { MarkInboxRead } from "@/components/shell/MarkInboxRead";
import { Screen, TopBar } from "@/components/shell/Screen";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { listInbox } from "@/lib/data/platform";
import { getSignedInMember } from "@/lib/session";
import { formatDate } from "@/lib/time";
import type { Locale } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("inbox"))("title") };
}

/** Messages from the SabbathLink team (account, verification and safety notices). */
export default async function InboxPage() {
  if (!(await getSignedInMember())) redirect("/sign-in?next=/me/messages");
  const t = await getTranslations("inbox");
  const locale = (await getLocale()) as Locale;
  const messages = await listInbox();
  const unread = messages.some((m) => !m.readAt);

  return (
    <Screen
      top={
        <TopBar>
          <BackButton fallback="/me" />
          <h1 className="min-w-0 flex-1 text-lg leading-6 font-bold">{t("title")}</h1>
        </TopBar>
      }
    >
      {unread && <MarkInboxRead />}
      {messages.length === 0 ? (
        <EmptyState icon="chat" title={t("empty")} className="pt-10">
          <p>{t("emptyBody")}</p>
        </EmptyState>
      ) : (
        messages.map((m) => (
          <Card key={m.id} as="article">
            <div className="flex items-center gap-2">
              <h2 className="t-subhead min-w-0 flex-1">{m.title}</h2>
              {!m.readAt && <Badge tone="warn">{t("new")}</Badge>}
            </div>
            <p className="t-small whitespace-pre-line text-ink">{m.body}</p>
            <p className="t-caption">
              {t("from")} ·{" "}
              {formatDate(m.sentAt, locale, { weekday: "short", day: "numeric", month: "short" })}
            </p>
          </Card>
        ))
      )}
    </Screen>
  );
}
