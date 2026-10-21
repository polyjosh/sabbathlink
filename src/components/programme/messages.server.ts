import "server-only";
import { getTranslations } from "next-intl/server";
import { programmeMessage, SITE_URL, type ProgrammeT } from "@/lib/programme";
import { formatDate, nairobiDate } from "@/lib/time";
import type { Church, Locale, Programme } from "@/lib/types";
import type { ShareMessages } from "./ShareProgramme";

/** Builds the WhatsApp text in both languages for the share sheet. */
export async function buildShareMessages(church: Church, programme: Programme) {
  const url = `${SITE_URL.replace(/^https?:\/\//, "")}/churches/${church.slug}`;
  const build = async (locale: Locale) => {
    const t = await getTranslations({ locale, namespace: "programme" });
    const tc = await getTranslations({ locale, namespace: "common" });
    const dateLabel = formatDate(nairobiDate(programme.sabbathDate), locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    const make = (allRoles: boolean) =>
      programmeMessage({
        churchName: church.name,
        dateLabel,
        items: programme.items,
        locale,
        allRoles,
        url,
        t: t as unknown as ProgrammeT,
        title: (date) => t("waTitle", { date }),
        full: (u) => t("waFull", { url: u }),
        tba: tc("tba"),
      });
    return { short: make(false), full: make(true) };
  };
  const messages: ShareMessages = { en: await build("en"), sw: await build("sw") };
  return messages;
}
