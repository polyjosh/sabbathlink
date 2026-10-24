import type { SongGroup } from "./data/songs";

/*
 * Song Service helpers shared by the server and the browser (no data access).
 */

export type QueueOrder = "received" | "popular";

/** Waiting requests in the chorister's chosen order. Ties keep the order received. */
export function sortQueue(groups: SongGroup[], order: QueueOrder): SongGroup[] {
  const byTime = (a: SongGroup, b: SongGroup) => a.firstAt.localeCompare(b.firstAt);
  return [...groups].sort(
    order === "popular" ? (a, b) => b.count - a.count || byTime(a, b) : byTime,
  );
}

/**
 * Reads a pasted hymn list, one hymn per line: "245 Title", "245. Title",
 * "245 - Title" or "245<tab>Title" (as copied from a spreadsheet). Lines
 * without a number and a title are skipped and counted.
 */
export function parseHymnList(text: string): { hymns: [number, string][]; skipped: number } {
  const byNumber = new Map<number, string>();
  let skipped = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = /^(\d{1,4})\s*(?:[.:)\-–—]\s*|\t\s*|\s+)(.+)$/.exec(line);
    const n = m ? Number(m[1]) : 0;
    const title = m?.[2]?.trim().slice(0, 120) ?? "";
    if (!m || n < 1 || n > 2000 || !title) {
      skipped++;
      continue;
    }
    byNumber.set(n, title);
  }
  return { hymns: [...byNumber].sort((a, b) => a[0] - b[0]), skipped };
}

/** Requests waiting to be sent while the phone is offline (CLAUDE.md: weak signal in church). */
export interface QueuedSongRequest {
  churchId: string;
  hymnalId: string | null;
  number: number;
  anonymous: boolean;
}

export const SONG_QUEUE_KEY = "sl_song_queue";
