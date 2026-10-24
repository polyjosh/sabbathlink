"use client";

import { useCallback, useEffect, useState } from "react";
import type { SongView } from "@/lib/data/songs";

/**
 * Keeps a Song Service view fresh by polling /api/songs (CLAUDE.md allows
 * polling as the real-time fallback). Polls only while the screen is visible
 * and online, quickly while the session is live and slowly otherwise, so
 * members waiting for Song Service to start see it open.
 */
export function useSongView(churchId: string, initial: SongView, liveEveryMs: number) {
  const [view, setView] = useState(initial);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/songs/${churchId}`, { cache: "no-store" });
      if (res.ok) setView((await res.json()) as SongView);
    } catch {
      // Offline or a dropped connection: keep showing the last list.
    }
  }, [churchId]);

  const live = Boolean(view.session?.live);
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible" && navigator.onLine) void refresh();
    };
    const id = setInterval(tick, live ? liveEveryMs : 30_000);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("online", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("online", tick);
    };
  }, [refresh, live, liveEveryMs]);

  return { view, refresh };
}
