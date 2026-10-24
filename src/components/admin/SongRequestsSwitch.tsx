"use client";

import { useOptimistic, useTransition } from "react";
import { useTranslations } from "next-intl";
import { setSongRequestsEnabled } from "@/app/admin/actions";
import { Switch } from "@/components/ui/controls";

/** A church can switch song requests off (CLAUDE.md, Phase 1.5 rules). */
export function SongRequestsSwitch({ on }: { on: boolean }) {
  const t = useTranslations("songsAdmin");
  const [value, setValue] = useOptimistic(on);
  const [, start] = useTransition();
  return (
    <div className="flex min-h-14 items-center gap-3">
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{t("enabled")}</span>
        <span className="t-caption block">{value ? t("enabledOn") : t("enabledOff")}</span>
      </span>
      <Switch
        checked={value}
        label={t("enabled")}
        onChange={(next) =>
          start(async () => {
            setValue(next);
            await setSongRequestsEnabled(next);
          })
        }
      />
    </div>
  );
}
