"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { IconButton } from "./Button";

/**
 * Bottom sheet built on <dialog>, so focus trapping, Escape and the
 * accessibility tree come from the browser.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  eyebrow,
  closeLabel,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  closeLabel: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-0 mx-auto mt-auto max-h-[85dvh] w-full max-w-[480px] rounded-t-[22px] bg-surface p-0 text-ink backdrop:bg-scrim"
    >
      <div className="flex flex-col gap-3 px-4 pt-2.5 pb-[18px]">
        <span aria-hidden="true" className="h-1 w-10 self-center rounded-sm bg-field" />
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            {eyebrow && <p className="t-caption">{eyebrow}</p>}
            <h2 className="t-heading">{title}</h2>
          </div>
          <IconButton icon="x" label={closeLabel} onClick={onClose} />
        </div>
        {children}
      </div>
    </dialog>
  );
}
