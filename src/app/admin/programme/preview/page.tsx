import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PublishPanel } from "@/components/admin/PublishPanel";
import { buildShareMessages } from "@/components/programme/messages.server";
import { getChurchById, getCurrentAdmin, getProgramme } from "@/lib/data";
import { can } from "@/lib/permissions";
import { emptyRoles } from "@/lib/programme";
import { formatDate, nairobiDate, nextSabbath } from "@/lib/time";
import type { Locale } from "@/lib/types";

export async function generateMetadata() {
  return { title: (await getTranslations("editor"))("previewTitle") };
}

export default async function PreviewPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const admin = (await getCurrentAdmin())!;
  if (!can(admin, "programme.edit", admin.churchId)) redirect("/admin");
  const week = (await searchParams).week ?? nextSabbath();
  const church = (await getChurchById(admin.churchId))!;
  const programme = await getProgramme(church.id, week);
  if (!programme) redirect(`/admin/programme?week=${week}`);
  const locale = (await getLocale()) as Locale;
  const messages = await buildShareMessages(church, programme);

  return (
    <PublishPanel
      week={week}
      items={programme.items}
      dateLong={formatDate(nairobiDate(week), locale, { day: "numeric", month: "long" })}
      tbaCount={emptyRoles(programme).length}
      whatsappText={messages[locale].full}
      alreadyPublished={programme.status === "published"}
    />
  );
}
