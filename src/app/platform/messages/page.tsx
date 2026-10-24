import { getLocale, getTranslations } from "next-intl/server";
import { PlatformPage } from "@/components/platform/Page";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { listSentMessages } from "@/lib/data/platform";
import { isSmsConfigured } from "@/lib/sms/africastalking";
import { formatDate } from "@/lib/time";
import type { Locale } from "@/lib/types";
import { requireStaff } from "../guard";
import { sendWaitingSms } from "../actions";
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
  const waiting = messages.reduce((n, m) => n + (m.sms?.queued ?? 0), 0);
  const smsReady = isSmsConfigured();

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
      {waiting > 0 && (
        <Card className="flex-row flex-wrap items-center gap-3">
          <p className="t-small min-w-0 flex-1">
            {smsReady ? t("messages.waiting", { count: waiting }) : tc("smsNotReady")}
          </p>
          {smsReady && (
            <form action={sendWaitingSms}>
              <Button type="submit" size="sm" variant="secondary" icon="send">
                {t("messages.sendWaiting")}
              </Button>
            </form>
          )}
        </Card>
      )}
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
                {m.sms && m.sms.queued > 0 && (
                  <Badge tone="warn">{t("messages.smsQueued", { count: m.sms.queued })}</Badge>
                )}
                {m.sms && m.sms.sent > 0 && (
                  <Badge tone="success">{t("messages.smsSent", { count: m.sms.sent })}</Badge>
                )}
                {m.sms && m.sms.failed > 0 && (
                  <Badge tone="danger">{t("messages.smsFailed", { count: m.sms.failed })}</Badge>
                )}
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
