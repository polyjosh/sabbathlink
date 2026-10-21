"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { moveMethod } from "@/app/admin/actions";
import { Icon } from "@/components/ui/Icon";

/**
 * Reorder with up/down buttons: works with one thumb, a keyboard and a
 * screen reader, which drag-and-drop on a phone doesn't.
 */
export function MoveButtons({
  id,
  name,
  first,
  last,
}: {
  id: string;
  name: string;
  first: boolean;
  last: boolean;
}) {
  const t = useTranslations("givingAdmin");
  const [pending, start] = useTransition();
  const btn = "flex h-[22px] w-8 cursor-pointer items-center justify-center text-ink-muted disabled:opacity-30";
  return (
    <div className="flex flex-col" role="group" aria-label={t("reorder", { name })}>
      <button
        type="button"
        className={btn}
        disabled={first || pending}
        aria-label={t("moveUp", { name })}
        onClick={() => start(() => moveMethod(id, -1))}
      >
        <Icon name="down" size={18} className="rotate-180" />
      </button>
      <button
        type="button"
        className={btn}
        disabled={last || pending}
        aria-label={t("moveDown", { name })}
        onClick={() => start(() => moveMethod(id, 1))}
      >
        <Icon name="down" size={18} />
      </button>
    </div>
  );
}
