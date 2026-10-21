"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, buttonClass } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Chip, Switch } from "@/components/ui/controls";
import { CopyButton } from "@/components/ui/CopyButton";
import { Icon } from "@/components/ui/Icon";
import { whatsappUrl } from "@/lib/programme";
import type { Locale } from "@/lib/types";

export interface ShareMessages {
  /** Message text by language, with and without all roles. */
  en: { short: string; full: string };
  sw: { short: string; full: string };
}

/**
 * Footer actions on the programme page, plus the WhatsApp share sheet with a
 * message preview in either language. Messages are prepared on the server so
 * this component stays small.
 */
export function ShareProgramme({
  messages,
  defaultLocale,
}: {
  messages: ShareMessages;
  defaultLocale: Locale;
}) {
  const t = useTranslations("programme");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Locale>(defaultLocale);
  const [allRoles, setAllRoles] = useState(true);
  const text = useMemo(
    () => (allRoles ? messages[lang].full : messages[lang].short),
    [allRoles, lang, messages],
  );

  return (
    <>
      <div className="flex gap-2">
        <Button variant="share" icon="chat" className="flex-1" onClick={() => setOpen(true)}>
          {t("shareWhatsApp")}
        </Button>
        <CopyButton
          variant="outline"
          value={messages[defaultLocale].full}
          label={t("copyText")}
          toast={t("copied")}
        />
      </div>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={t("shareTitle")}
        closeLabel={tc("close")}
      >
        <div role="group" aria-label={t("messageLanguage")} className="flex gap-2">
          <Chip on={lang === "en"} onClick={() => setLang("en")}>
            English
          </Chip>
          <Chip on={lang === "sw"} onClick={() => setLang("sw")}>
            Kiswahili
          </Chip>
        </div>
        <p
          lang={lang}
          className="rounded-xl bg-share-soft px-3.5 py-3 text-sm leading-5 whitespace-pre-line text-ink"
        >
          {text.replace(/^\*(.*)\*$/m, "$1")}
        </p>
        <div className="flex items-center gap-3">
          <p className="flex-1 text-sm font-semibold">{t("includeAllRoles")}</p>
          <Switch checked={allRoles} onChange={setAllRoles} label={t("includeAllRoles")} />
        </div>
        <a
          href={whatsappUrl(text)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass("share", "lg")}
        >
          <Icon name="chat" />
          {t("openWhatsApp")}
        </a>
        <CopyButton variant="outline" value={text} label={t("copyTextShort")} toast={t("copied")}>
          {t("copyTextShort")}
        </CopyButton>
      </BottomSheet>
    </>
  );
}
