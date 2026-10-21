"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { SelectInput, TextArea, TextInput } from "@/components/ui/controls";
import { Card, Note } from "@/components/ui/primitives";
import type { Audience } from "@/lib/data/platform";

/** Compose a staff message. Fields appear only when the chosen audience needs them. */
export function MessageForm({
  action,
  churches,
  person,
  smsReady,
}: {
  action: (form: FormData) => Promise<void>;
  churches: { id: string; name: string }[];
  person: { id: string; label: string } | null;
  smsReady: boolean;
}) {
  const t = useTranslations("platform.compose");
  const [audience, setAudience] = useState<Audience>(person ? "person" : "church_admins");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const audiences: Audience[] = person
    ? ["person"]
    : ["church_admins", "church_followers", "all_admins", "everyone"];

  return (
    <form action={action} className="flex flex-col gap-3.5">
      <Card className="gap-3.5">
        <SelectInput
          name="audience"
          label={t("audience")}
          value={audience}
          onChange={(e) => setAudience(e.target.value as Audience)}
        >
          {audiences.map((a) => (
            <option key={a} value={a}>
              {t(`audiences.${a}`)}
            </option>
          ))}
        </SelectInput>
        {audience === "person" && person && (
          <>
            <input type="hidden" name="user" value={person.id} />
            <p className="t-small">{t("to", { name: person.label })}</p>
          </>
        )}
        {audience.startsWith("church_") && (
          <SelectInput name="church" label={t("church")} required defaultValue="">
            <option value="" disabled>
              {t("chooseChurch")}
            </option>
            {churches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </SelectInput>
        )}
        {audience === "everyone" && (
          <>
            <Note>{t("everyoneWarning")}</Note>
            <TextInput name="confirm" label={t("confirmEveryone")} required autoComplete="off" />
          </>
        )}
      </Card>

      <Card className="gap-3.5">
        <TextInput
          name="title"
          label={t("title")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          required
        />
        <TextArea
          name="body"
          label={t("body")}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={600}
          required
          hint={<span className="block text-right">{t("counter", { count: body.length })}</span>}
        />
        <label className="flex min-h-11 items-start gap-2.5 text-[15px]">
          <input type="checkbox" name="sms" className="mt-1 size-5" />
          <span>
            <span className="block font-semibold">{t("alsoSms")}</span>
            <span className="t-caption block">{smsReady ? t("smsHint") : t("smsNotReady")}</span>
          </span>
        </label>
        <p className="t-caption">{t("serviceOnly")}</p>
      </Card>

      <Button type="submit" size="lg" icon="send" disabled={!title.trim() || !body.trim()}>
        {t("send")}
      </Button>
    </form>
  );
}
