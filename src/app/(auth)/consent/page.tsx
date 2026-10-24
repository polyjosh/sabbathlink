import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LanguageToggle } from "@/components/shell/LanguageToggle";
import { Screen, TopBar } from "@/components/shell/Screen";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { acceptPrivacy } from "@/lib/actions";
import { hasCurrentConsent } from "@/lib/data/account";
import { getSignedInMember } from "@/lib/session";
import { signOut } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("consent"))("title") };
}

/**
 * Explicit consent after sign-in (Data Protection Act: religious affiliation
 * is sensitive data). Shown until the person accepts the current notice.
 */
export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = (await searchParams).next ?? "/";
  if (!(await getSignedInMember())) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  if (await hasCurrentConsent())
    redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
  const t = await getTranslations("consent");
  const points = t.raw("points") as string[];

  return (
    <Screen
      top={
        <TopBar className="justify-end pr-4">
          <LanguageToggle />
        </TopBar>
      }
      contentClassName="gap-5"
      footer={
        <>
          <form action={acceptPrivacy} className="contents">
            <input type="hidden" name="next" value={next} />
            <Button type="submit" size="lg" className="w-full">
              {t("accept")}
            </Button>
          </form>
          <form action={signOut} className="contents">
            <Button type="submit" variant="text" className="mt-1 w-full">
              {t("decline")}
            </Button>
          </form>
        </>
      }
    >
      <h1 className="text-[26px] leading-8 font-extrabold tracking-[-0.01em]">{t("title")}</h1>
      <p className="t-body">{t("intro")}</p>
      <ul className="flex flex-col gap-3">
        {points.map((p) => (
          <li key={p} className="flex gap-2.5">
            <Icon name="check" size={20} className="mt-0.5 shrink-0 text-primary" />
            <span className="t-body">{p}</span>
          </li>
        ))}
      </ul>
      <p className="t-small">{t("rights")}</p>
      <Link href="/privacy" className="self-start text-[15px] font-semibold">
        {t("readFull")}
      </Link>
    </Screen>
  );
}
