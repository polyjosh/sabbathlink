"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { BackButton } from "@/components/shell/BackButton";
import { LanguageToggle } from "@/components/shell/LanguageToggle";
import { Screen, TopBar } from "@/components/shell/Screen";
import { Button } from "@/components/ui/Button";
import { PhoneInput } from "@/components/ui/controls";
import { Note } from "@/components/ui/primitives";
import { sendCode, type AuthState } from "../actions";

/** Phone number only, with +254 built in. No password to remember. */
export function SignInForm({ devMode, next }: { devMode: boolean; next: string }) {
  const t = useTranslations("signIn");
  const [state, action, pending] = useActionState<AuthState, FormData>(sendCode, null);
  const error =
    state?.error === "phone"
      ? t("phoneError")
      : state?.error === "send"
        ? t("sendError")
        : state?.error === "notConfigured"
          ? t("notConfigured")
          : undefined;

  return (
    <form action={action} className="contents">
      <input type="hidden" name="next" value={next} />
      <Screen
        top={
          <TopBar className="pr-4">
            <BackButton fallback="/welcome" />
            <span className="flex-1" />
            <LanguageToggle />
          </TopBar>
        }
        contentClassName="gap-6"
        footer={
          <>
            <Button type="submit" size="lg" className="w-full" disabled={pending}>
              {t("sendCode")}
            </Button>
            <p className="t-caption text-center">
              {t.rich("agree", {
                terms: (c) => <Link href="/terms">{c}</Link>,
                privacy: (c) => <Link href="/privacy">{c}</Link>,
              })}
            </p>
          </>
        }
      >
        <div className="flex flex-col gap-2">
          <h1 className="t-title">{t("title")}</h1>
          <p className="t-body text-neutral-ink">{t("body")}</p>
        </div>
        <PhoneInput
          name="phone"
          label={t("phone")}
          hint={t("phoneHint")}
          error={error}
          placeholder="712 345 678"
          large
          required
          autoFocus
        />
        {devMode && <Note tone="info">{t("devNote")}</Note>}
      </Screen>
    </form>
  );
}
