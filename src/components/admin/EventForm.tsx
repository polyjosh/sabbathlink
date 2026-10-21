"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { addEvent } from "@/app/admin/actions";
import { Screen, TopBar } from "@/components/shell/Screen";
import { Button, IconLink } from "@/components/ui/Button";
import { Switch, TextInput } from "@/components/ui/controls";
import { Card } from "@/components/ui/primitives";
import { formatDate } from "@/lib/time";
import type { Locale } from "@/lib/types";

/** Events hide by themselves once they end. Admins can choose a different date. */
export function EventForm({ defaultDate }: { defaultDate: string }) {
  const t = useTranslations("posts");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const [date, setDate] = useState(defaultDate);
  const [ends, setEnds] = useState("17:30");
  const [autoHide, setAutoHide] = useState(true);
  const [custom, setCustom] = useState(false);

  const endLabel = date
    ? formatDate(new Date(`${date}T${ends || "23:59"}:00+03:00`), locale, {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  return (
    <form action={addEvent} className="contents">
      <Screen
        className="lg:max-w-[640px]"
        top={
          <TopBar>
            <IconLink href="/admin/posts" icon="x" label={tc("close")} />
            <h1 className="t-subhead flex-1">{t("newEvent")}</h1>
          </TopBar>
        }
        footer={
          <Button type="submit" className="min-h-[52px]">
            {t("addEvent")}
          </Button>
        }
      >
        <TextInput name="title" label={t("eventName")} placeholder={t("eventPlaceholder")} required maxLength={120} />
        <TextInput name="date" type="date" label={t("date")} value={date} onChange={(e) => setDate(e.target.value)} required />
        <div className="flex items-start gap-2.5">
          <div className="flex-1">
            <TextInput name="starts" type="time" label={t("starts")} defaultValue="14:30" required />
          </div>
          <div className="flex-1">
            <TextInput
              name="ends"
              type="time"
              label={t("ends")}
              optionalLabel={tc("optional")}
              value={ends}
              onChange={(e) => setEnds(e.target.value)}
            />
          </div>
        </div>
        <TextInput name="place" label={t("place")} placeholder={t("placePlaceholder")} maxLength={120} />
        <Card className="gap-1.5 px-3.5 py-3">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] leading-[22px] font-bold">{t("hideWhenEnds")}</p>
              <p className="t-caption">{endLabel}</p>
            </div>
            <Switch
              checked={autoHide && !custom}
              onChange={(v) => {
                setAutoHide(v);
                if (v) setCustom(false);
              }}
              label={t("hideWhenEnds")}
            />
          </div>
          {custom || !autoHide ? (
            <TextInput name="hideDate" type="date" label={t("hideAfter")} defaultValue={date} />
          ) : (
            <button
              type="button"
              onClick={() => setCustom(true)}
              className="min-h-11 cursor-pointer self-start text-sm font-semibold text-primary"
            >
              {t("chooseAnother")}
            </button>
          )}
        </Card>
      </Screen>
    </form>
  );
}
