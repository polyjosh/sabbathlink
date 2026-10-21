import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { EventForm } from "@/components/admin/EventForm";
import { getCurrentAdmin } from "@/lib/data";
import { can } from "@/lib/permissions";
import { addDays, nextSabbath } from "@/lib/time";

export async function generateMetadata() {
  return { title: (await getTranslations("posts"))("newEvent") };
}

export default async function NewEventPage() {
  const admin = await getCurrentAdmin();
  if (!can(admin, "posts.edit", admin?.churchId ?? "")) redirect("/admin");
  return <EventForm defaultDate={addDays(nextSabbath(), 7)} />;
}
