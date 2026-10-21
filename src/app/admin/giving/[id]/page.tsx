import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PaymentMethodForm } from "@/components/admin/PaymentMethodForm";
import { getCurrentAdmin, getGivingSettings } from "@/lib/data";
import { can } from "@/lib/permissions";

export async function generateMetadata() {
  return { title: (await getTranslations("givingAdmin"))("methodTitle") };
}

/** Edit (or, at /admin/giving/new, add) a payment method. Changes wait for a second admin. */
export default async function PaymentMethodPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = (await getCurrentAdmin())!;
  if (!can(admin, "giving.edit", admin.churchId)) redirect("/admin/giving");
  const { id } = await params;
  const { methods, categories } = await getGivingSettings(admin.churchId);
  const method = id === "new" ? null : methods.find((m) => m.id === id);
  if (id !== "new" && !method) notFound();
  return <PaymentMethodForm method={method ?? null} categories={categories.filter((c) => c.enabled)} />;
}
