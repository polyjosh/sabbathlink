"use client";

import { useOptimistic, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";
import { toggleFollow } from "@/lib/actions";

export function FollowButton({
  churchId,
  following,
  size = "sm",
}: {
  churchId: string;
  following: boolean;
  size?: "sm" | "md";
}) {
  const t = useTranslations("common");
  const [optimistic, setOptimistic] = useOptimistic(following);
  const [pending, start] = useTransition();
  const h = size === "sm" ? "min-h-10 text-sm" : "min-h-11 text-[15px]";

  return (
    <button
      type="button"
      aria-pressed={optimistic}
      disabled={pending}
      onClick={() =>
        start(async () => {
          setOptimistic(!optimistic);
          await toggleFollow(churchId);
        })
      }
      className={`inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3.5 font-semibold ${h} ${
        optimistic
          ? "bg-primary-soft text-primary-soft-ink"
          : "bg-surface text-primary shadow-[inset_0_0_0_1.5px_var(--primary)]"
      }`}
    >
      {size === "md" && <Icon name={optimistic ? "check" : "plus"} size={18} />}
      {optimistic ? t("following") : t("follow")}
    </button>
  );
}
