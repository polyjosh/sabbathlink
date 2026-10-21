"use client";

import { useState } from "react";
import { useStoredValue } from "@/lib/useStoredValue";
import { useTranslations } from "next-intl";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { RadioCard, Switch } from "@/components/ui/controls";
import { Icon } from "@/components/ui/Icon";
import { IconTile } from "@/components/ui/primitives";

/*
 * Device preferences. They live in localStorage because they describe this
 * phone (data plan, screen), not the account.
 */

/** Applies Appearance to <html>; the root layout's inline script does the same before first paint. */
function applyTheme(theme: "system" | "light" | "dark") {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

export function LowDataRow() {
  const t = useTranslations("me");
  const [value, setValue] = useStoredValue<"on" | "off">("sl_lowdata", "on");
  return (
    <div className="flex min-h-14 items-center gap-3 px-3.5 py-2">
      <IconTile icon="data" tone="neutral" />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-5 font-semibold">{t("lowData")}</p>
        <p className="t-caption">{t("lowDataHint")}</p>
      </div>
      <Switch checked={value === "on"} onChange={(v) => setValue(v ? "on" : "off")} label={t("lowData")} />
    </div>
  );
}

export function AppearanceRow() {
  const t = useTranslations("me");
  const tc = useTranslations("common");
  const [theme, setTheme] = useStoredValue<"system" | "light" | "dark">("sl_theme", "system");
  const [open, setOpen] = useState(false);


  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-14 w-full cursor-pointer items-center gap-3 px-3.5 py-2 text-left text-ink"
      >
        <IconTile icon="moon" tone="neutral" />
        <p className="min-w-0 flex-1 text-[15px] leading-5 font-semibold">{t("appearance")}</p>
        <p className="t-small">{t(theme)}</p>
        <Icon name="right" size={18} className="text-ink-muted" />
      </button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={t("appearance")} closeLabel={tc("close")}>
        <div role="radiogroup" aria-label={t("appearance")} className="flex flex-col gap-2">
          {(["system", "light", "dark"] as const).map((v) => (
            <RadioCard key={v} checked={theme === v} onSelect={() => {
                setTheme(v);
                applyTheme(v);
              }}>
              <span className="flex-1 font-semibold">{t(v)}</span>
            </RadioCard>
          ))}
        </div>
      </BottomSheet>
    </>
  );
}

type NotifyKey = "programme" | "posts" | "reminders" | "giving" | "quiet";

const DEFAULTS: Record<NotifyKey, boolean> = {
  programme: true,
  posts: true,
  reminders: true,
  giving: true,
  quiet: false,
};

/** Notification switches. Saved on the phone until push delivery is built (Phase 3). */
export function NotificationSwitch({
  name,
  label,
  hint,
}: {
  name: NotifyKey;
  label: string;
  hint?: string;
}) {
  const [value, setValue] = useStoredValue<"on" | "off">(`sl_notify_${name}`, DEFAULTS[name] ? "on" : "off");
  return (
    <div className="flex min-h-14 items-center gap-3 px-3.5 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-5 font-semibold">{label}</p>
        {hint && <p className="t-caption">{hint}</p>}
      </div>
      <Switch checked={value === "on"} onChange={(v) => setValue(v ? "on" : "off")} label={label} />
    </div>
  );
}

export function ChurchNotifyRow({ churchId, name }: { churchId: string; name: string }) {
  const t = useTranslations("notifications");
  const [value, setValue] = useStoredValue<"everything" | "programmeOnly">(
    `sl_notify_church_${churchId}`,
    "everything",
  );
  return (
    <button
      type="button"
      onClick={() => setValue(value === "everything" ? "programmeOnly" : "everything")}
      className="flex min-h-14 w-full cursor-pointer items-center gap-3 px-3.5 py-2 text-left text-ink"
    >
      <p className="min-w-0 flex-1 text-[15px] leading-5 font-semibold">{name}</p>
      <p className="t-small">{t(value)}</p>
      <Icon name="right" size={18} className="text-ink-muted" />
    </button>
  );
}
