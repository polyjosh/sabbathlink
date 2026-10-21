import { serviceTime } from "./time";
import type { ItemKind, Locale, Programme, ProgrammeItem, ProgrammeRole, RoleKey } from "./types";

type KnownItem = Exclude<ItemKind, "custom">;
type KnownRole = Exclude<RoleKey, "custom">;

/** A translator scoped to the "programme" namespace. */
export type ProgrammeT = (key: `items.${KnownItem}` | `roles.${KnownRole}`) => string;

export function itemTitle(item: Pick<ProgrammeItem, "kind" | "title">, t: ProgrammeT) {
  return item.kind === "custom" ? (item.title ?? "") : t(`items.${item.kind}`);
}

export function roleLabel(role: Pick<ProgrammeRole, "roleKey" | "label">, t: ProgrammeT) {
  return role.roleKey === "custom" ? (role.label ?? "") : t(`roles.${role.roleKey}`);
}

/** The person members look for first in each part of the service. */
const LEAD_ROLE: Partial<Record<ItemKind, RoleKey>> = {
  sabbath_school: "superintendent",
  divine_service: "preacher",
  ay: "leader",
};

export function leadRole(item: ProgrammeItem): ProgrammeRole | undefined {
  const key = LEAD_ROLE[item.kind];
  return item.roles.find((r) => r.roleKey === key) ?? item.roles.find((r) => r.value);
}

const isRequired = (r: ProgrammeRole) => !r.optional;

export function roleCounts(item: ProgrammeItem) {
  const required = item.roles.filter(isRequired);
  return { filled: required.filter((r) => r.value).length, total: required.length };
}

export function programmeCounts(p: Pick<Programme, "items">) {
  return p.items.reduce(
    (acc, it) => {
      const c = roleCounts(it);
      return { filled: acc.filled + c.filled, total: acc.total + c.total };
    },
    { filled: 0, total: 0 },
  );
}

export function emptyRoles(p: Pick<Programme, "items">) {
  return p.items.flatMap((it) => it.roles.filter((r) => isRequired(r) && !r.value));
}

/** Short time for timelines and messages: "8:30" (EN) or "2:30" (SW time). */
export function shortTime(hm: string, locale: Locale) {
  return serviceTime(hm, locale).time;
}

/**
 * The WhatsApp message. Short enough to read in a church group, with a link
 * to the full programme.
 */
export function programmeMessage(opts: {
  churchName: string;
  dateLabel: string;
  items: ProgrammeItem[];
  locale: Locale;
  allRoles: boolean;
  url: string;
  t: ProgrammeT;
  title: (date: string) => string;
  full: (url: string) => string;
  tba: string;
}) {
  const lines = [`*${opts.churchName}*`, opts.title(opts.dateLabel), ""];
  for (const item of opts.items) {
    const lead = leadRole(item);
    const head = `${shortTime(item.startTime, opts.locale)} ${itemTitle(item, opts.t)}`;
    lines.push(lead ? `${head} · ${lead.value ?? opts.tba}` : head);
    if (opts.allRoles) {
      for (const r of item.roles) {
        if (r === lead || r.roleKey === "sermon_title" || r.roleKey === "lesson") continue;
        if (!r.value && r.optional) continue;
        lines.push(`   ${roleLabel(r, opts.t)}: ${r.value ?? opts.tba}`);
      }
    }
  }
  lines.push("", opts.full(opts.url));
  return lines.join("\n");
}

export function whatsappUrl(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sabbathlink.co.ke";
