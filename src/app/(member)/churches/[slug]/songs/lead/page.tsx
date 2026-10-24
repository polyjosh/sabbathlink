import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SongLeader } from "@/components/songs/SongLeader";
import { getChurch } from "@/lib/data";
import { getSongView } from "@/lib/data/songs";
import { getSignedInMember } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("songs"))("leadTitle") };
}

/**
 * The live list for the chorister of the day (and the church's programme
 * admins). The database decides who may lead; others see an explanation.
 */
export default async function SongLeadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(await getSignedInMember()))
    redirect(`/sign-in?next=${encodeURIComponent(`/churches/${slug}/songs/lead`)}`);
  const church = await getChurch(slug);
  if (!church) notFound();
  const view = await getSongView(church.id);
  if (!view) notFound();
  const t = await getTranslations("songs");

  return (
    <main className="flex flex-1 flex-col gap-3 px-4 pt-4 pb-6">
      <h1 className="t-title">{t("leadTitle")}</h1>
      <SongLeader churchId={church.id} initial={view} />
    </main>
  );
}
