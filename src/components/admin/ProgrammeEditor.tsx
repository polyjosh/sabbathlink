"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { saveProgramme } from "@/app/admin/actions";
import { AdminNav } from "@/components/shell/BottomNav";
import { BackButton } from "@/components/shell/BackButton";
import { Screen, TopBar } from "@/components/shell/Screen";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { Icon } from "@/components/ui/Icon";
import { Badge, Banner } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import {
  itemTitle,
  leadRole,
  programmeCounts,
  programmeMessage,
  roleCounts,
  roleLabel,
  shortTime,
  SITE_URL,
  type ProgrammeT,
} from "@/lib/programme";
import { timeAgo } from "@/lib/time";
import type { Locale, ProgrammeItem, ProgrammeRole } from "@/lib/types";
import { WeekSwitcher } from "./WeekSwitcher";

type Recent = Record<string, { name: string; lastOn: string }[]>;
type Picking = { itemId: string; roleId: string } | null;

/**
 * Built for under five minutes on a phone: tap a role, pick a recent name,
 * done. Every change autosaves; Undo is always offered; publishing is never
 * blocked by empty roles (they show "To be announced").
 */
export function ProgrammeEditor({
  week,
  dateShort,
  dateLong,
  churchName,
  churchSlug,
  initialItems,
  initialStatus,
  initialSavedAt,
  recent,
  weeks,
}: {
  week: string;
  dateShort: string;
  dateLong: string;
  churchName: string;
  churchSlug: string;
  initialItems: ProgrammeItem[];
  initialStatus: "draft" | "published";
  initialSavedAt: string;
  recent: Recent;
  weeks: { date: string; label: string }[];
}) {
  const t = useTranslations("editor");
  const tp = useTranslations("programme");
  const tc = useTranslations("common");
  const pt = tp as unknown as ProgrammeT;
  const locale = useLocale() as Locale;
  const router = useRouter();
  const toast = useToast();

  const [items, setItems] = useState(initialItems);
  const [status, setStatus] = useState(initialStatus);
  const [savedAt, setSavedAt] = useState(initialSavedAt);
  const [justSaved, setJustSaved] = useState(false);
  const [open, setOpen] = useState<string | null>(
    () => initialItems.find((i) => roleCounts(i).filled < roleCounts(i).total)?.id ?? initialItems[0]?.id ?? null,
  );
  const [picking, setPicking] = useState<Picking>(null);
  const [publishedBanner, setPublishedBanner] = useState(false);
  const [pending, start] = useTransition();
  const first = useRef(true);

  // Autosave: a short pause after the last change, so nothing is lost if the clerk leaves.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = setTimeout(async () => {
      const res = await saveProgramme({ date: week, items, publish: false });
      setSavedAt(res.savedAt);
      setJustSaved(true);
    }, 700);
    return () => clearTimeout(id);
  }, [items, week]);

  const counts = programmeCounts({ items });

  function setRole(itemId: string, roleId: string, value: string | null, announce = true) {
    const before = items;
    const item = items.find((i) => i.id === itemId);
    const role = item?.roles.find((r) => r.id === roleId);
    if (!item || !role) return;
    setItems((prev) =>
      prev.map((i) =>
        i.id !== itemId ? i : { ...i, roles: i.roles.map((r) => (r.id === roleId ? { ...r, value } : r)) },
      ),
    );
    if (announce) {
      const label = roleLabel(role, pt);
      toast({
        message: value ? t("changedTo", { role: label, name: value }) : t("cleared", { role: label }),
        action: { label: t("undo"), onClick: () => setItems(before) },
      });
    }
  }

  function setItem(itemId: string, patch: Partial<ProgrammeItem>) {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, ...patch } : i)));
  }

  function publishNow() {
    start(async () => {
      const res = await saveProgramme({ date: week, items, publish: true });
      setStatus(res.status);
      setSavedAt(res.savedAt);
      setPublishedBanner(true);
      router.refresh();
    });
  }

  const message = useMemo(
    () =>
      programmeMessage({
        churchName,
        dateLabel: dateShort,
        items,
        locale,
        allRoles: true,
        url: `${SITE_URL.replace(/^https?:\/\//, "")}/churches/${churchSlug}`,
        t: pt,
        title: (date) => tp("waTitle", { date }),
        full: (url) => tp("waFull", { url }),
        tba: tc("tba"),
      }),
    [churchName, churchSlug, dateShort, items, locale, pt, tp, tc],
  );

  const savedLine =
    status === "published"
      ? t("publishedState", { ago: timeAgo(savedAt, locale) })
      : justSaved
        ? t("draftSavedNow")
        : t("draftSaved", { ago: timeAgo(savedAt, locale) });

  const pickItem = picking && items.find((i) => i.id === picking.itemId);
  const pickRole = pickItem && pickItem.roles.find((r) => r.id === picking?.roleId);

  return (
    <>
      {/* ---------- Phone (A3b, A3c) ---------- */}
      <div className="lg:hidden">
        <Screen
          top={
            <>
              <TopBar>
                <BackButton fallback="/admin" />
                <div className="min-w-0 flex-1">
                  <p className="t-subhead">{dateShort}</p>
                  <p className="t-caption" aria-live="polite">
                    {savedLine}
                  </p>
                </div>
              </TopBar>
              <div className="flex items-center gap-2.5 border-b border-line px-4 pb-2.5">
                <div
                  role="progressbar"
                  aria-label={t("rolesFilled")}
                  aria-valuenow={counts.filled}
                  aria-valuemax={counts.total}
                  className="h-1.5 flex-1 overflow-hidden rounded-sm bg-line"
                >
                  <span
                    className="block h-full rounded-sm bg-primary"
                    style={{ width: `${counts.total ? (counts.filled / counts.total) * 100 : 0}%` }}
                  />
                </div>
                <p className="t-caption font-bold text-ink">{t("filled", counts)}</p>
              </div>
            </>
          }
          banner={publishedBanner ? <Banner tone="success" icon="check">{t("publishedBanner")}</Banner> : null}
          contentClassName="gap-2.5 pt-3"
          footer={
            <div className="flex gap-2">
              <ButtonLink href={`/admin/programme/preview?week=${week}`} variant="secondary">
                {t("preview")}
              </ButtonLink>
              <ButtonLink href={`/admin/programme/preview?week=${week}`} className="flex-1">
                {t("publish")}
              </ButtonLink>
            </div>
          }
        >
          {items.map((item) => {
            const c = roleCounts(item);
            const expanded = open === item.id;
            return (
              <section key={item.id} className="overflow-hidden rounded-2xl border border-line bg-surface">
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : item.id)}
                  className="flex min-h-14 w-full cursor-pointer items-center gap-2.5 py-1.5 pr-3 pl-3.5 text-left text-ink"
                >
                  <span className="rounded-lg bg-primary-soft px-2 py-1.5 text-sm font-bold text-primary num">
                    {shortTime(item.startTime, locale)}
                  </span>
                  <span className="t-subhead min-w-0 flex-1">{itemTitle(item, pt)}</span>
                  {c.total > 0 && (
                    <Badge tone={c.filled === c.total ? "success" : "warn"}>
                      {c.filled}/{c.total}
                    </Badge>
                  )}
                  <Icon name="down" size={18} className={`text-ink-muted ${expanded ? "rotate-180" : ""}`} />
                </button>
                {expanded &&
                  item.roles.map((r) => (
                    <RoleRow
                      key={r.id}
                      role={r}
                      label={roleLabel(r, pt)}
                      addLabel={r.optional ? t("optional") : t("addName")}
                      onClick={() => setPicking({ itemId: item.id, roleId: r.id })}
                    />
                  ))}
              </section>
            );
          })}
          <WeekSwitcher weeks={weeks} current={week} />
        </Screen>
        <AdminNav />

        <BottomSheet
          open={Boolean(pickRole)}
          onClose={() => setPicking(null)}
          eyebrow={pickItem ? `${itemTitle(pickItem, pt)} · ${shortTime(pickItem.startTime, locale)}` : undefined}
          title={pickRole ? roleLabel(pickRole, pt) : ""}
          closeLabel={tc("close")}
        >
          {pickItem && pickRole && (
            <RolePicker
              key={pickRole.id}
              role={pickRole}
              recent={recent[pickRole.roleKey] ?? []}
              onPick={(name) => {
                setRole(pickItem.id, pickRole.id, name);
                setPicking(null);
              }}
            />
          )}
        </BottomSheet>
      </div>

      {/* ---------- Tablet / desktop (D2) ---------- */}
      <div className="mx-auto hidden max-w-[1120px] flex-col gap-6 px-6 pt-8 pb-12 lg:flex">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-[26px] leading-8 font-extrabold">{tp("sabbathOf", { date: dateLong })}</h1>
              <Badge tone={status === "published" ? "success" : "neutral"}>{savedLine}</Badge>
            </div>
            <p className="t-small">{churchName}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <WeekSwitcher weeks={weeks} current={week} />
            <Button icon="send" onClick={publishNow} disabled={pending}>
              {t("publish")}
            </Button>
          </div>
        </header>
        {publishedBanner && (
          <Banner tone="success" icon="check" className="rounded-xl">
            {t("publishedBanner")}
          </Banner>
        )}

        <div className="flex flex-wrap items-start gap-6">
          <div className="flex min-w-0 flex-[999_1_480px] flex-col gap-4">
            {items.map((item) => {
              const c = roleCounts(item);
              return (
                <section key={item.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="time"
                      aria-label={t("startTime")}
                      value={item.startTime}
                      onChange={(e) => e.target.value && setItem(item.id, { startTime: e.target.value })}
                      className="min-h-8 rounded-lg bg-primary-soft px-2 py-1.5 text-sm font-bold text-primary-soft-ink num"
                    />
                    <p className="min-w-0 flex-1 text-lg font-extrabold">{itemTitle(item, pt)}</p>
                    {c.total > 0 && (
                      <Badge tone={c.filled === c.total ? "success" : "warn"}>
                        {t("ofTotal", c)}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-x-4 gap-y-3">
                    {item.roles.map((r) => {
                      const id = `${item.id}-${r.id}`;
                      return (
                        <div key={r.id} className="flex flex-col gap-1.5">
                          <label htmlFor={id} className="text-[13px] leading-[18px] font-semibold text-neutral-ink">
                            {roleLabel(r, pt)}
                          </label>
                          <input
                            id={id}
                            list={`recent-${r.roleKey}`}
                            defaultValue={r.value ?? ""}
                            placeholder={r.optional ? t("optional") : t("addName")}
                            onBlur={(e) => {
                              const v = e.target.value.trim() || null;
                              if (v !== r.value) setRole(item.id, r.id, v, false);
                            }}
                            className={`min-h-[46px] w-full rounded-[10px] border-[1.5px] px-3 py-2.5 text-[15px] font-semibold text-ink outline-none focus:border-2 focus:border-primary focus:shadow-[0_0_0_4px_var(--primary-soft)] ${
                              !r.value && !r.optional
                                ? "border-accent bg-warn-tint placeholder:font-semibold placeholder:text-accent-ink"
                                : "border-field bg-surface placeholder:text-ink-muted"
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
            {Object.entries(recent).map(([key, people]) => (
              <datalist key={key} id={`recent-${key}`}>
                {people.map((p) => (
                  <option key={p.name} value={p.name} />
                ))}
              </datalist>
            ))}
            <p className="t-caption">
              {t.rich("kbdHint", {
                kbd: (c) => (
                  <kbd className="rounded-[5px] border border-b-2 border-field bg-surface px-1.5 py-px text-xs font-bold">
                    {c}
                  </kbd>
                ),
              })}
            </p>
          </div>

          <aside aria-label={t("livePreview")} className="sticky top-6 flex min-w-0 flex-[1_1_300px] flex-col gap-3">
            <p className="t-subhead">{t("livePreview")}</p>
            <MemberPreview items={items} dateLong={dateLong} heading={t("asMembersSee")} />
            <CopyButton variant="outline" value={message} label={t("copyWhatsApp")} toast={tp("copied")}>
              {t("copyWhatsApp")}
            </CopyButton>
            <Link href={`/admin/programme/preview?week=${week}`} className="t-small font-semibold">
              {t("preview")}
            </Link>
          </aside>
        </div>
      </div>
    </>
  );
}

function RoleRow({
  role,
  label,
  addLabel,
  onClick,
}: {
  role: ProgrammeRole;
  label: string;
  addLabel: string;
  onClick: () => void;
}) {
  const empty = !role.value;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`grid min-h-[52px] w-full cursor-pointer grid-cols-[104px_minmax(0,1fr)_20px] items-center gap-2 border-t border-line-soft px-3.5 py-1.5 text-left text-ink ${
        empty && !role.optional ? "bg-warn-tint" : ""
      }`}
    >
      <span className="text-[13px] leading-[18px] font-semibold text-ink-3">{label}</span>
      {empty ? (
        <span
          className={`flex items-center gap-1 text-[15px] font-bold ${role.optional ? "font-medium text-ink-2" : "text-accent-ink"}`}
        >
          {!role.optional && <Icon name="plus" size={18} />}
          {addLabel}
        </span>
      ) : (
        <span className="truncate text-[15px] leading-5 font-bold">{role.value}</span>
      )}
      <Icon name="right" size={18} className="text-ink-muted" />
    </button>
  );
}

/** Role picker: recent people first, any typed name accepted. */
function RolePicker({
  role,
  recent,
  onPick,
}: {
  role: ProgrammeRole;
  recent: { name: string; lastOn: string }[];
  onPick: (name: string | null) => void;
}) {
  const t = useTranslations("editor");
  const [q, setQ] = useState("");
  const typed = q.trim();
  const matches = recent.filter((p) => p.name.toLowerCase().includes(typed.toLowerCase()));
  const initials = (n: string) =>
    n
      .replace(/^(Elder|Pr\.|Pastor|Mch\.)\s+/i, "")
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <>
      <label className="flex min-h-[52px] items-center gap-2.5 rounded-xl border-2 border-primary bg-surface px-3.5 shadow-[0_0_0_4px_var(--primary-soft)]">
        <Icon name="search" className="text-ink-2" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && typed && onPick(typed)}
          aria-label={t("typeName")}
          placeholder={role.value ?? t("typeName")}
          className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none"
        />
      </label>
      {typed && !recent.some((p) => p.name.toLowerCase() === typed.toLowerCase()) && (
        <button
          type="button"
          onClick={() => onPick(typed)}
          className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl bg-primary-tint p-1 text-left text-ink"
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-primary text-on-primary">
            <Icon name="plus" size={18} />
          </span>
          <span className="flex-1">
            <span className="t-subhead block">{t("useTyped", { name: typed })}</span>
            <span className="t-caption block">{t("addAsTyped")}</span>
          </span>
        </button>
      )}
      {matches.length > 0 && <p className="t-overline pt-1.5">{t("recentInRole")}</p>}
      <div className="flex flex-col [&>*+*]:border-t [&>*+*]:border-line-soft">
        {matches.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => onPick(p.name)}
            className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl p-1 text-left text-ink"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-sm font-extrabold text-primary-soft-ink">
              {initials(p.name)}
            </span>
            <span className="flex-1">
              <span className="t-subhead block">{p.name}</span>
              <span className="t-caption block">{t("lastOn", { date: p.lastOn })}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="h-px bg-line" />
      <button
        type="button"
        onClick={() => onPick(null)}
        className="min-h-12 cursor-pointer self-start px-1 font-semibold text-primary"
      >
        {t("leaveTba")}
      </button>
    </>
  );
}

/** What members will see: compact rows, empty roles marked "To be announced". */
export function MemberPreview({
  items,
  dateLong,
  heading,
}: {
  items: ProgrammeItem[];
  dateLong: string;
  heading: string;
}) {
  const tp = useTranslations("programme");
  const tc = useTranslations("common");
  const pt = tp as unknown as ProgrammeT;
  const locale = useLocale() as Locale;
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-canvas p-3 lg:rounded-3xl lg:px-4 lg:py-[18px]">
      <p className="t-caption font-bold text-primary">{heading}</p>
      <p className="t-subhead">{tp("sabbathOf", { date: dateLong })}</p>
      {items.map((it) => {
        const lead = leadRole(it);
        const rest = it.roles.filter((r) => r !== lead && r.roleKey !== "sermon_title" && (r.value || !r.optional));
        return (
          <div
            key={it.id}
            className="grid grid-cols-[44px_minmax(0,1fr)] gap-2 rounded-xl border border-line bg-surface px-2.5 py-2 text-[13px] leading-[18px]"
          >
            <b className="num">{shortTime(it.startTime, locale)}</b>
            <span>
              <strong>{itemTitle(it, pt)}</strong>
              {lead && (
                <>
                  {" · "}
                  {lead.value ?? <span className="text-accent-ink italic">{tc("tba")}</span>}
                </>
              )}
              {rest.map((r) => (
                <span key={r.id} className="block">
                  {roleLabel(r, pt)}:{" "}
                  {r.value ?? <span className="text-accent-ink italic">{tc("tba")}</span>}
                </span>
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
}
