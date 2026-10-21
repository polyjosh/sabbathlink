import "server-only";
import { isChurchListed, isGivingVisible } from "../permissions";
import { isVisible, nextSabbath } from "../time";
import type { AdminRole, Church, ChurchAdmin, Member, Programme, ProgrammeItem } from "../types";
import type {
  ActivityInput,
  ApplicationInput,
  EventInput,
  MethodChangeInput,
  NewAnnouncement,
} from "./contract";
import { demoMember as DEMO_MEMBER } from "./seed";
import { db, newId } from "./store";

/*
 * Development data source: the in-memory store (seed data plus edits), used
 * when no Supabase project is configured. Mirrors ./supabase.ts function for
 * function; ./index.ts picks one.
 */

export async function listChurches(opts: { query?: string; kiswahili?: boolean } = {}) {
  const q = opts.query?.trim().toLowerCase();
  return db().churches.filter(
    (c) =>
      isChurchListed(c) &&
      (!q || [c.name, c.town, c.district, c.county].some((f) => f.toLowerCase().includes(q))) &&
      (!opts.kiswahili || c.kiswahiliService),
  );
}

export async function getChurch(slug: string): Promise<Church | null> {
  return db().churches.find((c) => c.slug === slug) ?? null;
}

export async function getChurchById(id: string): Promise<Church | null> {
  return db().churches.find((c) => c.id === id) ?? null;
}

/** Conferences churches already belong to, for the registration picker. */
export async function listConferences() {
  return [...new Set(db().churches.map((c) => c.conference))].filter(Boolean).sort();
}

/** The published programme for the coming Sabbath, if any. */
export async function getUpcomingProgramme(churchId: string, now = new Date()) {
  const date = nextSabbath(now);
  return (
    db().programmes.find(
      (p) => p.churchId === churchId && p.sabbathDate === date && p.status === "published",
    ) ?? null
  );
}

/** A church's programme for one Sabbath, in any state (admins only). */
export async function getProgramme(
  churchId: string,
  sabbathDate: string,
): Promise<Programme | null> {
  return (
    db().programmes.find((p) => p.churchId === churchId && p.sabbathDate === sabbathDate) ?? null
  );
}

/** Every programme of a church, newest first (admins only). */
export async function listProgrammes(churchId: string): Promise<Programme[]> {
  return db()
    .programmes.filter((p) => p.churchId === churchId)
    .sort((a, b) => b.sabbathDate.localeCompare(a.sabbathDate));
}

/** Extra names for the role picker beyond past programmes (sample data only). */
export async function extraRecentPeople() {
  return db().recentPeople;
}

export async function listAnnouncements(churchId: string, now = new Date()) {
  return db()
    .announcements.filter((a) => a.churchId === churchId && isVisible(a.hideAfter, now))
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt));
}

export async function listEvents(
  churchId: string,
  opts: { past?: boolean } = {},
  now = new Date(),
) {
  return db()
    .events.filter(
      (e) => e.churchId === churchId && isVisible(e.hideAfter, now) !== Boolean(opts.past),
    )
    .sort((a, b) =>
      opts.past ? b.startsAt.localeCompare(a.startsAt) : a.startsAt.localeCompare(b.startsAt),
    );
}

/**
 * Giving details. Returns nothing for churches that aren't verified, so a
 * pending church's numbers can't leak through any page.
 */
export async function getGiving(church: Church) {
  if (!isGivingVisible(church)) return null;
  const all = await getGivingSettings(church.id);
  return { methods: all.methods, categories: all.categories.filter((c) => c.enabled) };
}

/** Admin view of giving settings, including disabled categories. */
export async function getGivingSettings(churchId: string) {
  return {
    methods: db()
      .paymentMethods.filter((m) => m.churchId === churchId)
      .sort((a, b) => a.position - b.position),
    categories: db()
      .givingCategories.filter((c) => c.churchId === churchId)
      .sort((a, b) => a.position - b.position),
  };
}

export async function listPendingGivingChanges(churchId: string) {
  return db().pendingGivingChanges.filter((c) => c.churchId === churchId);
}

export async function listAdmins(churchId: string): Promise<ChurchAdmin[]> {
  return db().admins.filter((a) => a.churchId === churchId);
}

export async function listActivity(churchId: string) {
  return db().activity.filter((a) => a.churchId === churchId);
}

/** The demo account used by development sign-in. */
export async function getMember(): Promise<Member> {
  return DEMO_MEMBER;
}

/** The admin record for the signed-in user. Demo: the clerk/owner of ORC. */
export async function getCurrentAdmin(): Promise<ChurchAdmin | null> {
  return db().admins.find((a) => a.userId === DEMO_MEMBER.id) ?? null;
}

export async function getLatestApplication(userId: string) {
  const a = db()
    .applications.filter((x) => x.applicantId === userId)
    .at(-1);
  return a ? { churchName: a.church.name, submittedAt: a.submittedAt } : null;
}

// ---------------------------------------------------------------- writes
// Callers (server actions) have already checked permissions and validated input.

function record(admin: ChurchAdmin, entry: ActivityInput) {
  db().activity.unshift({
    id: newId("ac"),
    churchId: admin.churchId,
    at: new Date().toISOString(),
    tone: entry.tone ?? "default",
    actor: "you",
    action: entry.action,
    subject: entry.subject,
  });
}

export async function saveProgramme(
  admin: ChurchAdmin,
  input: { date: string; items: ProgrammeItem[]; publish: boolean },
) {
  const store = db();
  const now = new Date().toISOString();
  let p = store.programmes.find(
    (x) => x.churchId === admin.churchId && x.sabbathDate === input.date,
  );
  if (!p) {
    p = {
      id: newId("pg"),
      churchId: admin.churchId,
      sabbathDate: input.date,
      status: "draft",
      updatedAt: now,
      updatedByRole: admin.role,
      items: [],
    };
    store.programmes.push(p);
  }
  p.items = input.items.map((it) => ({
    ...it,
    id: it.id || newId("it"),
    roles: it.roles.map((r) => ({ ...r, id: r.id || newId("r") })),
  }));
  p.updatedAt = now;
  p.updatedByRole = admin.role;
  if (input.publish) {
    p.status = "published";
    record(admin, { action: "published", subject: input.date });
  }
  return { savedAt: now, status: p.status };
}

export async function postAnnouncement(admin: ChurchAdmin, input: NewAnnouncement) {
  db().announcements.unshift({
    id: newId("an"),
    churchId: admin.churchId,
    title: input.title,
    body: input.body,
    postedAt: new Date().toISOString(),
    hideAfter: input.hideAfter,
  });
  record(admin, { action: "posted", subject: input.title });
}

export async function addEvent(admin: ChurchAdmin, input: EventInput) {
  db().events.push({ id: newId("ev"), churchId: admin.churchId, ...input });
}

export async function setCategoryEnabled(admin: ChurchAdmin, id: string, enabled: boolean) {
  const c = db().givingCategories.find((x) => x.id === id && x.churchId === admin.churchId);
  if (c) c.enabled = enabled;
}

export async function addCategory(admin: ChurchAdmin, label: string) {
  const list = db().givingCategories.filter((c) => c.churchId === admin.churchId);
  db().givingCategories.push({
    id: newId("gc"),
    churchId: admin.churchId,
    key: null,
    label,
    enabled: true,
    position: list.length,
  });
}

export async function moveMethod(admin: ChurchAdmin, id: string, direction: -1 | 1) {
  const list = db()
    .paymentMethods.filter((m) => m.churchId === admin.churchId)
    .sort((a, b) => a.position - b.position);
  const i = list.findIndex((m) => m.id === id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i]!.position, list[j]!.position] = [list[j]!.position, list[i]!.position];
}

export async function requestMethodChange(admin: ChurchAdmin, input: MethodChangeInput) {
  db().pendingGivingChanges.push({
    id: newId("chg"),
    churchId: admin.churchId,
    methodId: input.methodId,
    requestedBy: admin.id,
    requestedAt: new Date().toISOString(),
    remove: input.remove,
    change: input.change,
  });
}

export async function inviteAdmin(admin: ChurchAdmin, phone: string, role: AdminRole) {
  if (db().admins.some((a) => a.churchId === admin.churchId && a.phone === phone)) return;
  db().admins.push({
    id: newId("ad"),
    churchId: admin.churchId,
    userId: null,
    name: null,
    phone,
    role,
    isOwner: false,
    status: "invited",
    invitedAt: new Date().toISOString(),
  });
}

export async function handOver(admin: ChurchAdmin, toId: string, leave: boolean) {
  const to = db().admins.find(
    (a) => a.id === toId && a.churchId === admin.churchId && a.status === "active",
  );
  if (!to || to.id === admin.id) throw new Error("Choose an active admin");
  to.isOwner = true;
  const me = db().admins.find((a) => a.id === admin.id)!;
  me.isOwner = false;
  if (leave) db().admins.splice(db().admins.indexOf(me), 1);
}

export async function submitApplication(member: Member, input: ApplicationInput) {
  const slugBase = input.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const words = input.name.split(/\s+/).filter(Boolean);
  db().applications.push({
    applicantId: member.id,
    church: {
      id: newId("ch"),
      slug: `${slugBase}-${Math.random().toString(36).slice(2, 6)}`,
      name: input.name,
      shortName: input.name.replace(/\s+Church$/i, ""),
      initials: ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase(),
      district: input.district,
      conference: input.conference,
      town: input.town,
      county: "",
      landmark: input.landmark,
      lat: input.lat,
      lng: input.lng,
      status: "pending",
      parentOrgId: null,
      kiswahiliService: false,
      serviceTimes: input.times,
    },
    applicantRole: input.role,
    submittedAt: new Date().toISOString(),
    letter: input.letter ? { name: input.letter.name, size: input.letter.size } : null,
  });
}
