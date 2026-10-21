"use client";

import { Icon } from "@/components/ui/Icon";
import { whatsappUrl } from "@/lib/programme";

/** Uses the phone's share sheet when there is one, otherwise WhatsApp. */
export function ShareLink({
  title,
  url,
  label,
  variant = "tile",
}: {
  title: string;
  url: string;
  label: string;
  variant?: "tile" | "icon";
}) {
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Dismissed: nothing to do.
        return;
      }
    }
    window.open(whatsappUrl(`${title}\n${url}`), "_blank", "noopener,noreferrer");
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={share}
        aria-label={label}
        className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink"
      >
        <Icon name="share" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={share}
      className="flex min-h-[60px] cursor-pointer flex-col items-center justify-center gap-1 py-2.5 text-[13px] font-bold text-primary"
    >
      <Icon name="chat" />
      {label}
    </button>
  );
}
