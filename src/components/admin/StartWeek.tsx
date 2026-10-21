"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { startProgramme } from "@/app/admin/actions";
import { Screen, TopBar } from "@/components/shell/Screen";
import { BackButton } from "@/components/shell/BackButton";
import { Button } from "@/components/ui/Button";
import { RadioCard } from "@/components/ui/controls";
import { Icon } from "@/components/ui/Icon";
import { WeekSwitcher } from "./WeekSwitcher";

type Mode = "copy" | "times" | "template";

/** A new week opens with last week copied in, so most weeks only a few names change. */
export function StartWeek({
  week,
  title,
  previous,
  weeks,
}: {
  week: string;
  title: string;
  previous: { label: string; items: number; roles: number } | null;
  weeks: { date: string; label: string }[];
}) {
  const t = useTranslations("editor");
  const tn = useTranslations("adminNav");
  const [mode, setMode] = useState<Mode>(previous ? "copy" : "template");
  const [pending, start] = useTransition();

  return (
    <Screen
      className="lg:max-w-[720px]"
      top={
        <TopBar>
          <BackButton fallback="/admin" />
          <p className="t-subhead min-w-0 flex-1">{tn("programme")}</p>
          <div className="hidden pr-2 lg:block">
            <WeekSwitcher weeks={weeks} current={week} />
          </div>
        </TopBar>
      }
      contentClassName="gap-4"
      footer={
        <Button
          size="lg"
          icon="history"
          disabled={pending}
          onClick={() => start(() => startProgramme(week, mode))}
        >
          {mode === "copy" ? t("copyAndStart") : t("startEditing")}
        </Button>
      }
    >
      <div className="flex flex-col gap-1.5">
        <p className="t-overline">{t("nextSabbath")}</p>
        <h1 className="t-title">{title}</h1>
        <p className="t-small">{t("howStart")}</p>
      </div>
      <div role="radiogroup" aria-label={t("startFrom")} className="flex flex-col gap-2">
        {previous && (
          <RadioCard align="start" checked={mode === "copy"} onSelect={() => setMode("copy")}>
            <span className="flex-1">
              <span className="t-subhead block">{t("copyLast", { date: previous.label })}</span>
              <span className="t-small block">
                {t("copyLastHint", { items: previous.items, roles: previous.roles })}
              </span>
            </span>
          </RadioCard>
        )}
        {previous && (
          <RadioCard align="start" checked={mode === "times"} onSelect={() => setMode("times")}>
            <span className="flex-1">
              <span className="t-subhead block">{t("copyTimes")}</span>
              <span className="t-small block">{t("copyTimesHint")}</span>
            </span>
          </RadioCard>
        )}
        <RadioCard align="start" checked={mode === "template"} onSelect={() => setMode("template")}>
          <span className="flex-1">
            <span className="t-subhead block">{t("template")}</span>
            <span className="t-small block">{t("templateHint")}</span>
          </span>
        </RadioCard>
      </div>
      <p className="flex items-center gap-2 t-small">
        <Icon name="info" size={18} />
        {t("nothingPublished")}
      </p>
      <div className="lg:hidden">
        <WeekSwitcher weeks={weeks} current={week} />
      </div>
    </Screen>
  );
}
