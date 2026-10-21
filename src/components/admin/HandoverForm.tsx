"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { handOver } from "@/app/admin/actions";
import { BackButton } from "@/components/shell/BackButton";
import { Screen, TopBar } from "@/components/shell/Screen";
import { Button } from "@/components/ui/Button";
import { RadioCard } from "@/components/ui/controls";

/** For when officers change at year end. Deliberate, and nothing is lost. */
export function HandoverForm({
  candidates,
  myRole,
}: {
  candidates: { id: string; name: string; role: string }[];
  myRole: string;
}) {
  const t = useTranslations("handover");
  const [to, setTo] = useState<string | null>(null);
  const [after, setAfter] = useState<"stay" | "leave">("stay");
  const chosen = candidates.find((c) => c.id === to);
  const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <form action={handOver} className="contents">
      <input type="hidden" name="to" value={to ?? ""} />
      <input type="hidden" name="after" value={after} />
      <Screen
        className="lg:max-w-[640px]"
        top={
          <TopBar>
            <BackButton fallback="/admin/team" />
            <h1 className="t-subhead flex-1">{t("title")}</h1>
          </TopBar>
        }
        footer={
          <>
            <Button type="submit" size="lg" disabled={!chosen}>
              {chosen ? t("cta", { name: chosen.name.split(" ")[0] ?? chosen.name }) : t("chooseFirst")}
            </Button>
          </>
        }
      >
        <p className="t-small">{t("body")}</p>
        <p className="t-label">{t("chooseOwner")}</p>
        <div role="radiogroup" aria-label={t("chooseOwner")} className="flex flex-col gap-2">
          {candidates.map((c) => (
            <RadioCard key={c.id} checked={to === c.id} onSelect={() => setTo(c.id)}>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-extrabold text-primary-soft-ink">
                {initials(c.name)}
              </span>
              <span className="flex-1">
                <span className="block text-[15px] leading-[22px] font-bold">{c.name}</span>
                <span className="t-caption block">{c.role}</span>
              </span>
            </RadioCard>
          ))}
        </div>
        <p className="t-label">{t("after")}</p>
        <div role="radiogroup" aria-label={t("after")} className="flex flex-col gap-2">
          <RadioCard checked={after === "stay"} onSelect={() => setAfter("stay")}>
            <span className="flex-1 text-[15px] font-bold">{t("stayOn", { role: myRole })}</span>
          </RadioCard>
          <RadioCard checked={after === "leave"} onSelect={() => setAfter("leave")}>
            <span className="flex-1 text-[15px] font-bold">{t("leave")}</span>
          </RadioCard>
        </div>
      </Screen>
    </form>
  );
}
