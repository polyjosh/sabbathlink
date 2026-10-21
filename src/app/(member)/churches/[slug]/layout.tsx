import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ChurchChrome } from "@/components/church/ChurchChrome";
import { FollowButton } from "@/components/church/FollowButton";
import { ShareLink } from "@/components/church/ShareLink";
import { BackButton } from "@/components/shell/BackButton";
import { OfflineBanner } from "@/components/shell/OfflineBanner";
import { Icon } from "@/components/ui/Icon";
import { Avatar, Badge } from "@/components/ui/primitives";
import { getChurch } from "@/lib/data";
import { SITE_URL } from "@/lib/programme";
import { getFollowing } from "@/lib/session";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const church = await getChurch((await params).slug);
  return { title: church?.name };
}

export default async function ChurchLayout({
  params,
  children,
}: {
  params: Params;
  children: React.ReactNode;
}) {
  const { slug } = await params;
  const church = await getChurch(slug);
  if (!church || church.status === "rejected") notFound();
  const t = await getTranslations("church");
  const tc = await getTranslations("common");
  const following = (await getFollowing()).includes(church.id);
  const verified = church.status === "verified";

  const header = (
    <div className="flex flex-col gap-2.5 px-4 pb-3">
      <div className="flex items-start gap-3">
        <Avatar initials={church.initials} size="lg" tone={verified ? "teal" : "neutral"} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="t-title">{church.name}</h1>
          <p className="t-small">
            {church.district} · {church.conference}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {verified ? (
          <Badge tone="verified" icon="verified">
            {tc("verified")}
          </Badge>
        ) : (
          <Badge tone="warn">{tc("verificationPending")}</Badge>
        )}
        <span className="flex-1" />
        {following && (
          <Link
            href="/me/notifications"
            aria-label={t("notificationsOn")}
            className="inline-flex size-11 items-center justify-center rounded-full bg-surface text-primary shadow-[inset_0_0_0_1px_var(--line-strong)]"
          >
            <Icon name="bell" />
          </Link>
        )}
        <FollowButton churchId={church.id} following={following} size="md" />
      </div>
    </div>
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-canvas">
      <ChurchChrome
        slug={church.slug}
        name={church.shortName}
        back={<BackButton fallback="/churches" />}
        share={
          <ShareLink
            variant="icon"
            title={church.name}
            url={`${SITE_URL}/churches/${church.slug}`}
            label={tc("shareChurch")}
          />
        }
        header={header}
      />
      <OfflineBanner />
      {children}
    </div>
  );
}
