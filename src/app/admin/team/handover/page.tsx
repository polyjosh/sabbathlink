import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { HandoverForm } from "@/components/admin/HandoverForm";
import { getCurrentAdmin, listAdmins } from "@/lib/data";
import { can } from "@/lib/permissions";

export async function generateMetadata() {
  return { title: (await getTranslations("handover"))("title") };
}

export default async function HandoverPage() {
  const me = (await getCurrentAdmin())!;
  if (!can(me, "ownership.handover", me.churchId)) redirect("/admin/team");
  const tr = await getTranslations("adminRoles");
  const candidates = (await listAdmins(me.churchId))
    .filter((a) => a.id !== me.id && a.status === "active" && a.name)
    .map((a) => ({
      id: a.id,
      name: a.name!,
      role: a.role === "communication" ? tr("communicationLeader") : tr(a.role),
    }));
  return <HandoverForm candidates={candidates} myRole={tr(me.role)} />;
}
