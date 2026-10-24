import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BackButton } from "@/components/shell/BackButton";
import { Screen, TopBar } from "@/components/shell/Screen";
import { Banner, Card } from "@/components/ui/primitives";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("privacy"))("title") };
}

/** The privacy notice (Kenya Data Protection Act). Public: people read it before signing in. */
export default async function PrivacyPage() {
  const t = await getTranslations("privacy");
  const sections = t.raw("sections") as { h: string; p: string }[];

  return (
    <Screen
      top={
        <TopBar>
          <BackButton fallback="/me" />
          <h1 className="min-w-0 flex-1 text-lg leading-6 font-bold">{t("title")}</h1>
        </TopBar>
      }
    >
      <Banner tone="warn" icon="alert" className="rounded-xl">
        {t("draft")}
      </Banner>
      <Card as="article" className="gap-4">
        {sections.map((s) => (
          <section key={s.h} className="flex flex-col gap-1">
            <h2 className="t-subhead">{s.h}</h2>
            <p className="t-small text-ink">{s.p}</p>
          </section>
        ))}
        <p className="t-caption">{t("updated")}</p>
      </Card>
    </Screen>
  );
}
