import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Screen, TopBar } from "@/components/shell/Screen";
import { ButtonLink, IconLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Badge, Card } from "@/components/ui/primitives";
import { getLatestApplication } from "@/lib/data";
import { formatKenyanPhone } from "@/lib/phone";
import { getSignedInMember } from "@/lib/session";
import { formatDate } from "@/lib/time";
import type { Locale } from "@/lib/types";

/** Clear status and what happens next. Admins can start setting up while they wait. */
export default async function PendingPage() {
  const member = await getSignedInMember();
  if (!member) redirect("/sign-in?next=/register");
  const application = await getLatestApplication(member.id);
  if (!application) redirect("/register");
  const t = await getTranslations("register");
  const tc = await getTranslations("common");
  const locale = (await getLocale()) as Locale;

  const step = (state: "done" | "now" | "todo", title: string, sub?: string, last = false) => (
    <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-3">
      <div aria-hidden="true" className="flex flex-col items-center">
        <span
          className={`flex size-6 items-center justify-center rounded-full ${
            state === "done"
              ? "bg-success text-white"
              : state === "now"
                ? "bg-accent shadow-[0_0_0_4px_var(--warn-soft)]"
                : "border-2 border-[#B6C2C1]"
          }`}
        >
          {state === "done" && <Icon name="check" size={14} strokeWidth={2.4} />}
        </span>
        {!last && <span className={`min-h-5 w-0.5 flex-1 ${state === "done" ? "bg-success" : "bg-line-strong"}`} />}
      </div>
      <div className={last ? "" : "pb-3.5"}>
        <p className={`text-[15px] leading-[22px] font-bold ${state === "todo" ? "text-ink-2" : ""}`}>{title}</p>
        {sub && <p className="t-caption">{sub}</p>}
      </div>
    </div>
  );

  return (
    <Screen
      top={
        <TopBar className="justify-end">
          <IconLink href="/" icon="x" label={tc("close")} />
        </TopBar>
      }
      contentClassName="gap-[18px]"
      footer={
        <>
          <ButtonLink href="/admin" size="lg">
            {t("startSetup")}
          </ButtonLink>
          <ButtonLink href="/register" variant="text">
            {t("editSubmitted")}
          </ButtonLink>
        </>
      }
    >
      <div className="flex flex-col items-start gap-2.5">
        <span className="flex size-16 items-center justify-center rounded-full bg-warn-soft text-warn-ink">
          <Icon name="clock" size={30} />
        </span>
        <Badge tone="warn">{tc("verificationPending")}</Badge>
        <h1 className="t-title">{t("pendingTitle")}</h1>
        <p className="t-small">
          {t("pendingSms", { phone: formatKenyanPhone(member.phone), church: application.churchName })}
        </p>
      </div>
      <Card className="gap-0">
        {step(
          "done",
          t("submitted"),
          t("today", { time: formatDate(application.submittedAt, locale, { hour: "numeric", minute: "2-digit" }) }),
        )}
        {step("now", t("underReview"), t("usually"))}
        {step("todo", t("verifiedLive"), undefined, true)}
      </Card>
      <p className="t-small">
        <strong className="text-ink">{t("whileWaitStrong")}</strong> {t("whileWait")}
      </p>
    </Screen>
  );
}
