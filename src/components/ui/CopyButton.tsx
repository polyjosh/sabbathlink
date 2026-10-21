"use client";

import { useState } from "react";
import { Icon } from "./Icon";
import { useToast } from "./Toast";

/** Copies text, turns green with a tick, and confirms with a toast. */
export function CopyButton({
  value,
  label,
  toast,
  variant = "tile",
  children,
}: {
  value: string;
  /** Accessible name, e.g. "Copy business number 908712". */
  label: string;
  /** Toast text, e.g. "Paybill 908712 copied". */
  toast: string;
  variant?: "tile" | "outline";
  children?: React.ReactNode;
}) {
  const [done, setDone] = useState(false);
  const showToast = useToast();

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Older Android WebViews: fall back to a hidden textarea.
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.append(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setDone(true);
    showToast({ message: toast });
    setTimeout(() => setDone(false), 2500);
  }

  if (variant === "outline") {
    return (
      <button
        type="button"
        onClick={copy}
        aria-label={children ? undefined : label}
        className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-surface px-3.5 text-[15px] font-semibold text-primary shadow-[inset_0_0_0_1.5px_var(--primary)]"
      >
        <Icon name={done ? "check" : "copy"} size={18} />
        {children}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      className={`inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl ${
        done ? "bg-success text-white" : "bg-primary-soft text-primary-soft-ink"
      }`}
    >
      <Icon name={done ? "check" : "copy"} />
    </button>
  );
}
