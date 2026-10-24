import "server-only";
import { getSupabase, isSupabaseConfigured } from "../supabase/server";

/*
 * Live song requests during Song Service (CLAUDE.md, "Phase 1.5"). Supabase
 * only: the session rules live in the database functions of
 * supabase/migrations/20261022055132_song_service.sql, which check who is
 * calling, so there is no in-memory version.
 */

export type SongStatus = "requested" | "next" | "sung" | "deferred";

export interface SongRequester {
  /** Null for anonymous requests and people without a name on their profile. */
  name: string | null;
  anonymous: boolean;
  manual: boolean;
}

/** One hymn in the list; several people asking for it count as one row. */
export interface SongGroup {
  hymnalId: string | null;
  number: number | null;
  title: string | null;
  status: SongStatus;
  count: number;
  ids: string[];
  firstAt: string;
  /** Only for the chorister and programme admins. */
  requesters: SongRequester[] | null;
}

export interface MySongRequest {
  id: string;
  hymnalId: string | null;
  number: number | null;
  title: string | null;
  status: SongStatus;
  anonymous: boolean;
}

export interface Hymnal {
  id: string;
  name: string;
  language: "en" | "sw" | "other";
  hymns: number;
}

export interface SongSession {
  id: string;
  live: boolean;
  accepting: boolean;
  limit: number;
  startedAt: string;
  closesAt: string;
  endedAt: string | null;
  updatedAt: string;
}

export interface SongView {
  enabled: boolean;
  sabbathDate: string;
  chorister: string | null;
  session: SongSession | null;
  isAdmin: boolean;
  isChorister: boolean;
  canLead: boolean;
  canRequest: boolean;
  queue: SongGroup[];
  mine: MySongRequest[];
  hymnals: Hymnal[];
}

export interface Chorister {
  name: string;
  phone: string | null;
}

/** Why a request or action was refused, from the database's error hint. */
export type SongError = "signin" | "closed" | "paused" | "follow" | "limit" | "off";
const SONG_ERRORS: SongError[] = ["signin", "closed", "paused", "follow", "limit", "off"];

function fail(error: { message: string; hint?: string }): never {
  throw new Error(error.message);
}

async function call<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const sb = await getSupabase();
  const { data, error } = await sb.rpc(fn, args);
  if (error) fail(error);
  return data as T;
}

/** Like call(), but a refusal the person can act on comes back as { error }. */
async function attempt(
  fn: string,
  args: Record<string, unknown>,
): Promise<{ ok: true } | { error: SongError }> {
  const sb = await getSupabase();
  const { error } = await sb.rpc(fn, args);
  if (!error) return { ok: true };
  if (SONG_ERRORS.includes(error.hint as SongError)) return { error: error.hint as SongError };
  fail(error);
}

// ---------------------------------------------------------------- reads

export async function getSongView(churchId: string): Promise<SongView | null> {
  if (!isSupabaseConfigured()) return null;
  return call<SongView | null>("song_service_view", { p_church: churchId });
}

export async function isSongServiceLive(churchId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  return call<boolean>("song_service_live", { p_church: churchId });
}

/** Number → title for one hymnal, for the request keypad and title search. */
export async function listHymns(hymnalId: string): Promise<[number, string][]> {
  const sb = await getSupabase();
  const { data, error } = await sb
    .from("hymns")
    .select("number, title")
    .eq("hymnal_id", hymnalId)
    .order("number")
    .limit(2000);
  if (error) fail(error);
  return (data as { number: number; title: string }[]).map((h) => [h.number, h.title]);
}

export async function getChorister(churchId: string, date: string): Promise<Chorister | null> {
  if (!isSupabaseConfigured()) return null;
  const sb = await getSupabase();
  const { data, error } = await sb
    .from("choristers")
    .select("name, phone")
    .eq("church_id", churchId)
    .eq("sabbath_date", date)
    .maybeSingle();
  if (error) fail(error);
  return data;
}

/** Recent choristers, newest first, for the picker in the programme editor. */
export async function listRecentChoristers(churchId: string, before: string): Promise<Chorister[]> {
  if (!isSupabaseConfigured()) return [];
  const sb = await getSupabase();
  const { data, error } = await sb
    .from("choristers")
    .select("name, phone")
    .eq("church_id", churchId)
    .lt("sabbath_date", before)
    .order("sabbath_date", { ascending: false })
    .limit(30);
  if (error) fail(error);
  const seen = new Set<string>();
  return (data as Chorister[])
    .filter((c) => {
      const key = `${c.name.toLowerCase()}|${c.phone ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6);
}

// ---------------------------------------------------------------- programme admins

export async function setChorister(churchId: string, date: string, chorister: Chorister | null) {
  const sb = await getSupabase();
  const { error } = chorister
    ? await sb.from("choristers").upsert({
        church_id: churchId,
        sabbath_date: date,
        name: chorister.name,
        phone: chorister.phone,
        updated_at: new Date().toISOString(),
      })
    : await sb.from("choristers").delete().eq("church_id", churchId).eq("sabbath_date", date);
  if (error) fail(error);
}

export async function startSongService(churchId: string, minutes: number) {
  return attempt("start_song_service", { p_church: churchId, p_minutes: minutes });
}

export async function setSongRequestsEnabled(churchId: string, on: boolean) {
  const sb = await getSupabase();
  const { error } = await sb.from("churches").update({ song_requests: on }).eq("id", churchId);
  if (error) fail(error);
}

export async function addHymnal(churchId: string, name: string, language: Hymnal["language"]) {
  const sb = await getSupabase();
  const { data, error } = await sb
    .from("hymnals")
    .insert({ church_id: churchId, name, language })
    .select("id")
    .single();
  if (error) fail(error);
  return data.id as string;
}

export async function deleteHymnal(hymnalId: string) {
  const sb = await getSupabase();
  const { error } = await sb.from("hymnals").delete().eq("id", hymnalId);
  if (error) fail(error);
}

/** Adds or renames titles; numbers already listed keep their row. */
export async function saveHymns(hymnalId: string, hymns: [number, string][]) {
  const sb = await getSupabase();
  const { error } = await sb
    .from("hymns")
    .upsert(hymns.map(([number, title]) => ({ hymnal_id: hymnalId, number, title })));
  if (error) fail(error);
}

// ---------------------------------------------------------------- leading (chorister or admin)

export async function endSongService(sessionId: string) {
  await call("end_song_service", { p_session: sessionId });
}

export async function updateSongService(
  sessionId: string,
  change: { accepting?: boolean; limit?: number },
) {
  await call("update_song_service", {
    p_session: sessionId,
    p_accepting: change.accepting ?? null,
    p_limit: change.limit ?? null,
  });
}

export async function setSongStatus(sessionId: string, ids: string[], status: SongStatus) {
  return attempt("set_song_status", { p_session: sessionId, p_ids: ids, p_status: status });
}

export async function addManualSong(
  sessionId: string,
  song: { hymnalId: string | null; number: number | null; title: string | null },
) {
  return attempt("add_manual_song", {
    p_session: sessionId,
    p_hymnal: song.hymnalId,
    p_number: song.number,
    p_title: song.title,
  });
}

// ---------------------------------------------------------------- members

export async function requestSong(
  churchId: string,
  song: { hymnalId: string | null; number: number; anonymous: boolean },
) {
  return attempt("request_song", {
    p_church: churchId,
    p_hymnal: song.hymnalId,
    p_number: song.number,
    p_anonymous: song.anonymous,
  });
}

export async function cancelSongRequest(id: string) {
  await call("cancel_song_request", { p_id: id });
}
