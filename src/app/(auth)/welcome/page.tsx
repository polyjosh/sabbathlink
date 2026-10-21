import { getTranslations } from "next-intl/server";
import { LanguageToggle } from "@/components/shell/LanguageToggle";
import { Screen, TopBar } from "@/components/shell/Screen";
import { Button, ButtonLink } from "@/components/ui/Button";
import { LogoMark, Wordmark } from "@/components/ui/Logo";
import { LanguageChoice } from "./LanguageChoice";
import { markWelcomed } from "../actions";

/** First run: choose a language, then sign in or browse as a visitor. */
export default async function WelcomePage() {
  const t = await getTranslations("welcome");
  const tc = await getTranslations("common");

  return (
    <Screen
      top={
        <TopBar className="justify-end pr-4">
          <LanguageToggle />
        </TopBar>
      }
      contentClassName="justify-center gap-7 pt-0"
      footer={
        <>
          <ButtonLink href="/sign-in" size="lg" className="w-full">
            {t("signIn")}
          </ButtonLink>
          <form action={markWelcomed} className="contents">
            <Button type="submit" variant="secondary" size="lg" className="mt-1 w-full">
              {t("visitor")}
            </Button>
          </form>
          <ButtonLink href="/register" variant="text" className="mt-1 text-[15px]">
            {t("register")}
          </ButtonLink>
        </>
      }
    >
      <div className="flex flex-col items-start gap-3.5">
        <LogoMark size={64} label="SabbathLink" />
        <div>
          <Wordmark className="text-[30px] leading-9" />
          <p className="text-[15px] font-semibold text-accent-ink">{tc("tagline")}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-[26px] leading-8 font-extrabold tracking-[-0.01em]">{t("title")}</h1>
        <p className="t-body text-neutral-ink">{t("body")}</p>
      </div>
      <LanguageChoice label={t("appLanguage")} />
    </Screen>
  );
}
