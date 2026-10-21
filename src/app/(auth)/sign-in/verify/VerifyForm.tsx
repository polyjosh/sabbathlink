"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { BackButton } from "@/components/shell/BackButton";
import { Screen, TopBar } from "@/components/shell/Screen";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { formatKenyanPhone } from "@/lib/phone";
import { sendCode, verifyCode, type AuthState } from "../../actions";

const RESEND_SECONDS = 60;

/** Six big boxes, SMS autofill where Android allows, and a clear resend timer. */
export function VerifyForm({ phone, next }: { phone: string; next: string }) {
  const t = useTranslations("signIn");
  const [state, action, pending] = useActionState<AuthState, FormData>(verifyCode, null);
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [left, setLeft] = useState(RESEND_SECONDS);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  function fill(index: number, raw: string) {
    const incoming = raw.replace(/\D/g, "");
    const next = [...digits];
    if (incoming.length > 1) {
      // Pasted or autofilled code: spread it across the boxes.
      incoming
        .slice(0, 6 - index)
        .split("")
        .forEach((d, i) => (next[index + i] = d));
    } else {
      next[index] = incoming;
    }
    setDigits(next);
    const firstEmpty = next.findIndex((d) => !d);
    boxes.current[firstEmpty === -1 ? 5 : firstEmpty]?.focus();
    if (next.every(Boolean)) setTimeout(() => formRef.current?.requestSubmit(), 0);
  }

  async function resend() {
    const form = new FormData();
    form.set("phone", phone);
    form.set("next", next);
    setLeft(RESEND_SECONDS);
    await sendCode(null, form).catch(() => {
      // sendCode redirects back to this page on success.
    });
  }

  const time = `0:${String(left).padStart(2, "0")}`;

  return (
    <form ref={formRef} action={action} className="contents">
      <input type="hidden" name="phone" value={phone} />
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="code" value={digits.join("")} />
      <Screen
        top={
          <TopBar>
            <BackButton fallback="/sign-in" />
          </TopBar>
        }
        contentClassName="gap-6"
        footer={
          <Button type="submit" size="lg" className="w-full" disabled={pending || !digits.every(Boolean)}>
            {t("verify")}
          </Button>
        }
      >
        <div className="flex flex-col gap-2">
          <h1 className="t-title">{t("codeTitle")}</h1>
          <p className="t-body text-neutral-ink">
            {t.rich("sentTo", {
              phone: formatKenyanPhone(phone),
              b: (c) => <strong className="text-ink">{c}</strong>,
            })}{" "}
            <Link href="/sign-in" className="font-semibold">
              {t("changeNumber")}
            </Link>
          </p>
        </div>
        <div role="group" aria-label={t("code")} className="flex gap-2">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                boxes.current[i] = el;
              }}
              value={d}
              onChange={(e) => fill(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !d && i > 0) boxes.current[i - 1]?.focus();
              }}
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              autoFocus={i === 0}
              aria-label={t("digit", { n: i + 1 })}
              className="h-14 w-[46px] rounded-xl border-[1.5px] border-field bg-surface text-center text-2xl font-bold text-ink outline-none focus:border-2 focus:border-primary focus:shadow-[0_0_0_4px_var(--primary-soft)]"
            />
          ))}
        </div>
        {state?.error && (
          <p role="alert" className="t-small font-semibold text-danger-ink">
            {state.error === "notConfigured" ? t("notConfigured") : t("codeError")}
          </p>
        )}
        {left > 0 ? (
          <p className="flex items-center gap-2 t-small">
            <Icon name="clock" size={18} />
            <span>{t.rich("resendIn", { time, b: (c) => <strong className="num">{c}</strong> })}</span>
          </p>
        ) : (
          <button type="button" onClick={resend} className="min-h-12 cursor-pointer self-start font-semibold text-primary">
            {t("resend")}
          </button>
        )}
      </Screen>
    </form>
  );
}
