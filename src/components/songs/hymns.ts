"use client";

import { useEffect, useMemo, useState } from "react";
import type { Hymnal } from "@/lib/data/songs";

/** "Hymn 245" plus its title and, when a church uses several, the hymnal. */
export function hymnText(
  song: { hymnalId: string | null; number: number | null; title: string | null },
  hymnals: Hymnal[],
  hymnWord: (number: number) => string,
) {
  const main = song.number !== null ? hymnWord(song.number) : (song.title ?? "");
  const parts = [
    song.number !== null ? song.title : null,
    hymnals.length > 1 ? hymnals.find((h) => h.id === song.hymnalId)?.name : null,
  ].filter(Boolean);
  return { main, sub: parts.join(" · ") || null };
}

/**
 * A hymnal's titles, kept on the phone so the keypad can show the title of
 * the number typed and title search works with a weak signal. The cache key
 * includes the hymn count, so adding titles refreshes it.
 */
export function useHymnIndex(hymnal: Hymnal | undefined) {
  const id = hymnal?.id;
  const key = id && hymnal.hymns ? `sl_hymns_${id}_${hymnal.hymns}` : null;
  const [loaded, setLoaded] = useState<{ key: string; list: [number, string][] } | null>(null);

  useEffect(() => {
    if (!key || !id) return;
    let cancelled = false;
    void (async () => {
      let list = readCache(key);
      if (!list) {
        try {
          const res = await fetch(`/api/hymns/${id}`);
          if (!res.ok) return;
          list = (await res.json()) as [number, string][];
          writeCache(`sl_hymns_${id}_`, key, list);
        } catch {
          return;
        }
      }
      if (!cancelled) setLoaded({ key, list });
    })();
    return () => {
      cancelled = true;
    };
  }, [key, id]);

  return useMemo(() => new Map(loaded && loaded.key === key ? loaded.list : []), [loaded, key]);
}

function readCache(key: string): [number, string][] | null {
  try {
    const cached = localStorage.getItem(key);
    return cached ? (JSON.parse(cached) as [number, string][]) : null;
  } catch {
    return null;
  }
}

/** Replaces older copies of the same hymnal. Full or blocked storage only costs a refetch. */
function writeCache(prefix: string, key: string, list: [number, string][]) {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(prefix)) localStorage.removeItem(k);
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Ignore.
  }
}
