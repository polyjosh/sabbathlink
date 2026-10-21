"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { saveProgramme } from "@/app/admin/actions";
import { BackButton } from "@/components/shell/BackButton";
import { Screen, TopBar } from "@/components/shell/Screen";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/controls";
import { Banner, Note } from "@/components/ui/primitives";
import { whatsappUrl } from "@/lib/programme";
import type { ProgrammeItem } from "@/lib/types";
import { MemberPreview } from "./ProgrammeEditor";

/** The member's view, a gentle note about empty roles (never blocking), then one Publish button. */
export function PublishPanel({
  week,
  items,
  dateLong,
  tbaCount,
  whatsappText,
  alreadyPublished,
}: {
  week: string;
  items: ProgrammeItem[];
  dateLong: string;
  tbaCount: number;
  whatsappText: string;
  alreadyPublished: boolean;
}) {
  const t = useTranslations("editor");
  const router = useRouter();
  const [notify, setNotify] = useState(true);
  const [share, setShare] = useState(true);
  const [published, setPublished] = useState(false);
  const [pending, start] = useTransition();

  function publish() {
    // Open WhatsApp synchronously so the browser doesn't block the pop-up.
    // ("noopener" would make window.open return null, so the opener is cleared by hand.)
    const wa = share ? window.open("about:blank", "_blank") : null;
    if (wa) wa.opener = null;
    start(async () => {
      await saveProgramme({ date: week, items, publish: true });
      // Push notifications to followers arrive in Phase 3; `notify` is recorded for then.
      if (wa) wa.location.href = whatsappUrl(whatsappText);
      setPublished(true);
      router.refresh();
    });
  }

  return (
    <Screen
      className="lg:max-w-[640px]"
      top={
        <TopBar>
          <BackButton fallback={`/admin/programme?week=${week}`} />
          <h1 className="t-subhead flex-1">{t("previewTitle")}</h1>
        </TopBar>
      }
      banner={published ? <Banner tone="success" icon="check">{t("publishedBanner")}</Banner> : null}
      contentClassName="gap-3"
      footer={
        <Button size="lg" icon="send" onClick={publish} disabled={pending}>
          {t("publishProgramme")}
        </Button>
      }
    >
      <MemberPreview items={items} dateLong={dateLong} heading={t("whatMembersSee")} />
      {tbaCount > 0 && <Note>{t("tbaNote", { count: tbaCount })}</Note>}
      {!alreadyPublished && (
        <Checkbox checked={notify} onChange={setNotify} label={t("notifyFollowers")} hint={t("onePush")} />
      )}
      <Checkbox checked={share} onChange={setShare} label={t("thenShare")} hint={t("opensMessage")} />
    </Screen>
  );
}
