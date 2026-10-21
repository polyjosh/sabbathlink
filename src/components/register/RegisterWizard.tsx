"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { submitApplication } from "@/app/register/actions";
import { Screen, TopBar } from "@/components/shell/Screen";
import { Button, IconButton } from "@/components/ui/Button";
import { Chip, TextInput } from "@/components/ui/controls";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { DEFAULT_CENTRE } from "@/lib/geo";
import { useStoredRaw, writeStored } from "@/lib/useStoredValue";
import type { AdminRole, ItemKind, ServiceTime, Weekday } from "@/lib/types";

const DRAFT_KEY = "sl_register_draft";
const MAX_BYTES = 5 * 1024 * 1024;
const ROLES: AdminRole[] = ["clerk", "communication", "treasurer", "elder"];
const KINDS: Exclude<ItemKind, "custom">[] = ["sabbath_school", "divine_service", "ay", "vespers", "prayer_meeting"];
const DAYS: Weekday[] = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"];

interface Draft {
  step: number;
  name: string;
  district: string;
  conference: string;
  town: string;
  role: AdminRole;
  lat: number;
  lng: number;
  landmark: string;
  times: ServiceTime[];
}

const EMPTY: Draft = {
  step: 1,
  name: "",
  district: "",
  conference: "",
  town: "",
  role: "clerk",
  lat: DEFAULT_CENTRE.lat,
  lng: DEFAULT_CENTRE.lng,
  landmark: "",
  times: [
    { kind: "sabbath_school", day: "sat", time: "08:30" },
    { kind: "divine_service", day: "sat", time: "11:00" },
  ],
};

/**
 * Four short steps with progress at the top. Partial work is saved on the
 * phone, so a clerk can finish later.
 */
export function RegisterWizard({ conferences }: { conferences: string[] }) {
  // A saved draft from this phone; the wizard remounts with it once read.
  const raw = useStoredRaw(DRAFT_KEY);
  let draft = EMPTY;
  try {
    draft = { ...EMPTY, ...(JSON.parse(raw ?? "null") ?? {}) };
  } catch {
    // Unreadable draft: start fresh.
  }
  return <Wizard key={raw ?? ""} initial={draft} conferences={conferences} />;
}

function Wizard({ initial, conferences }: { initial: Draft; conferences: string[] }) {
  const t = useTranslations("register");
  const tc = useTranslations("common");
  const tr = useTranslations("adminRoles");
  const tp = useTranslations("programme");
  const tw = useTranslations("weekday");
  const toast = useToast();
  const router = useRouter();
  const [d, setD] = useState<Draft>(initial);
  const [letter, setLetter] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));
  const persist = (next: Draft) => writeStored(DRAFT_KEY, JSON.stringify(next), true);
  function go(step: number) {
    const next = { ...d, step };
    setD(next);
    persist(next);
    window.scrollTo({ top: 0 });
  }

  async function pick(file: File | undefined) {
    setFileError(null);
    if (!file) return;
    const ready = file.type.startsWith("image/") ? await compressImage(file) : file;
    if (ready.size > MAX_BYTES) {
      setFileError(t("tooLarge"));
      return;
    }
    setLetter(ready);
  }

  function submit() {
    const form = new FormData();
    for (const k of ["name", "district", "conference", "town", "role", "landmark"] as const) form.set(k, d[k]);
    form.set("lat", String(d.lat));
    form.set("lng", String(d.lng));
    form.set("times", JSON.stringify(d.times));
    if (letter) form.set("letter", letter);
    start(async () => {
      // Cleared first: the action redirects on success.
      writeStored(DRAFT_KEY, null, true);
      await submitApplication(form);
    });
  }

  const stepName = (["details", "location", "times", "letter"] as const)[d.step - 1]!;
  const canContinue =
    d.step === 1 ? Boolean(d.name.trim() && d.district.trim() && d.town.trim()) : d.step === 4 ? Boolean(letter) : true;

  const footer =
    d.step === 1 ? (
      <>
        <Button size="lg" disabled={!canContinue} onClick={() => go(2)}>
          {tc("continue")}
        </Button>
        <Button
          variant="text"
          onClick={() => {
            persist(d);
            toast({ message: t("savedDraft") });
            router.push("/me");
          }}
        >
          {t("saveLater")}
        </Button>
      </>
    ) : d.step === 2 ? (
      <Button size="lg" onClick={() => go(3)}>
        {t("confirmLocation")}
      </Button>
    ) : d.step === 3 ? (
      <Button size="lg" onClick={() => go(4)}>
        {tc("continue")}
      </Button>
    ) : (
      <Button size="lg" disabled={!canContinue || pending} onClick={submit}>
        {t("submit")}
      </Button>
    );

  return (
    <Screen
      top={
        <>
          <TopBar>
            {d.step === 1 ? (
              <IconButton icon="x" label={tc("close")} onClick={() => router.push("/")} />
            ) : (
              <IconButton icon="left" label={tc("back")} onClick={() => go(d.step - 1)} />
            )}
            <h1 className="t-subhead flex-1">{t("title")}</h1>
          </TopBar>
          <div className="flex flex-col gap-2 px-4 pb-3">
            <div aria-hidden="true" className="grid grid-cols-4 gap-1.5">
              {[1, 2, 3, 4].map((n) => (
                <span
                  key={n}
                  className={`h-[5px] rounded-sm ${n < d.step ? "bg-primary" : n === d.step ? "bg-accent" : "bg-line-strong"}`}
                />
              ))}
            </div>
            <p className="t-caption">
              <strong className="text-ink">{t("step", { n: d.step })}</strong> · {t(`steps.${stepName}`)}
            </p>
          </div>
        </>
      }
      footer={footer}
    >
      {d.step === 1 && (
        <>
          <TextInput label={t("churchName")} value={d.name} onChange={(e) => set({ name: e.target.value })} required />
          <TextInput label={t("district")} value={d.district} onChange={(e) => set({ district: e.target.value })} required />
          <TextInput
            label={t("conference")}
            list="conferences"
            placeholder={t("chooseConference")}
            value={d.conference}
            onChange={(e) => set({ conference: e.target.value })}
          />
          <datalist id="conferences">
            {conferences.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <TextInput label={t("town")} value={d.town} onChange={(e) => set({ town: e.target.value })} required />
          <div className="flex flex-col gap-1.5">
            <span className="t-label">{t("yourRole")}</span>
            <div role="radiogroup" aria-label={t("yourRole")} className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <Chip key={r} radio on={d.role === r} onClick={() => set({ role: r })}>
                  {tr(r)}
                </Chip>
              ))}
            </div>
          </div>
        </>
      )}

      {d.step === 2 && (
        <>
          <p className="t-small">{t("pinHelp")}</p>
          <LocationPicker lat={d.lat} lng={d.lng} onChange={(lat, lng) => set({ lat, lng })} />
          <TextInput
            label={t("landmark")}
            optionalLabel={tc("optional")}
            hint={t("landmarkHint")}
            value={d.landmark}
            onChange={(e) => set({ landmark: e.target.value })}
          />
        </>
      )}

      {d.step === 3 && (
        <>
          <p className="t-small">{t("timesHelp")}</p>
          {d.times.map((s, i) => {
            const update = (patch: Partial<ServiceTime>) =>
              set({ times: d.times.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
            const select =
              "min-h-12 w-full rounded-xl border-[1.5px] border-field bg-surface px-3 text-base text-ink";
            return (
              <div key={i} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-3">
                <div className="flex items-center gap-2">
                  <select
                    aria-label={t("serviceName")}
                    value={s.kind}
                    onChange={(e) => update({ kind: e.target.value as ItemKind })}
                    className={`${select} flex-1 font-semibold`}
                  >
                    {KINDS.map((k) => (
                      <option key={k} value={k}>
                        {tp(`items.${k}`)}
                      </option>
                    ))}
                  </select>
                  <IconButton
                    icon="trash"
                    iconSize={18}
                    label={t("removeTime", { name: tp(`items.${s.kind as Exclude<ItemKind, "custom">}`) })}
                    onClick={() => set({ times: d.times.filter((_, j) => j !== i) })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select aria-label={t("day")} value={s.day} onChange={(e) => update({ day: e.target.value as Weekday })} className={select}>
                    {DAYS.map((day) => (
                      <option key={day} value={day}>
                        {tw(day)}
                      </option>
                    ))}
                  </select>
                  <input
                    type="time"
                    aria-label={t("time")}
                    value={s.time}
                    onChange={(e) => e.target.value && update({ time: e.target.value })}
                    className={select}
                  />
                </div>
              </div>
            );
          })}
          <Button
            variant="secondary"
            icon="plus"
            onClick={() => set({ times: [...d.times, { kind: "ay", day: "sat", time: "15:00" }] })}
          >
            {t("addTime")}
          </Button>
        </>
      )}

      {d.step === 4 && (
        <>
          <p className="t-small">{t("letterHelp")}</p>
          <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-[#9FB3B5] bg-surface p-[18px] text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Icon name="upload" />
            </span>
            <p className="t-subhead">{t("addLetter")}</p>
            <p className="t-caption">{t("letterTypes")}</p>
            <div className="flex w-full gap-2">
              <Button variant="secondary" icon="camera" className="flex-1 !px-2.5" onClick={() => cameraInput.current?.click()}>
                {t("takePhoto")}
              </Button>
              <Button variant="secondary" icon="file" className="flex-1 !px-2.5" onClick={() => fileInput.current?.click()}>
                {t("chooseFile")}
              </Button>
            </div>
            <input
              ref={cameraInput}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => pick(e.target.files?.[0])}
            />
            <input
              ref={fileInput}
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              hidden
              onChange={(e) => pick(e.target.files?.[0])}
            />
          </div>
          {fileError && (
            <p role="alert" className="t-small font-semibold text-danger-ink">
              {fileError}
            </p>
          )}
          {letter && (
            <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface py-2.5 pr-1.5 pl-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-danger-soft text-[11px] font-extrabold text-danger-ink">
                {letter.type === "application/pdf" ? "PDF" : "IMG"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{letter.name}</p>
                <p className="t-caption">{t("uploaded", { size: `${Math.round(letter.size / 1024)} KB` })}</p>
              </div>
              <IconButton icon="x" iconSize={18} label={t("removeFile")} onClick={() => setLetter(null)} />
            </div>
          )}
          <p className="flex items-center gap-2 text-sm font-semibold text-success-ink">
            <Icon name="check" size={18} />
            {t("doneSummary")}
          </p>
        </>
      )}
    </Screen>
  );
}

/** Move the map under a fixed pin: easier with a thumb than dragging the pin. */
function LocationPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const t = useTranslations("register");
  const toast = useToast();
  const drag = useRef<{ x: number; y: number; lat: number; lng: number } | null>(null);
  // Roughly 1 px = 2 m at this scale.
  const PER_PX = 0.00002;

  return (
    <div
      role="group"
      aria-label={t("mapLabel")}
      className="relative h-[250px] touch-none overflow-hidden rounded-2xl bg-map select-none"
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        drag.current = { x: e.clientX, y: e.clientY, lat, lng };
      }}
      onPointerMove={(e) => {
        const s = drag.current;
        if (!s) return;
        onChange(s.lat + (e.clientY - s.y) * PER_PX, s.lng - (e.clientX - s.x) * PER_PX);
      }}
      onPointerUp={() => (drag.current = null)}
    >
      <div
        aria-hidden="true"
        className="absolute inset-[-200px]"
        style={{
          transform: `translate(${((lng - DEFAULT_CENTRE.lng) / -PER_PX) % 400}px, ${((lat - DEFAULT_CENTRE.lat) / PER_PX) % 400}px)`,
        }}
      >
        <div className="absolute top-[320px] left-0 h-3 w-full -rotate-12 bg-map-road" />
        <div className="absolute top-0 left-[370px] h-full w-3 rotate-[9deg] bg-map-road" />
        <div className="absolute top-[230px] left-[230px] h-[60px] w-[90px] rounded-[14px] bg-map-green" />
      </div>
      <Icon name="pin" size={44} strokeWidth={1.6} className="absolute top-[76px] left-1/2 -translate-x-1/2 fill-accent text-primary" />
      <div className="absolute top-[124px] left-1/2 h-[5px] w-3 -translate-x-1/2 rounded-[50%] bg-[rgba(22,37,42,.3)]" />
      <p className="t-caption absolute top-2 left-2 rounded-md bg-surface/90 px-1.5 num">
        {lat.toFixed(5)}, {lng.toFixed(5)}
      </p>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() =>
          navigator.geolocation?.getCurrentPosition((pos) => {
            onChange(pos.coords.latitude, pos.coords.longitude);
            toast({ message: t("locationFound") });
          })
        }
        className="absolute right-2.5 bottom-2.5 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-surface px-3.5 text-sm font-semibold text-primary shadow-[inset_0_0_0_1.5px_var(--primary)]"
      >
        <Icon name="target" size={18} />
        {t("useLocation")}
      </button>
    </div>
  );
}

/** Shrinks phone photos before upload to save data (max 1600px, JPEG 70%). */
async function compressImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.7));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
  } catch {
    return file;
  }
}
