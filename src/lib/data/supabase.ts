import "server-only";
import { cache } from "react";
import { isChurchListed, isGivingVisible } from "../permissions";
import { getAuthClaims, getSupabase } from "../supabase/server";
import { isVisible, nextSabbath } from "../time";
import type {
  ActivityItem,
  AdminRole,
  Announcement,
  Church,
  ChurchAdmin,
  ChurchEvent,
  GivingCategory,
  Member,
  PaymentMethod,
  Programme,
  ProgrammeItem,
  ServiceTime,
} from "../types";
import type {
  ActivityInput,
  ApplicationInput,
  EventInput,
  MethodChangeInput,
  NewAnnouncement,
} from "./contract";
import type { PendingGivingChange } from "./store";

/*
 * Supabase data source. Reads and writes run as the signed-in user (or anon),
 * so Row Level Security in supabase/migrations/0001_init.sql has the final
 * say; the checks in the server actions only keep the UI honest.
 */

// ---------------------------------------------------------------- rows

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
  lat: number | null;
  lng: number | null;
  kiswahili_service: boolean;
  status: Church["status"];
  giving_hidden: boolean;
  parent_org_id: string | null;
  service_times: {
    kind: ServiceTime["kind"];
    title: string | null;
    day: ServiceTime["day"];
    time: string;
  }[];
}

interface ProgrammeRow {
  id: string;
  church_id: string;
  sabbath_date: string;
  status: Programme["status"];
  sunset: string | null;
  updated_at: string;
  updated_by_role: AdminRole | null;
  programme_items: {
    id: string;
    position: number;
    kind: ProgrammeItem["kind"];
    title: string | null;
    start_time: string;
    note: string | null;
    programme_roles: {
      id: string;
      position: number;
      role_key: ProgrammeItem["roles"][number]["roleKey"];
      label: string | null;
      value: string | null;
      optional: boolean;
    }[];
  }[];
}

interface AdminRow {
  id: string;
  church_id: string;
  user_id: string | null;
  name: string | null;
  phone: string;
  role: AdminRole;
  is_owner: boolean;
  status: ChurchAdmin["status"];
  invited_at: string;
}

interface MethodRow {
  id: string;
  church_id: string;
  type: PaymentMethod["type"];
  position: number;
  number: string | null;
  account_name: string;
  bank_name: string | null;
  branch: string | null;
  bank_account_number: string | null;
  note: string | null;
  payment_method_accounts: { category_id: string; account: string }[];
}

interface CategoryRow {
  id: string;
  church_id: string;
  key: GivingCategory["key"];
  label: string | null;
  enabled: boolean;
  position: number;
}

const CHURCH = "*, service_times(kind, title, day, time)";
const PROGRAMME = "*, programme_items(*, programme_roles(*))";
const METHOD = "*, payment_method_accounts(category_id, account)";

/** "HH:mm:ss" from Postgres to the app's "HH:mm". */
const hm = (t: string) => t.slice(0, 5);
const opt = <T>(v: T | null) => v ?? undefined;

function initialsOf(name: string) {
  const words = name.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w));
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase();
}

function toChurch(r: ChurchRow): Church {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    shortName: r.short_name,
    initials: initialsOf(r.short_name || r.name),
    district: r.district,
    conference: r.conference,
    town: r.town,
    county: r.county,
    landmark: r.landmark,
    lat: r.lat ?? 0,
    lng: r.lng ?? 0,
    status: r.status,
    givingHidden: r.giving_hidden,
    parentOrgId: r.parent_org_id,
    kiswahiliService: r.kiswahili_service,
    serviceTimes: (r.service_times ?? []).map((s) => ({
      kind: s.kind,
      title: opt(s.title),
      day: s.day,
      time: hm(s.time),
    })),
  };
}

function toProgramme(r: ProgrammeRow): Programme {
  return {
    id: r.id,
    churchId: r.church_id,
    sabbathDate: r.sabbath_date,
    status: r.status,
    updatedAt: r.updated_at,
    updatedByRole: r.updated_by_role ?? "clerk",
    sunset: r.sunset ? hm(r.sunset) : undefined,
    items: [...(r.programme_items ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((it) => ({
        id: it.id,
        kind: it.kind,
        title: opt(it.title),
        startTime: hm(it.start_time),
        note: opt(it.note),
        roles: [...(it.programme_roles ?? [])]
          .sort((a, b) => a.position - b.position)
          .map((ro) => ({
            id: ro.id,
            roleKey: ro.role_key,
            label: opt(ro.label),
            value: ro.value,
            optional: ro.optional,
          })),
      })),
  };
}

function toAdmin(r: AdminRow): ChurchAdmin {
  return {
    id: r.id,
    churchId: r.church_id,
    userId: r.user_id,
    name: r.name,
    phone: r.phone,
    role: r.role,
    isOwner: r.is_owner,
    status: r.status,
    invitedAt: r.invited_at,
  };
}

function toMethod(r: MethodRow): PaymentMethod {
  const accounts = r.payment_method_accounts ?? [];
  return {
    id: r.id,
    churchId: r.church_id,
    type: r.type,
    position: r.position,
    number: opt(r.number),
    accountName: r.account_name,
    bankName: opt(r.bank_name),
    branch: opt(r.branch),
    bankAccountNumber: opt(r.bank_account_number),
    accountsByCategory: accounts.length
      ? Object.fromEntries(accounts.map((a) => [a.category_id, a.account]))
      : undefined,
    note: opt(r.note),
  };
}

function toCategory(r: CategoryRow): GivingCategory {
  return {
    id: r.id,
    churchId: r.church_id,
    key: r.key,
    label: opt(r.label),
    enabled: r.enabled,
    position: r.position,
  };
}

/** Throws on a Supabase error so failures surface instead of rendering empty pages. */
function must<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) throw new Error(`Supabase: ${res.error.message}`);
  return res.data;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------- reads

export async function listChurches(opts: { query?: string; kiswahili?: boolean } = {}) {
  const sb = await getSupabase();
  let q = sb.from("churches").select(CHURCH).eq("status", "verified").order("name");
  // Characters that would change the meaning of the PostgREST filter are dropped.
  const term = opts.query?.replace(/[%_,.()*\\:"']/g, " ").trim();
  if (term) {
    const like = `%${term}%`;
    q = q.or(["name", "town", "district", "county"].map((f) => `${f}.ilike.${like}`).join(","));
  }
  if (opts.kiswahili) q = q.eq("kiswahili_service", true);
  return (must(await q) as ChurchRow[]).map(toChurch).filter(isChurchListed);
}

export async function getChurch(slug: string): Promise<Church | null> {
  const sb = await getSupabase();
  const row = must(await sb.from("churches").select(CHURCH).eq("slug", slug).maybeSingle());
  return row ? toChurch(row as ChurchRow) : null;
}

export async function getChurchById(id: string): Promise<Church | null> {
  if (!UUID.test(id)) return null;
  const sb = await getSupabase();
  const row = must(await sb.from("churches").select(CHURCH).eq("id", id).maybeSingle());
  return row ? toChurch(row as ChurchRow) : null;
}

export async function listConferences() {
  const sb = await getSupabase();
  const rows = must(await sb.from("churches").select("conference").eq("status", "verified"));
  return [...new Set((rows as { conference: string }[]).map((r) => r.conference))]
    .filter(Boolean)
    .sort();
}

export async function getUpcomingProgramme(churchId: string, now = new Date()) {
  const sb = await getSupabase();
  const row = must(
    await sb
      .from("programmes")
      .select(PROGRAMME)
      .eq("church_id", churchId)
      .eq("sabbath_date", nextSabbath(now))
      .eq("status", "published")
      .maybeSingle(),
  );
  return row ? toProgramme(row as ProgrammeRow) : null;
}

export async function getProgramme(
  churchId: string,
  sabbathDate: string,
): Promise<Programme | null> {
  const sb = await getSupabase();
  const row = must(
    await sb
      .from("programmes")
      .select(PROGRAMME)
      .eq("church_id", churchId)
      .eq("sabbath_date", sabbathDate)
      .maybeSingle(),
  );
  return row ? toProgramme(row as ProgrammeRow) : null;
}

export async function listProgrammes(churchId: string): Promise<Programme[]> {
  const sb = await getSupabase();
  const rows = must(
    await sb
      .from("programmes")
      .select(PROGRAMME)
      .eq("church_id", churchId)
      .order("sabbath_date", { ascending: false })
      .limit(26),
  );
  return (rows as ProgrammeRow[]).map(toProgramme);
}

export async function extraRecentPeople(): Promise<
  Record<string, { name: string; lastOn: string }[]>
> {
  return {};
}

export async function listAnnouncements(
  churchId: string,
  now = new Date(),
): Promise<Announcement[]> {
  const sb = await getSupabase();
  const rows = must(
    await sb
      .from("announcements")
      .select("id, church_id, title, body, posted_at, hide_after")
      .eq("church_id", churchId)
      .order("posted_at", { ascending: false })
      .limit(50),
  );
  return (
    rows as {
      id: string;
      church_id: string;
      title: string;
      body: string;
      posted_at: string;
      hide_after: string | null;
    }[]
  )
    .map((r) => ({
      id: r.id,
      churchId: r.church_id,
      title: r.title,
      body: r.body,
      postedAt: r.posted_at,
      hideAfter: r.hide_after,
    }))
    .filter((a) => isVisible(a.hideAfter, now));
}

export async function listEvents(
  churchId: string,
  opts: { past?: boolean } = {},
  now = new Date(),
): Promise<ChurchEvent[]> {
  const sb = await getSupabase();
  const rows = must(
    await sb
      .from("events")
      .select("id, church_id, title, starts_at, ends_at, place, hide_after")
      .eq("church_id", churchId)
      .order("starts_at", { ascending: !opts.past })
      .limit(100),
  );
  return (
    rows as {
      id: string;
      church_id: string;
      title: string;
      starts_at: string;
      ends_at: string | null;
      place: string;
      hide_after: string | null;
    }[]
  )
    .map((r) => ({
      id: r.id,
      churchId: r.church_id,
      title: r.title,
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      place: r.place,
      hideAfter: r.hide_after,
    }))
    .filter((e) => isVisible(e.hideAfter, now) !== Boolean(opts.past));
}

export async function getGiving(church: Church) {
  if (!isGivingVisible(church)) return null;
  const all = await getGivingSettings(church.id);
  return { methods: all.methods, categories: all.categories.filter((c) => c.enabled) };
}

export async function getGivingSettings(churchId: string) {
  const sb = await getSupabase();
  const [methods, categories] = await Promise.all([
    sb.from("payment_methods").select(METHOD).eq("church_id", churchId).order("position"),
    sb.from("giving_categories").select("*").eq("church_id", churchId).order("position"),
  ]);
  return {
    methods: (must(methods) as MethodRow[]).map(toMethod),
    categories: (must(categories) as CategoryRow[]).map(toCategory),
  };
}

export async function listPendingGivingChanges(churchId: string): Promise<PendingGivingChange[]> {
  const sb = await getSupabase();
  const rows = must(
    await sb
      .from("payment_change_requests")
      .select("id, church_id, method_id, requested_by, requested_at, remove, change")
      .eq("church_id", churchId)
      .is("approved_by", null),
  );
  return (
    rows as {
      id: string;
      church_id: string;
      method_id: string | null;
      requested_by: string;
      requested_at: string;
      remove: boolean;
      change: Partial<PaymentMethod>;
    }[]
  ).map((r) => ({
    id: r.id,
    churchId: r.church_id,
    methodId: r.method_id,
    requestedBy: r.requested_by,
    requestedAt: r.requested_at,
    remove: r.remove,
    change: r.change,
  }));
}

export async function listAdmins(churchId: string): Promise<ChurchAdmin[]> {
  const sb = await getSupabase();
  const rows = must(
    await sb.from("church_admins").select("*").eq("church_id", churchId).order("invited_at"),
  );
  return (rows as AdminRow[]).map(toAdmin);
}

const ACTIONS: ActivityItem["action"][] = [
  "updated_roles",
  "posted",
  "changed_number",
  "published",
];

export async function listActivity(churchId: string): Promise<ActivityItem[]> {
  const sb = await getSupabase();
  const uid = (await getAuthClaims())?.sub;
  const rows = must(
    await sb
      .from("audit_log")
      .select("id, church_id, actor_id, action, subject, detail, at")
      .eq("church_id", churchId)
      .in("action", ACTIONS)
      .order("at", { ascending: false })
      .limit(10),
  );
  return (
    rows as {
      id: string;
      church_id: string;
      actor_id: string | null;
      action: ActivityItem["action"];
      subject: string | null;
      detail: { tone?: ActivityItem["tone"]; actor_name?: string } | null;
      at: string;
    }[]
  ).map((r) => ({
    id: r.id,
    churchId: r.church_id,
    at: r.at,
    tone: r.detail?.tone ?? "default",
    actor: r.actor_id && r.actor_id === uid ? "you" : (r.detail?.actor_name ?? ""),
    action: r.action,
    subject: r.subject ?? "",
  }));
}

/** Development sign-in only; with Supabase the member comes from src/lib/session.ts. */
export async function getMember(): Promise<Member> {
  throw new Error("getMember is only for development sign-in");
}

/** The signed-in user's admin record; the church they own comes first. */
export async function getCurrentAdmin(): Promise<ChurchAdmin | null> {
  const uid = (await getAuthClaims())?.sub;
  if (!uid) return null;
  const sb = await getSupabase();
  const row = must(
    await sb
      .from("church_admins")
      .select("*")
      .eq("user_id", uid)
      .eq("status", "active")
      .order("is_owner", { ascending: false })
      .order("invited_at")
      .limit(1)
      .maybeSingle(),
  );
  return row ? toAdmin(row as AdminRow) : null;
}

export async function getLatestApplication(userId: string) {
  const sb = await getSupabase();
  const row = must(
    await sb
      .from("church_applications")
      .select("submitted_at, churches(name)")
      .eq("applicant_id", userId)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ) as { submitted_at: string; churches: { name: string } | null } | null;
  return row ? { churchName: row.churches?.name ?? "", submittedAt: row.submitted_at } : null;
}

// ---------------------------------------------------------------- writes

/** "Faith Achieng" → "Faith A.", for the activity list other admins see. */
function shortName(admin: ChurchAdmin) {
  const [first, last] = (admin.name ?? "").split(/\s+/).filter(Boolean);
  return first ? `${first}${last ? ` ${last[0]}.` : ""}` : admin.phone.slice(-4).padStart(7, "•");
}

async function record(admin: ChurchAdmin, entry: ActivityInput) {
  const sb = await getSupabase();
  must(
    await sb.from("audit_log").insert({
      church_id: admin.churchId,
      actor_id: admin.userId,
      action: entry.action,
      subject: entry.subject,
      detail: { tone: entry.tone ?? "default", actor_name: shortName(admin) },
    }),
  );
}

export async function saveProgramme(
  admin: ChurchAdmin,
  input: { date: string; items: ProgrammeItem[]; publish: boolean },
) {
  const sb = await getSupabase();
  const rows = must(
    await sb.rpc("save_programme", {
      p_church: admin.churchId,
      p_date: input.date,
      p_items: input.items,
      p_publish: input.publish,
    }),
  ) as { updated_at: string; status: Programme["status"] }[];
  if (input.publish) await record(admin, { action: "published", subject: input.date });
  const saved = rows[0]!;
  return { savedAt: saved.updated_at, status: saved.status };
}

export async function postAnnouncement(admin: ChurchAdmin, input: NewAnnouncement) {
  const sb = await getSupabase();
  must(
    await sb.from("announcements").insert({
      church_id: admin.churchId,
      title: input.title,
      body: input.body,
      hide_after: input.hideAfter,
      posted_by: admin.userId,
    }),
  );
  await record(admin, { action: "posted", subject: input.title });
}

export async function addEvent(admin: ChurchAdmin, input: EventInput) {
  const sb = await getSupabase();
  must(
    await sb.from("events").insert({
      church_id: admin.churchId,
      title: input.title,
      starts_at: input.startsAt,
      ends_at: input.endsAt,
      place: input.place,
      hide_after: input.hideAfter,
    }),
  );
}

export async function setCategoryEnabled(admin: ChurchAdmin, id: string, enabled: boolean) {
  if (!UUID.test(id)) return;
  const sb = await getSupabase();
  must(
    await sb
      .from("giving_categories")
      .update({ enabled })
      .eq("id", id)
      .eq("church_id", admin.churchId),
  );
}

export async function addCategory(admin: ChurchAdmin, label: string) {
  const sb = await getSupabase();
  const { count } = await sb
    .from("giving_categories")
    .select("id", { count: "exact", head: true })
    .eq("church_id", admin.churchId);
  must(
    await sb
      .from("giving_categories")
      .insert({ church_id: admin.churchId, label, enabled: true, position: count ?? 0 }),
  );
}

export async function moveMethod(admin: ChurchAdmin, id: string, direction: -1 | 1) {
  const sb = await getSupabase();
  const list = must(
    await sb
      .from("payment_methods")
      .select("id, position")
      .eq("church_id", admin.churchId)
      .order("position"),
  ) as { id: string; position: number }[];
  const i = list.findIndex((m) => m.id === id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= list.length) return;
  const [a, b] = [list[i]!, list[j]!];
  // Positions are rewritten as indexes so ties from older data sort out too.
  await Promise.all(
    list.map((m, k) => {
      const position = m === a ? j : m === b ? i : k;
      return m.position === position
        ? null
        : sb.from("payment_methods").update({ position }).eq("id", m.id).then(must);
    }),
  );
}

export async function requestMethodChange(admin: ChurchAdmin, input: MethodChangeInput) {
  const sb = await getSupabase();
  must(
    await sb.from("payment_change_requests").insert({
      church_id: admin.churchId,
      method_id: input.methodId && UUID.test(input.methodId) ? input.methodId : null,
      remove: input.remove,
      change: input.change,
      requested_by: admin.userId,
    }),
  );
}

export async function inviteAdmin(admin: ChurchAdmin, phone: string, role: AdminRole) {
  const sb = await getSupabase();
  const { error } = await sb
    .from("church_admins")
    .insert({ church_id: admin.churchId, phone, role });
  // Already on the team or already invited: nothing more to do.
  if (error && error.code !== "23505") throw new Error(`Supabase: ${error.message}`);
}

export async function handOver(_admin: ChurchAdmin, toId: string, leave: boolean) {
  if (!UUID.test(toId)) throw new Error("Choose an active admin");
  const sb = await getSupabase();
  must(await sb.rpc("hand_over_ownership", { p_to: toId, p_leave: leave }));
}

const LETTER_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export async function submitApplication(member: Member, input: ApplicationInput) {
  const sb = await getSupabase();
  // The letter goes to the private "church-letters" bucket, in a folder named
  // after the applicant; only platform admins (and the applicant) can read it.
  let letterPath: string | null = null;
  if (input.letter) {
    const ext = LETTER_EXT[input.letter.type];
    if (!ext) throw new Error("Letter must be a PDF, JPG or PNG");
    letterPath = `${member.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage
      .from("church-letters")
      .upload(letterPath, input.letter, { contentType: input.letter.type, upsert: false });
    if (error) throw new Error(`Letter upload failed: ${error.message}`);
  }
  must(
    await sb.rpc("register_church", {
      p: {
        letter_path: letterPath,
        letter_name: input.letter?.name.slice(0, 200) ?? null,
        name: input.name,
        role: input.role,
        district: input.district,
        conference: input.conference,
        town: input.town,
        landmark: input.landmark,
        lat: input.lat,
        lng: input.lng,
        times: input.times,
      },
    }),
  );
}

// ---------------------------------------------------------------- account

/** The signed-in member's profile and follows, or null when signed out. Once per request. */
export const getSignedInMember = cache(async (): Promise<Member | null> => {
  const claims = await getAuthClaims();
  if (!claims?.sub) return null;
  const sb = await getSupabase();
  const [profile, follows] = await Promise.all([
    sb.from("profiles").select("name, phone").eq("id", claims.sub).maybeSingle(),
    sb.from("follows").select("church_id").eq("user_id", claims.sub).order("created_at"),
  ]);
  const p = must(profile) as { name: string; phone: string | null } | null;
  const followingIds = (must(follows) as { church_id: string }[]).map((f) => f.church_id);
  const phone = p?.phone ?? (claims.phone ? `+${String(claims.phone).replace(/^\+/, "")}` : "");
  const name = p?.name || "";
  return {
    id: claims.sub,
    name,
    phone,
    initials: initialsOf(name) || "•",
    // The first church followed is "My church", as on a visitor's phone.
    myChurchId: followingIds[0] ?? null,
    followingIds,
  };
});

export async function setFollowing(churchId: string, follow: boolean) {
  const uid = (await getAuthClaims())?.sub;
  if (!uid || !UUID.test(churchId)) return;
  const sb = await getSupabase();
  if (follow) {
    must(
      await sb
        .from("follows")
        .upsert(
          { user_id: uid, church_id: churchId },
          { onConflict: "user_id,church_id", ignoreDuplicates: true },
        ),
    );
  } else {
    must(await sb.from("follows").delete().eq("user_id", uid).eq("church_id", churchId));
  }
}

/**
 * Runs right after sign-in: churches followed as a visitor move to the
 * account, and admin invites sent to this phone number become active.
 */
export async function adoptVisitorState(churchIds: string[]) {
  const uid = (await getAuthClaims())?.sub;
  if (!uid) return;
  const sb = await getSupabase();
  const ids = churchIds.filter((id) => UUID.test(id));
  if (ids.length) {
    must(
      await sb.from("follows").upsert(
        ids.map((church_id) => ({ user_id: uid, church_id })),
        { onConflict: "user_id,church_id", ignoreDuplicates: true },
      ),
    );
  }
  must(await sb.rpc("claim_admin_invites"));
}
