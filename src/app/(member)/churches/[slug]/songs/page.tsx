import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SongRequest } from "@/components/songs/SongRequest";
import { EmptyState } from "@/components/ui/primitives";
import { getChurch } from "@/lib/data";
import { getSongView } from "@/lib/data/songs";
import { getFollowing, getSignedInMember } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("songs"))("title") };
}

/** Song Service for members: Now singing and "Request a song". */
export default async function SongsPage({ params }: { params: Promise<{ slug: string }> }) {
  const church = await getChurch((await params).slug);
  if (!church) notFound();
  const t = await getTranslations("songs");
  const view = await getSongView(church.id);
  const following = (await getFollowing()).includes(church.id);

  return (
    <main className="flex flex-1 flex-col gap-3 px-4 pt-4 pb-6">
      <h1 className="t-title">{t("title")}</h1>
      {view ? (
        <SongRequest
          // Remount after following so the request form appears straight away.
          key={String(following)}
          churchId={church.id}
          initial={view}
          signedIn={Boolean(await getSignedInMember())}
          following={following}
          signInHref={`/sign-in?next=${encodeURIComponent(`/churches/${church.slug}/songs`)}`}
          leadHref={`/churches/${church.slug}/songs/lead`}
        />
      ) : (
        <EmptyState icon="music" title={t("notLiveTitle")} className="pt-6">
          <p>{t("unavailable")}</p>
        </EmptyState>
      )}
    </main>
  );
}
