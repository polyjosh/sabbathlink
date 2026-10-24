"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { setChorister } from "@/app/admin/actions";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { PhoneInput, TextInput } from "@/components/ui/controls";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { formatKenyanPhone, maskKenyanPhone } from "@/lib/phone";

interface Chorister {
  name: string;
  phone: string | null;
}

const localDigits = (e164: string | null) => (e164 ? e164.replace(/^\+254/, "") : "");

/**
 * The chorister of the day, chosen with each week's programme. Their phone
 * number links them to their account, so they get the live song list while
 * Song Service runs (an admin starts it on the day).
 */
export function ChoristerCard({
  week,
  initial,
  recent,
}: {
  week: string;
  initial: Chorister | null;
  recent: Chorister[];
}) {
  const t = useTranslations("songsAdmin");
  const tc = useTranslations("common");
  const toast = useToast();
  const [chorister, setValue] = useState(initial);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(localDigits(initial?.phone ?? null));
  const [phoneError, setPhoneError] = useState(false);
  const [pending, start] = useTransition();

  function save(next: { name: string; phone: string }) {
    setPhoneError(false);
    start(async () => {
      const res = await setChorister({ date: week, ...next });
      if ("error" in res) {
        setPhoneError(true);
        return;
      }
      setValue(res.chorister);
      setOpen(false);
      toast({
        message: res.chorister
          ? t("choristerSaved", { name: res.chorister.name })
          : t("choristerRemoved"),
      });
    });
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex min-h-14 w-full cursor-pointer items-center gap-3 px-3.5 py-2 text-left text-ink ${
          chorister ? "" : "bg-warn-tint"
        }`}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary">
          <Icon name="music" size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] leading-[18px] font-semibold text-ink-3">
            {t("chorister")}
          </span>
          {chorister ? (
            <span className="block truncate text-[15px] leading-5 font-bold">
              {chorister.name}
              {chorister.phone && (
                <span className="t-caption font-normal"> · {maskKenyanPhone(chorister.phone)}</span>
              )}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[15px] font-bold text-accent-ink">
              <Icon name="plus" size={18} />
              {t("addChorister")}
            </span>
          )}
        </span>
        <Icon name="right" size={18} className="text-ink-muted" />
      </button>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={t("chorister")}
        closeLabel={tc("close")}
      >
        <p className="t-small">{t("choristerHint")}</p>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            save({ name, phone });
          }}
        >
          <TextInput
            label={t("choristerName")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            required
          />
          <PhoneInput
            label={t("choristerPhone")}
            hint={t("choristerPhoneHint")}
            placeholder="7XX XXX XXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={phoneError ? t("phoneError") : undefined}
          />
          <Button type="submit" disabled={pending || !name.trim()}>
            {t("saveChorister")}
          </Button>
        </form>
        {recent.length > 0 && (
          <>
            <p className="t-overline pt-1.5">{t("recentChoristers")}</p>
            <div className="flex flex-col [&>*+*]:border-t [&>*+*]:border-line-soft">
              {recent.map((r) => (
                <button
                  key={`${r.name}|${r.phone}`}
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setName(r.name);
                    setPhone(localDigits(r.phone));
                    save({ name: r.name, phone: localDigits(r.phone) });
                  }}
                  className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl p-1 text-left text-ink"
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <Icon name="music" size={18} />
                  </span>
                  <span className="flex-1">
                    <span className="t-subhead block">{r.name}</span>
                    {r.phone && (
                      <span className="t-caption block">{formatKenyanPhone(r.phone)}</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
        {chorister && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setName("");
              setPhone("");
              save({ name: "", phone: "" });
            }}
            className="min-h-12 cursor-pointer self-start px-1 font-semibold text-primary"
          >
            {t("removeChorister")}
          </button>
        )}
      </BottomSheet>
    </section>
  );
}
