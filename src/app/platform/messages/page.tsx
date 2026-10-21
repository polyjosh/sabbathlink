import { getLocale, getTranslations } from "next-intl/server";
import { PlatformPage } from "@/components/platform/Page";
import { ButtonLink } from "@/components/ui/Button";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { listSentMessages } from "@/lib/data/platform";
import { formatDate } from "@/lib/time";
import type { Locale } from "@/lib/types";
import { requireStaff } from "../guard";
import { noticeFrom } from "../notice";

export async function generateMetadata() {
  return { title: (await getTranslations("platform"))("nav.messages") };
}

export default async function PlatformMessages({
  searchParams,
}: {
  searchParams: Promise<{ done?: string; error?: string }>;
}) {
  await requireStaff();
  const t = await getTranslations("platform");
  const tc = await getTranslations("platform.compose");
  const locale = (await getLocale()) as Locale;
  const messages = await listSentMessages();

  return (
    <PlatformPage
      title={t("nav.messages")}
      subtitle={t("messages.hint")}
      notice={await noticeFrom(await searchParams)}
      actions={
        <ButtonLink href="/platform/messages/new" icon="plus" size="sm">
          {tc("heading")}
        </ButtonLink>
      }
    >
      {messages.length === 0 ? (
        <Card>
          <EmptyState icon="send" title={t("messages.none")} />
        </Card>
      ) : (
        <div className="flex flex-col gap-2.5">
          {messages.map((m) => (
            <Card key={m.id} as="article">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="t-subhead min-w-0 flex-1">{m.title}</h2>
                {m.sendSms && <Badge tone="warn">{t("messages.smsQueued")}</Badge>}
              </div>
              <p className="t-small whitespace-pre-line">{m.body}</p>
              <p className="t-caption">
                {tc(`audiences.${m.audience}`)}
                {m.churchName && ` · ${m.churchName}`} ·{" "}
                {t("messages.recipients", { count: m.recipients })} ·{" "}
                {formatDate(m.sentAt, locale, {
                  day: "numeric",
                  month: "short",
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {m.sender && ` · ${m.sender.name || m.sender.phone}`}
              </p>
            </Card>
          ))}
        </div>
      )}
    </PlatformPage>
  );
}
