"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Fetches the page again when the person comes back to the tab, so a list
 * left open shows changes made elsewhere (for example a church verified in
 * another tab). At most once per `minMinutes`, to keep data use low.
 */
export function RefreshOnReturn({ minMinutes = 2 }: { minMinutes?: number }) {
  const router = useRouter();
  useEffect(() => {
    let last = Date.now();
    const onReturn = () => {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      if (Date.now() - last < minMinutes * 60_000) return;
      last = Date.now();
      router.refresh();
    };
    document.addEventListener("visibilitychange", onReturn);
    return () => document.removeEventListener("visibilitychange", onReturn);
  }, [router, minMinutes]);
  return null;
}
