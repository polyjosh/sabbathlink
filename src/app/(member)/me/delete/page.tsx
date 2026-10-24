import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BackButton } from "@/components/shell/BackButton";
import { Screen, TopBar } from "@/components/shell/Screen";
import { Button } from "@/components/ui/Button";
import { Banner, Card } from "@/components/ui/primitives";
import { deleteAccount } from "@/lib/actions";
import { getSignedInMember } from "@/lib/session";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("account"))("deleteTitle") };
}

/** Right to erasure: the person deletes their own account. */
export default async function DeleteAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!isSupabaseConfigured() || !(await getSignedInMember())) redirect("/sign-in?next=/me/delete");
  const t = await getTranslations("account");
  const { error } = await searchParams;
  const deletes = t.raw("deletes") as string[];

  return (
    <Screen
      top={
        <TopBar>
          <BackButton fallback="/me" />
          <h1 className="min-w-0 flex-1 text-lg leading-6 font-bold">{t("deleteTitle")}</h1>
        </TopBar>
      }
    >
      {error && (
        <Banner tone="warn" icon="alert" className="rounded-xl">
          {error === "owner" ? t("ownerError") : t("confirmError")}
        </Banner>
      )}
      <Card className="gap-3">
        <p className="t-body">{t("deleteIntro")}</p>
        <ul className="t-small list-disc pl-5 text-ink">
          {deletes.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
        <p className="t-small">{t("keeps")}</p>
        <form action={deleteAccount} className="flex flex-col gap-3">
          <label className="flex min-h-11 items-center gap-3 text-[15px] font-semibold">
            <input type="checkbox" name="understand" required className="size-5 shrink-0" />
            {t("understand")}
          </label>
          <Button type="submit" variant="danger">
            {t("delete")}
          </Button>
        </form>
      </Card>
    </Screen>
  );
}
