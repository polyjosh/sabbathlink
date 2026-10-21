"use client";

import { useCallback, useSyncExternalStore } from "react";

const EVENT = "sl-storage";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

/**
 * Writes to localStorage and, unless `silent`, tells every hook reading it.
 * Use `silent` for drafts the current screen already holds in state.
 */
export function writeStored(key: string, value: string | null, silent = false) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Blocked storage: the value lasts for this render only.
  }
  if (!silent) window.dispatchEvent(new Event(EVENT));
}

/**
 * A per-device setting kept in localStorage. The server render (and a phone
 * with storage blocked) uses `fallback`.
 */
export function useStoredValue<T extends string>(key: string, fallback: T) {
  const value = useSyncExternalStore(
    subscribe,
    () => (read(key) as T | null) ?? fallback,
    () => fallback,
  );
  const set = useCallback((next: T) => writeStored(key, next), [key]);
  return [value, set] as const;
}

/** Raw stored string (e.g. a JSON draft), or null. */
export function useStoredRaw(key: string) {
  return useSyncExternalStore(subscribe, () => read(key), () => null);
}
