import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AnnouncementForm } from "@/components/admin/AnnouncementForm";
import { getCurrentAdmin } from "@/lib/data";
import { can } from "@/lib/permissions";
import { nextSabbath } from "@/lib/time";

export async function generateMetadata() {
  return { title: (await getTranslations("posts"))("newAnnouncement") };
}

export default async function NewAnnouncementPage() {
  const admin = await getCurrentAdmin();
  if (!can(admin, "posts.edit", admin?.churchId ?? "")) redirect("/admin");
  // Most notices are about the coming Sabbath, so that's the default hide date.
  return <AnnouncementForm defaultHideAfter={nextSabbath()} />;
}
