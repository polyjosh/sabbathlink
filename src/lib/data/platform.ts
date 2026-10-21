import "server-only";
import { cache } from "react";
import { getAuthClaims, getSupabase, isSupabaseConfigured } from "../supabase/server";
import type { AdminRole, ChurchStatus, ItemKind, ServiceTime, Weekday } from "../types";

const WEEK: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/*
 * Platform admin panel data (CLAUDE.md, "Platform admin panel"). Supabase only:
 * staff tools need the real access rules, so there is no in-memory version.
 * Reads rely on the platform-admin RLS policies; every change goes through a
 * platform_* database function, which checks the caller and writes audit_log.
 */

export type Audience = "person" | "church_admins" | "all_admins" | "church_followers" | "everyone";

export interface PlatformChurch {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  district: string;
  conference: string;
  town: string;
  county: string;
  landmark: string;
  kiswahiliService: boolean;
  status: ChurchStatus;
  statusReason: string | null;
  givingHidden: boolean;
  verifiedAt: string | null;
  createdAt: string;
  lat: number | null;
  lng: number | null;
}

export interface PlatformPerson {
  id: string;
  name: string;
  phone: string | null;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  action: string;
  subject: string | null;
  detail: Record<string, unknown> | null;
  churchId: string | null;
  churchName: string | null;
  actorId: string | null;
  actorName: string | null;
}

interface ChurchRow {
  id: string;
  slug: string;
  name: string;
  short_name: string;
  district: string;
  conference: string;
  town: string;
  county: string;
  landmark: string;
  kiswahili_service: boolean;
  status: ChurchStatus;
  status_reason: string | null;
  giving_hidden: boolean;
  verified_at: string | null;
  created_at: string;
  lat: number | null;
  lng: number | null;
}

const CHURCH_COLUMNS =
  "id, slug, name, short_name, district, conference, town, county, landmark, kiswahili_service, status, status_reason, giving_hidden, verified_at, created_at, lat, lng";

function toChurch(r: ChurchRow): PlatformChurch {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    shortName: r.short_name,
    district: r.district,
    conference: r.conference,
    town: r.town,
    county: r.county,
    landmark: r.landmark,
    kiswahiliService: r.kiswahili_service,
    status: r.status,
    statusReason: r.status_reason,
    givingHidden: r.giving_hidden,
    verifiedAt: r.verified_at,
    createdAt: r.created_at,
    lat: r.lat,
    lng: r.lng,
  };
}

const toPerson = (r: {
  id: string;
  name: string;
  phone: string | null;
  created_at: string;
}): PlatformPerson => ({
  id: r.id,
  name: r.name,
  phone: r.phone,
  createdAt: r.created_at,
});

function must<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(`Supabase: ${res.error.message}`);
  return res.data;
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Drops characters that would change the meaning of a PostgREST filter. */
const searchTerm = (q?: string) => q?.replace(/[%_,.()*\\:"']/g, " ").trim() ?? "";

/** Profiles by id, for showing names next to ids from other tables. */
async function peopleById(ids: (string | null)[]) {
  const unique = [...new Set(ids.filter((x): x is string => Boolean(x)))];
  if (!unique.length) return new Map<string, PlatformPerson>();
  const sb = await getSupabase();
  const rows = must(
    await sb.from("profiles").select("id, name, phone, created_at").in("id", unique),
  );
  return new Map((rows as Parameters<typeof toPerson>[0][]).map((r) => [r.id, toPerson(r)]));
}

// ---------------------------------------------------------------- access

/** Whether the signed-in user is SabbathLink staff. Once per request. */
export const isPlatformAdmin = cache(async () => {
  if (!isSupabaseConfigured()) return false;
  const uid = (await getAuthClaims())?.sub;
  if (!uid) return false;
  const sb = await getSupabase();
  const { data } = await sb
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", uid)
    .maybeSingle();
  return Boolean(data);
});

/** Writes "viewed" to the audit log; called by pages that show a person's or church's details. */
export async function logView(kind: "person" | "church", id: string) {
  const sb = await getSupabase();
  must(await sb.rpc("platform_log_view", { p_kind: kind, p_id: id }));
}

// ---------------------------------------------------------------- overview

export interface PlatformStats {
  churches: Partial<Record<ChurchStatus, number>>;
  accounts: number;
  admins: number;
  applications: number;
  paymentChanges: number;
}

export async function getStats(): Promise<PlatformStats> {
  const sb = await getSupabase();
  return must(await sb.rpc("platform_stats")) as PlatformStats;
}

export interface Application {
  id: string;
  submittedAt: string;
  applicantRole: AdminRole;
  applicant: PlatformPerson | null;
  church: {
    id: string;
    name: string;
    town: string;
    district: string;
    conference: string;
    status: ChurchStatus;
  };
}

/** Applications nobody has decided yet, oldest first. */
export async function listOpenApplications(): Promise<Application[]> {
  const sb = await getSupabase();
  const rows = must(
    await sb
      .from("church_applications")
      .select(
        "id, submitted_at, applicant_id, applicant_role, churches(id, name, town, district, conference, status)",
      )
      .is("decided_at", null)
      .order("submitted_at"),
  ) as unknown as {
    id: string;
    submitted_at: string;
    applicant_id: string;
    applicant_role: AdminRole;
    churches: Application["church"];
  }[];
  const people = await peopleById(rows.map((r) => r.applicant_id));
  return rows.map((r) => ({
    id: r.id,
    submittedAt: r.submitted_at,
    applicantRole: r.applicant_role,
    applicant: people.get(r.applicant_id) ?? null,
    church: r.churches,
  }));
}

// ---------------------------------------------------------------- churches

export async function listChurches(opts: { query?: string; status?: ChurchStatus } = {}) {
  const sb = await getSupabase();
  let q = sb
    .from("churches")
    .select(CHURCH_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(200);
  const term = searchTerm(opts.query);
  if (term) {
    q = q.or(
      ["name", "town", "district", "conference"].map((f) => `${f}.ilike.%${term}%`).join(","),
    );
  }
  if (opts.status) q = q.eq("status", opts.status);
  return (must(await q) as ChurchRow[]).map(toChurch);
}

export interface ChurchAdminRow {
  id: string;
  userId: string | null;
  name: string | null;
  phone: string;
  role: AdminRole;
  isOwner: boolean;
  status: "active" | "invited";
  invitedAt: string;
}

export async function getChurchDetail(id: string) {
  if (!UUID.test(id)) return null;
  const sb = await getSupabase();
  const church = must(
    await sb.from("churches").select(CHURCH_COLUMNS).eq("id", id).maybeSingle(),
  ) as ChurchRow | null;
  if (!church) return null;

  const [admins, applications, announcements, events, programmes, methods, changes, times] =
    await Promise.all([
      sb.from("church_admins").select("*").eq("church_id", id).order("invited_at"),
      sb
        .from("church_applications")
        .select(
          "id, applicant_id, applicant_role, submitted_at, decided_at, decision_note, letter_path, letter_name",
        )
        .eq("church_id", id)
        .order("submitted_at", { ascending: false }),
      sb
        .from("announcements")
        .select("id, title, body, posted_at, hide_after")
        .eq("church_id", id)
        .order("posted_at", { ascending: false })
        .limit(20),
      sb
        .from("events")
        .select("id, title, starts_at, place, hide_after")
        .eq("church_id", id)
        .order("starts_at", { ascending: false })
        .limit(20),
      sb
        .from("programmes")
        .select("id, sabbath_date, status, updated_at")
        .eq("church_id", id)
        .order("sabbath_date", { ascending: false })
        .limit(6),
      sb
        .from("payment_methods")
        .select("id, type, number, account_name, bank_name, bank_account_number")
        .eq("church_id", id)
        .order("position"),
      sb
        .from("payment_change_requests")
        .select("id, requested_at, approved_at, remove")
        .eq("church_id", id)
        .order("requested_at", { ascending: false })
        .limit(10),
      sb
        .from("service_times")
        .select("kind, title, day, time")
        .eq("church_id", id),
    ]);

  const adminRows = must(admins) as {
    id: string;
    user_id: string | null;
    name: string | null;
    phone: string;
    role: AdminRole;
    is_owner: boolean;
    status: "active" | "invited";
    invited_at: string;
  }[];
  const appRows = must(applications) as {
    id: string;
    applicant_id: string;
    applicant_role: AdminRole;
    submitted_at: string;
    decided_at: string | null;
    decision_note: string | null;
    letter_path: string | null;
    letter_name: string | null;
  }[];
  const people = await peopleById(appRows.map((a) => a.applicant_id));
  // Short-lived links: opening the church page is logged, and the links expire soon after.
  const letterPaths = appRows.flatMap((a) => (a.letter_path ? [a.letter_path] : []));
  const letterUrls = new Map<string, string>();
  if (letterPaths.length) {
    const { data: signed, error } = await sb.storage
      .from("church-letters")
      .createSignedUrls(letterPaths, 15 * 60);
    if (error) throw new Error(error.message);
    for (const s of signed ?? []) if (s.path && s.signedUrl) letterUrls.set(s.path, s.signedUrl);
  }

  return {
    church: toChurch(church),
    admins: adminRows.map((a): ChurchAdminRow => ({
      id: a.id,
      userId: a.user_id,
      name: a.name,
      phone: a.phone,
      role: a.role,
      isOwner: a.is_owner,
      status: a.status,
      invitedAt: a.invited_at,
    })),
    applications: appRows.map((a) => ({
      id: a.id,
      applicant: people.get(a.applicant_id) ?? null,
      applicantRole: a.applicant_role,
      submittedAt: a.submitted_at,
      decidedAt: a.decided_at,
      decisionNote: a.decision_note,
      letter: a.letter_path
        ? {
            name: a.letter_name || a.letter_path.split("/").pop()!,
            url: letterUrls.get(a.letter_path) ?? null,
          }
        : null,
    })),
    serviceTimes: (
      must(times) as { kind: ItemKind; title: string | null; day: Weekday; time: string }[]
    )
      .map((s): ServiceTime => ({
        kind: s.kind,
        ...(s.title ? { title: s.title } : {}),
        day: s.day,
        time: s.time.slice(0, 5),
      }))
      .sort((a, b) => WEEK.indexOf(a.day) - WEEK.indexOf(b.day) || a.time.localeCompare(b.time)),
    announcements: must(announcements) as {
      id: string;
      title: string;
      body: string;
      posted_at: string;
      hide_after: string | null;
    }[],
    events: must(events) as {
      id: string;
      title: string;
      starts_at: string;
      place: string;
      hide_after: string | null;
    }[],
    programmes: must(programmes) as {
      id: string;
      sabbath_date: string;
      status: string;
      updated_at: string;
    }[],
    methods: must(methods) as {
      id: string;
      type: "paybill" | "till" | "bank";
      number: string | null;
      account_name: string;
      bank_name: string | null;
      bank_account_number: string | null;
    }[],
    changes: must(changes) as {
      id: string;
      requested_at: string;
      approved_at: string | null;
      remove: boolean;
    }[],
    audit: await listAudit({ churchId: id, limit: 20 }),
  };
}

// ---------------------------------------------------------------- people

export async function listPeople(query?: string) {
  const sb = await getSupabase();
  let q = sb
    .from("profiles")
    .select("id, name, phone, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  const term = searchTerm(query);
  if (term) {
    // Phone numbers are stored as +2547…; "0712…" and "712…" should match too.
    const digits = term.replace(/\D/g, "").replace(/^0/, "");
    const filters = [`name.ilike.%${term}%`];
    if (digits.length >= 3) filters.push(`phone.like.*${digits}*`);
    q = q.or(filters.join(","));
  }
  const rows = must(await q) as Parameters<typeof toPerson>[0][];
  const ids = rows.map((r) => r.id);
  const staff = ids.length
    ? (must(await sb.from("platform_admins").select("user_id").in("user_id", ids)) as {
        user_id: string;
      }[])
    : [];
  const staffIds = new Set(staff.map((s) => s.user_id));
  return rows.map((r) => ({ ...toPerson(r), isPlatformAdmin: staffIds.has(r.id) }));
}

export async function getPersonDetail(id: string) {
  if (!UUID.test(id)) return null;
  const sb = await getSupabase();
  const profile = must(
    await sb.from("profiles").select("id, name, phone, created_at").eq("id", id).maybeSingle(),
  ) as Parameters<typeof toPerson>[0] | null;
  if (!profile) return null;

  const [follows, roles, staff, inbox] = await Promise.all([
    sb
      .from("follows")
      .select("created_at, churches(id, name, status)")
      .eq("user_id", id)
      .order("created_at"),
    sb
      .from("church_admins")
      .select("id, role, is_owner, status, churches(id, name)")
      .eq("user_id", id),
    sb.from("platform_admins").select("user_id, added_at").eq("user_id", id).maybeSingle(),
    sb
      .from("message_recipients")
      .select("read_at, sms_status, messages(id, title, sent_at)")
      .eq("user_id", id)
      .limit(20),
  ]);

  return {
    person: toPerson(profile),
    isPlatformAdmin: Boolean(must(staff)),
    follows: (
      must(follows) as unknown as {
        created_at: string;
        churches: { id: string; name: string; status: ChurchStatus };
      }[]
    ).map((f) => ({ followedAt: f.created_at, church: f.churches })),
    roles: (
      must(roles) as unknown as {
        id: string;
        role: AdminRole;
        is_owner: boolean;
        status: "active" | "invited";
        churches: { id: string; name: string };
      }[]
    ).map((r) => ({
      id: r.id,
      role: r.role,
      isOwner: r.is_owner,
      status: r.status,
      church: r.churches,
    })),
    messages: (
      must(inbox) as unknown as {
        read_at: string | null;
        sms_status: string;
        messages: { id: string; title: string; sent_at: string };
      }[]
    )
      .map((m) => ({ ...m.messages, readAt: m.read_at, smsStatus: m.sms_status }))
      .sort((a, b) => b.sent_at.localeCompare(a.sent_at)),
  };
}

// ---------------------------------------------------------------- messages

export async function listSentMessages() {
  const sb = await getSupabase();
  const rows = must(
    await sb
      .from("messages")
      .select(
        "id, sender_id, audience, title, body, send_sms, recipient_count, sent_at, churches(name)",
      )
      .order("sent_at", { ascending: false })
      .limit(50),
  ) as unknown as {
    id: string;
    sender_id: string | null;
    audience: Audience;
    title: string;
    body: string;
    send_sms: boolean;
    recipient_count: number;
    sent_at: string;
    churches: { name: string } | null;
  }[];
  const people = await peopleById(rows.map((r) => r.sender_id));
  return rows.map((r) => ({
    id: r.id,
    audience: r.audience,
    churchName: r.churches?.name ?? null,
    title: r.title,
    body: r.body,
    sendSms: r.send_sms,
    recipients: r.recipient_count,
    sentAt: r.sent_at,
    sender: r.sender_id ? (people.get(r.sender_id) ?? null) : null,
  }));
}

/** Churches for the message audience picker (all statuses, by name). */
export async function listChurchNames() {
  const sb = await getSupabase();
  return must(await sb.from("churches").select("id, name").order("name")) as {
    id: string;
    name: string;
  }[];
}

export async function getPerson(id: string) {
  if (!UUID.test(id)) return null;
  return (await peopleById([id])).get(id) ?? null;
}

// ---------------------------------------------------------------- audit

export async function listAudit(
  opts: { churchId?: string; action?: string; limit?: number } = {},
): Promise<AuditEntry[]> {
  const sb = await getSupabase();
  let q = sb
    .from("audit_log")
    .select("id, at, action, subject, detail, church_id, actor_id, churches(name)")
    .order("at", { ascending: false })
    .limit(opts.limit ?? 100);
  if (opts.churchId) q = q.eq("church_id", opts.churchId);
  if (opts.action) q = q.like("action", `${opts.action.replace(/[%_]/g, "")}%`);
  const rows = must(await q) as unknown as {
    id: string;
    at: string;
    action: string;
    subject: string | null;
    detail: Record<string, unknown> | null;
    church_id: string | null;
    actor_id: string | null;
    churches: { name: string } | null;
  }[];
  const people = await peopleById(rows.map((r) => r.actor_id));
  return rows.map((r) => ({
    id: r.id,
    at: r.at,
    action: r.action,
    subject: r.subject,
    detail: r.detail,
    churchId: r.church_id,
    churchName: r.churches?.name ?? null,
    actorId: r.actor_id,
    actorName: r.actor_id
      ? people.get(r.actor_id)?.name || people.get(r.actor_id)?.phone || null
      : null,
  }));
}

// ---------------------------------------------------------------- staff actions

async function rpc(fn: string, args: Record<string, unknown>) {
  const sb = await getSupabase();
  return must(await sb.rpc(fn, args));
}

export const setChurchStatus = (church: string, status: ChurchStatus, reason: string | null) =>
  rpc("platform_set_church_status", { p_church: church, p_status: status, p_reason: reason });

export const setGivingHidden = (church: string, hidden: boolean, reason: string | null) =>
  rpc("platform_set_giving_hidden", { p_church: church, p_hidden: hidden, p_reason: reason });

export const updateChurch = (church: string, fields: Record<string, string | boolean>) =>
  rpc("platform_update_church", { p_church: church, p: fields });

export const removePost = (kind: "announcement" | "event", id: string, reason: string) =>
  rpc("platform_remove_post", { p_kind: kind, p_id: id, p_reason: reason });

export const removeAdmin = (adminId: string, reason: string) =>
  rpc("platform_remove_admin", { p_admin: adminId, p_reason: reason });

export const makeOwner = (adminId: string) => rpc("platform_make_owner", { p_admin: adminId });

export const setPlatformAdmin = (userId: string, on: boolean) =>
  rpc("platform_set_platform_admin", { p_user: userId, p_on: on });

export async function sendMessage(input: {
  audience: Audience;
  churchId: string | null;
  userId: string | null;
  title: string;
  body: string;
  sms: boolean;
}) {
  return (await rpc("platform_send_message", {
    p_audience: input.audience,
    p_church: input.churchId,
    p_user: input.userId,
    p_title: input.title,
    p_body: input.body,
    p_sms: input.sms,
  })) as number;
}

// ---------------------------------------------------------------- member inbox

export interface InboxMessage {
  id: string;
  title: string;
  body: string;
  sentAt: string;
  readAt: string | null;
}

/** Messages from SabbathLink to the signed-in person, newest first. */
export async function listInbox(): Promise<InboxMessage[]> {
  if (!isSupabaseConfigured()) return [];
  const uid = (await getAuthClaims())?.sub;
  if (!uid) return [];
  const sb = await getSupabase();
  const rows = must(
    await sb
      .from("message_recipients")
      .select("read_at, messages(id, title, body, sent_at)")
      .eq("user_id", uid)
      .limit(50),
  ) as unknown as {
    read_at: string | null;
    messages: { id: string; title: string; body: string; sent_at: string };
  }[];
  return rows
    .map((r) => ({
      id: r.messages.id,
      title: r.messages.title,
      body: r.messages.body,
      sentAt: r.messages.sent_at,
      readAt: r.read_at,
    }))
    .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
}

export async function countUnread() {
  if (!isSupabaseConfigured()) return 0;
  const uid = (await getAuthClaims())?.sub;
  if (!uid) return 0;
  const sb = await getSupabase();
  const { count } = await sb
    .from("message_recipients")
    .select("message_id", { count: "exact", head: true })
    .eq("user_id", uid)
    .is("read_at", null);
  return count ?? 0;
}

export async function markInboxRead() {
  const uid = (await getAuthClaims())?.sub;
  if (!uid) return;
  const sb = await getSupabase();
  must(
    await sb
      .from("message_recipients")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", uid)
      .is("read_at", null),
  );
}
