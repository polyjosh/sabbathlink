"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/data";
import { db, newId } from "@/lib/data/store";
import { can, type Capability } from "@/lib/permissions";
import { normalizeKenyanPhone } from "@/lib/phone";
import type { AdminRole, ItemKind, ProgrammeItem, RoleKey } from "@/lib/types";

/*
 * Every write checks the permission matrix first. With Supabase the same
 * rules are also enforced in the database (RLS), so a bypassed UI can't
 * write either.
 */
async function requireAdmin(capability: Capability) {
  const admin = await getCurrentAdmin();
  if (!admin || !can(admin, capability, admin.churchId)) {
    throw new Error(`Not allowed: ${capability}`);
  }
  return admin;
}

function done() {
  revalidatePath("/", "layout");
}

const ITEM_KINDS: ItemKind[] = ["sabbath_school", "divine_service", "ay", "vespers", "prayer_meeting", "custom"];
const ROLE_KEYS: RoleKey[] = [
  "superintendent", "mission_story", "lesson", "preacher", "sermon_title", "platform_elder",
  "song_leader", "deacons", "special_music", "leader", "theme", "custom",
];
const HM = /^([01]\d|2[0-3]):[0-5]\d$/;
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const text = (v: unknown, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Validates the editor's items before they reach storage. */
function cleanItems(raw: unknown): ProgrammeItem[] {
  if (!Array.isArray(raw)) throw new Error("Invalid programme");
  return raw.slice(0, 20).map((it) => {
    if (!ITEM_KINDS.includes(it?.kind) || !HM.test(it?.startTime)) throw new Error("Invalid item");
    return {
      id: text(it.id, 40) || newId("it"),
      kind: it.kind,
      title: it.kind === "custom" ? text(it.title) : undefined,
      startTime: it.startTime,
      roles: (Array.isArray(it.roles) ? it.roles : []).slice(0, 20).map((r: Record<string, unknown>) => {
        if (!ROLE_KEYS.includes(r?.roleKey as RoleKey)) throw new Error("Invalid role");
        return {
          id: text(r.id, 40) || newId("r"),
          roleKey: r.roleKey as RoleKey,
          label: r.roleKey === "custom" ? text(r.label) : undefined,
          value: text(r.value) || null,
          optional: Boolean(r.optional),
        };
      }),
    };
  });
}

export async function saveProgramme(input: { date: string; items: unknown; publish: boolean }) {
  const admin = await requireAdmin("programme.edit");
  if (!YMD.test(input.date)) throw new Error("Invalid date");
  const items = cleanItems(input.items);
  const store = db();
  const now = new Date().toISOString();
  let p = store.programmes.find((x) => x.churchId === admin.churchId && x.sabbathDate === input.date);
  if (!p) {
    p = {
      id: newId("pg"),
      churchId: admin.churchId,
      sabbathDate: input.date,
      status: "draft",
      updatedAt: now,
      updatedByRole: admin.role,
      items,
    };
    store.programmes.push(p);
  }
  p.items = items;
  p.updatedAt = now;
  p.updatedByRole = admin.role;
  if (input.publish) {
    p.status = "published";
    store.activity.unshift({
      id: newId("ac"),
      churchId: admin.churchId,
      at: now,
      tone: "default",
      actor: "you",
      action: "published",
      subject: input.date,
    });
  }
  done();
  return { savedAt: now, status: p.status };
}

/** Starts a week from last week's programme, its times only, or the church template. */
export async function startProgramme(date: string, mode: "copy" | "times" | "template") {
  const admin = await requireAdmin("programme.edit");
  if (!YMD.test(date)) throw new Error("Invalid date");
  const store = db();
  const previous = store.programmes
    .filter((p) => p.churchId === admin.churchId && p.sabbathDate < date)
    .sort((a, b) => b.sabbathDate.localeCompare(a.sabbathDate))[0];
  const base = previous?.items ?? TEMPLATE;
  const items = structuredClone(mode === "template" ? TEMPLATE : base).map((it) => ({
    ...it,
    id: newId("it"),
    roles: it.roles.map((r) => ({
      ...r,
      id: newId("r"),
      value: mode === "copy" && r.roleKey !== "sermon_title" ? r.value : null,
    })),
  }));
  await saveProgramme({ date, items, publish: false });
  redirect(`/admin/programme?week=${date}`);
}

const role = (roleKey: RoleKey, optional = false) => ({ id: "", roleKey, value: null, optional });

/** The standard Sabbath order used by "Use church template". */
const TEMPLATE: ProgrammeItem[] = [
  { id: "", kind: "sabbath_school", startTime: "08:30", roles: [role("superintendent"), role("mission_story"), role("lesson")] },
  {
    id: "",
    kind: "divine_service",
    startTime: "11:00",
    roles: [role("preacher"), role("sermon_title", true), role("platform_elder"), role("song_leader"), role("deacons"), role("special_music")],
  },
  { id: "", kind: "ay", startTime: "15:00", roles: [role("leader"), role("theme")] },
];

export async function postAnnouncement(form: FormData) {
  const admin = await requireAdmin("posts.edit");
  const title = text(form.get("title"));
  const body = text(form.get("body"), 500);
  if (!title || !body) throw new Error("Missing fields");
  const hideAfter = form.get("hideAfterOn") === "on" ? text(form.get("hideAfter"), 10) : "";
  db().announcements.unshift({
    id: newId("an"),
    churchId: admin.churchId,
    title,
    body,
    postedAt: new Date().toISOString(),
    // End of the chosen day in Nairobi.
    hideAfter: YMD.test(hideAfter) ? new Date(`${hideAfter}T23:59:00+03:00`).toISOString() : null,
  });
  db().activity.unshift({
    id: newId("ac"),
    churchId: admin.churchId,
    at: new Date().toISOString(),
    tone: "default",
    actor: "you",
    action: "posted",
    subject: title,
  });
  done();
  redirect("/admin/posts?posted=announcement");
}

export async function addEvent(form: FormData) {
  const admin = await requireAdmin("posts.edit");
  const title = text(form.get("title"));
  const date = text(form.get("date"), 10);
  const starts = text(form.get("starts"), 5);
  const ends = text(form.get("ends"), 5);
  const place = text(form.get("place"));
  if (!title || !YMD.test(date) || !HM.test(starts)) throw new Error("Missing fields");
  const at = (hm: string) => new Date(`${date}T${hm}:00+03:00`).toISOString();
  const endsAt = HM.test(ends) ? at(ends) : null;
  const customHide = text(form.get("hideDate"), 10);
  db().events.push({
    id: newId("ev"),
    churchId: admin.churchId,
    title,
    startsAt: at(starts),
    endsAt,
    place,
    // Events hide by themselves once they end (or 3 hours after starting).
    hideAfter: YMD.test(customHide)
      ? new Date(`${customHide}T23:59:00+03:00`).toISOString()
      : (endsAt ?? new Date(new Date(at(starts)).getTime() + 3 * 3600_000).toISOString()),
  });
  done();
  redirect("/admin/posts?posted=event");
}

export async function setCategoryEnabled(id: string, enabled: boolean) {
  const admin = await requireAdmin("giving.edit");
  const c = db().givingCategories.find((x) => x.id === id && x.churchId === admin.churchId);
  if (c) c.enabled = enabled;
  done();
}

export async function addCategory(form: FormData) {
  const admin = await requireAdmin("giving.edit");
  const label = text(form.get("label"), 40);
  if (!label) return;
  const list = db().givingCategories.filter((c) => c.churchId === admin.churchId);
  db().givingCategories.push({
    id: newId("gc"),
    churchId: admin.churchId,
    key: null,
    label,
    enabled: true,
    position: list.length,
  });
  done();
}

export async function moveMethod(id: string, direction: -1 | 1) {
  const admin = await requireAdmin("giving.edit");
  const list = db()
    .paymentMethods.filter((m) => m.churchId === admin.churchId)
    .sort((a, b) => a.position - b.position);
  const i = list.findIndex((m) => m.id === id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i]!.position, list[j]!.position] = [list[j]!.position, list[i]!.position];
  done();
}

/**
 * A change to payment details is never applied directly: it waits for a
 * second admin's approval (see canApproveGivingChange), and followers get a
 * safety alert once it's approved.
 */
export async function requestMethodChange(form: FormData) {
  const admin = await requireAdmin("giving.edit");
  const methodId = text(form.get("methodId"), 40) || null;
  const accounts: Record<string, string> = {};
  for (const [k, v] of form.entries()) {
    if (k.startsWith("account:")) accounts[k.slice(8)] = text(v, 20).toUpperCase();
  }
  db().pendingGivingChanges.push({
    id: newId("chg"),
    churchId: admin.churchId,
    methodId,
    requestedBy: admin.id,
    requestedAt: new Date().toISOString(),
    remove: Boolean(methodId) && form.get("intent") === "remove",
    change: {
      type: (text(form.get("type"), 10) || "paybill") as "paybill" | "till" | "bank",
      number: text(form.get("number"), 12),
      accountName: text(form.get("accountName"), 80),
      bankName: text(form.get("bankName"), 60) || undefined,
      branch: text(form.get("branch"), 60) || undefined,
      bankAccountNumber: text(form.get("bankAccountNumber"), 30) || undefined,
      accountsByCategory: accounts,
    },
  });
  redirect("/admin/giving?sent=1");
}

const INVITE_ROLES: AdminRole[] = ["communication", "treasurer", "elder", "clerk"];

export async function inviteAdmin(_prev: { error?: string; sentTo?: string } | null, form: FormData) {
  const admin = await requireAdmin("team.invite");
  const phone = normalizeKenyanPhone(text(form.get("phone"), 20));
  const role = text(form.get("role"), 20) as AdminRole;
  if (!phone) return { error: "phone" };
  if (!INVITE_ROLES.includes(role)) return { error: "role" };
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
  // SMS delivery (Africa's Talking) is wired when the SMS provider is chosen.
  done();
  return { sentTo: phone };
}

export async function handOver(form: FormData) {
  const admin = await requireAdmin("ownership.handover");
  const to = db().admins.find(
    (a) => a.id === text(form.get("to"), 40) && a.churchId === admin.churchId && a.status === "active",
  );
  if (!to || to.id === admin.id) throw new Error("Choose an active admin");
  to.isOwner = true;
  const me = db().admins.find((a) => a.id === admin.id)!;
  me.isOwner = false;
  if (form.get("after") === "leave") {
    db().admins.splice(db().admins.indexOf(me), 1);
  }
  done();
  redirect(form.get("after") === "leave" ? "/" : "/admin/team");
}
