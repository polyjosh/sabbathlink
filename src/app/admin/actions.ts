"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as data from "@/lib/data";
import * as songs from "@/lib/data/songs";
import { can, type Capability } from "@/lib/permissions";
import { normalizeKenyanPhone } from "@/lib/phone";
import { parseHymnList } from "@/lib/songs";
import type { AdminRole, ItemKind, ProgrammeItem, RoleKey } from "@/lib/types";

/*
 * Every write checks the permission matrix first. With Supabase the same
 * rules are also enforced in the database (RLS), so a bypassed UI can't
 * write either.
 */
async function requireAdmin(capability: Capability) {
  const admin = await data.getCurrentAdmin();
  if (!admin || !can(admin, capability, admin.churchId)) {
    throw new Error(`Not allowed: ${capability}`);
  }
  return admin;
}

function done() {
  revalidatePath("/", "layout");
}

const ITEM_KINDS: ItemKind[] = [
  "sabbath_school",
  "divine_service",
  "ay",
  "vespers",
  "prayer_meeting",
  "custom",
];
const ROLE_KEYS: RoleKey[] = [
  "superintendent",
  "mission_story",
  "lesson",
  "preacher",
  "sermon_title",
  "platform_elder",
  "song_leader",
  "deacons",
  "special_music",
  "leader",
  "theme",
  "custom",
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
      id: text(it.id, 40),
      kind: it.kind,
      title: it.kind === "custom" ? text(it.title) : undefined,
      startTime: it.startTime,
      roles: (Array.isArray(it.roles) ? it.roles : [])
        .slice(0, 20)
        .map((r: Record<string, unknown>) => {
          if (!ROLE_KEYS.includes(r?.roleKey as RoleKey)) throw new Error("Invalid role");
          return {
            id: text(r.id, 40),
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
  const saved = await data.saveProgramme(admin, {
    date: input.date,
    items: cleanItems(input.items),
    publish: input.publish,
  });
  done();
  return saved;
}

/** Starts a week from last week's programme, its times only, or the church template. */
export async function startProgramme(date: string, mode: "copy" | "times" | "template") {
  const admin = await requireAdmin("programme.edit");
  if (!YMD.test(date)) throw new Error("Invalid date");
  const previous = (await data.listProgrammes(admin.churchId)).find((p) => p.sabbathDate < date);
  const base = previous?.items ?? TEMPLATE;
  const items = structuredClone(mode === "template" ? TEMPLATE : base).map((it) => ({
    ...it,
    id: "",
    roles: it.roles.map((r) => ({
      ...r,
      id: "",
      value: mode === "copy" && r.roleKey !== "sermon_title" ? r.value : null,
    })),
  }));
  await saveProgramme({ date, items, publish: false });
  redirect(`/admin/programme?week=${date}`);
}

const role = (roleKey: RoleKey, optional = false) => ({ id: "", roleKey, value: null, optional });

/** The standard Sabbath order used by "Use church template". */
const TEMPLATE: ProgrammeItem[] = [
  {
    id: "",
    kind: "sabbath_school",
    startTime: "08:30",
    roles: [role("superintendent"), role("mission_story"), role("lesson")],
  },
  {
    id: "",
    kind: "divine_service",
    startTime: "11:00",
    roles: [
      role("preacher"),
      role("sermon_title", true),
      role("platform_elder"),
      role("song_leader"),
      role("deacons"),
      role("special_music"),
    ],
  },
  { id: "", kind: "ay", startTime: "15:00", roles: [role("leader"), role("theme")] },
];

export async function postAnnouncement(form: FormData) {
  const admin = await requireAdmin("posts.edit");
  const title = text(form.get("title"));
  const body = text(form.get("body"), 500);
  if (!title || !body) throw new Error("Missing fields");
  const hideAfter = form.get("hideAfterOn") === "on" ? text(form.get("hideAfter"), 10) : "";
  await data.postAnnouncement(admin, {
    title,
    body,
    // End of the chosen day in Nairobi.
    hideAfter: YMD.test(hideAfter) ? new Date(`${hideAfter}T23:59:00+03:00`).toISOString() : null,
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
  await data.addEvent(admin, {
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
  await data.setCategoryEnabled(admin, id, enabled);
  done();
}

export async function addCategory(form: FormData) {
  const admin = await requireAdmin("giving.edit");
  const label = text(form.get("label"), 40);
  if (!label) return;
  await data.addCategory(admin, label);
  done();
}

export async function moveMethod(id: string, direction: -1 | 1) {
  const admin = await requireAdmin("giving.edit");
  await data.moveMethod(admin, id, direction);
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
  await data.requestMethodChange(admin, {
    methodId,
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

export async function inviteAdmin(
  _prev: { error?: string; sentTo?: string } | null,
  form: FormData,
) {
  const admin = await requireAdmin("team.invite");
  const phone = normalizeKenyanPhone(text(form.get("phone"), 20));
  const role = text(form.get("role"), 20) as AdminRole;
  if (!phone) return { error: "phone" };
  if (!INVITE_ROLES.includes(role)) return { error: "role" };
  await data.inviteAdmin(admin, phone, role);
  // SMS delivery (Africa's Talking) is wired when the SMS provider is chosen.
  done();
  return { sentTo: phone };
}

export async function handOver(form: FormData) {
  const admin = await requireAdmin("ownership.handover");
  await data.handOver(admin, text(form.get("to"), 40), form.get("after") === "leave");
  done();
  redirect(form.get("after") === "leave" ? "/" : "/admin/team");
}

// ---------------------------------------------------------------- Song Service (Phase 1.5)

/**
 * The chorister of the day for one Sabbath, chosen with the programme. The
 * phone links them to their account, so they get the live list while Song
 * Service runs. An empty name removes the chorister.
 */
export async function setChorister(input: { date: string; name: string; phone: string }) {
  const admin = await requireAdmin("programme.edit");
  if (!YMD.test(input.date)) throw new Error("Invalid date");
  const name = text(input.name, 80);
  const rawPhone = text(input.phone, 20);
  const phone = rawPhone ? normalizeKenyanPhone(rawPhone) : null;
  if (name && rawPhone && !phone) return { error: "phone" as const };
  const chorister = name ? { name, phone } : null;
  await songs.setChorister(admin.churchId, input.date, chorister);
  revalidatePath("/admin", "layout");
  return { chorister };
}

const SESSION_MINUTES = [120, 180, 240];

/** Opens this Sabbath's Song Service: requests open and members see "Song Service is live". */
export async function startSongService(form: FormData) {
  const admin = await requireAdmin("programme.edit");
  const minutes = Number(form.get("minutes"));
  const result = await songs.startSongService(
    admin.churchId,
    SESSION_MINUTES.includes(minutes) ? minutes : 180,
  );
  done();
  redirect("error" in result ? `/admin/songs?error=${result.error}` : "/admin/songs?started=1");
}

export async function setSongRequestsEnabled(on: boolean) {
  const admin = await requireAdmin("church.edit");
  await songs.setSongRequestsEnabled(admin.churchId, on);
  done();
}

const LANGUAGES = ["en", "sw", "other"] as const;

export async function addHymnal(form: FormData) {
  const admin = await requireAdmin("programme.edit");
  const name = text(form.get("name"), 60);
  const language = LANGUAGES.find((l) => l === form.get("language")) ?? "en";
  if (!name) redirect("/admin/songs?error=name");
  const id = await songs.addHymnal(admin.churchId, name, language);
  const { hymns } = parseHymnList(text(form.get("titles"), 100_000));
  if (hymns.length) await songs.saveHymns(id, hymns);
  done();
  redirect(`/admin/songs?added=${hymns.length}`);
}

/** Adds pasted titles to a hymnal; RLS checks the hymnal belongs to this church. */
export async function addHymnTitles(form: FormData) {
  await requireAdmin("programme.edit");
  const hymnalId = text(form.get("hymnalId"), 40);
  const { hymns } = parseHymnList(text(form.get("titles"), 100_000));
  if (hymns.length) await songs.saveHymns(hymnalId, hymns);
  done();
  redirect(`/admin/songs?added=${hymns.length}`);
}

export async function deleteHymnal(form: FormData) {
  await requireAdmin("programme.edit");
  await songs.deleteHymnal(text(form.get("hymnalId"), 40));
  done();
  redirect("/admin/songs");
}
