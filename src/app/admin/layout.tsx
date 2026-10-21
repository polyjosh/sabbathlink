import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getChurchById, getCurrentAdmin } from "@/lib/data";
import { capabilitiesOf } from "@/lib/permissions";
import { getSignedInMember } from "@/lib/session";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · SabbathLink admin" } };

/**
 * Church admin area. Phone first (bottom navigation on each screen); from
 * 1024px a sidebar takes over, as in the tablet/desktop designs.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const member = await getSignedInMember();
  if (!member) redirect("/sign-in");
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/register");
  const church = await getChurchById(admin.churchId);
  if (!church) redirect("/register");
  const tr = await getTranslations("adminRoles");

  return (
    <div className="flex min-h-dvh bg-canvas">
      <AdminSidebar
        church={{ name: church.shortName, initials: church.initials }}
        roleLine={admin.isOwner ? `${tr(admin.role)} · ${tr("owner")}` : tr(admin.role)}
        capabilities={capabilitiesOf(admin)}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
