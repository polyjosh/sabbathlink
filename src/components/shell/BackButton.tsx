"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { IconButton } from "@/components/ui/Button";

/** Goes back within the app, or to a sensible parent when opened from a shared link. */
export function BackButton({ fallback }: { fallback: string }) {
  const router = useRouter();
  const t = useTranslations("common");
  return (
    <IconButton
      icon="left"
      label={t("back")}
      onClick={() => {
        if (window.history.length > 1 && document.referrer.startsWith(window.location.origin)) {
          router.back();
        } else {
          router.push(fallback);
        }
      }}
    />
  );
}
