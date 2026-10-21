"use client";

import { useEffect } from "react";
import { markInboxRead } from "@/lib/actions";

/**
 * Marks the inbox read once it has been shown. Done after render, not while
 * rendering, so the "New" labels stay visible on this visit.
 */
export function MarkInboxRead() {
  useEffect(() => {
    void markInboxRead();
  }, []);
  return null;
}
