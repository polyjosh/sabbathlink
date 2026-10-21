"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { postAnnouncement } from "@/app/admin/actions";
import { Screen, TopBar } from "@/components/shell/Screen";
import { Button, IconLink } from "@/components/ui/Button";
import { Switch, TextArea, TextInput } from "@/components/ui/controls";
import { Card } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { useStoredRaw, writeStored } from "@/lib/useStoredValue";

const DRAFT_KEY = "sl_announcement_draft";

/** A title, a message, and an optional "hide after" date, so old notices never pile up. */
export function AnnouncementForm({ defaultHideAfter }: { defaultHideAfter: string }) {
  // An unsent draft saved on this phone; the form remounts with it once read.
  const raw = useStoredRaw(DRAFT_KEY);
  return <Form key={raw ?? ""} draft={parseDraft(raw)} defaultHideAfter={defaultHideAfter} />;
}

function parseDraft(raw: string | null): { title: string; body: string } {
  try {
    const d = JSON.parse(raw ?? "null");
    return { title: String(d?.title ?? ""), body: String(d?.body ?? "") };
  } catch {
    return { title: "", body: "" };
  }
}

function Form({
  draft,
  defaultHideAfter,
}: {
  draft: { title: string; body: string };
  defaultHideAfter: string;
}) {
  const t = useTranslations("posts");
  const tc = useTranslations("common");
  const toast = useToast();
  const [title, setTitle] = useState(draft.title);
  const [body, setBody] = useState(draft.body);
  const [hideOn, setHideOn] = useState(true);
  const [notify, setNotify] = useState(true);

  function saveDraft() {
    toast({ message: t("draftSaved") });
    writeStored(DRAFT_KEY, JSON.stringify({ title, body }), true);
  }

  return (
    <form
      action={async (form) => {
        // Cleared first: the action redirects on success.
        writeStored(DRAFT_KEY, null, true);
        await postAnnouncement(form);
      }}
      className="contents"
    >
      <Screen
        className="lg:max-w-[640px]"
        top={
          <TopBar>
            <IconLink href="/admin/posts" icon="x" label={tc("close")} />
            <h1 className="t-subhead flex-1">{t("newAnnouncement")}</h1>
          </TopBar>
        }
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={saveDraft}>
              {t("saveDraft")}
            </Button>
            <Button type="submit" className="flex-1" disabled={!title.trim() || !body.trim()}>
              {t("postNow")}
            </Button>
          </div>
        }
      >
        <TextInput
          name="title"
          label={t("titleLabel")}
          placeholder={t("titlePlaceholder")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          required
        />
        <TextArea
          name="body"
          label={t("message")}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={500}
          required
          hint={<span className="block text-right">{t("counter", { count: body.length })}</span>}
        />
        <Card className="gap-3">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] leading-[22px] font-bold">{t("hideAfterDate")}</p>
              <p className="t-caption">{t("hideAfterHint")}</p>
            </div>
            <Switch checked={hideOn} onChange={setHideOn} label={t("hideAfterDate")} />
          </div>
          {hideOn && (
            <>
              <input type="hidden" name="hideAfterOn" value="on" />
              <TextInput name="hideAfter" type="date" label={t("hideAfter")} defaultValue={defaultHideAfter} />
            </>
          )}
        </Card>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] leading-[22px] font-bold">{t("notifyFollowers")}</p>
            <p className="t-caption">{t("pushHint")}</p>
          </div>
          <Switch checked={notify} onChange={setNotify} label={t("notifyFollowers")} />
          <input type="hidden" name="notify" value={notify ? "on" : "off"} />
        </div>
      </Screen>
    </form>
  );
}
