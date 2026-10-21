import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { GivingDetails } from "@/components/church/GivingDetails";
import { EmptyState } from "@/components/ui/primitives";
import { getChurch, getGiving } from "@/lib/data";

export default async function ChurchGivePage({ params }: { params: Promise<{ slug: string }> }) {
  const church = await getChurch((await params).slug);
  if (!church) notFound();
  const t = await getTranslations("church");
  const tg = await getTranslations("give");
  // getGiving returns null for churches that aren't verified, so no numbers reach this page.
  const giving = await getGiving(church);

  if (!giving) {
    return (
      <main className="flex flex-1 flex-col items-center px-4 pt-10 pb-4">
        <EmptyState icon="shield" tone="amber" title={t("pendingTitle")}>
          <p>{t("pendingBody")}</p>
          <p>{t("pendingBody2")}</p>
        </EmptyState>
      </main>
    );
  }

  if (giving.methods.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center px-4 pt-10 pb-4">
        <EmptyState icon="heart" title={tg("none")} />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-3.5 px-4 pt-3.5 pb-4">
      <GivingDetails methods={giving.methods} categories={giving.categories} />
    </main>
  );
}
