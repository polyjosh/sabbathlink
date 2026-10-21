"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Chip } from "@/components/ui/controls";

/**
 * Asks for the phone's location only when the member taps "Near me" (or
 * arrives from "Churches near me"), then sorts the list by distance.
 */
export function NearMeChip({ on }: { on: boolean }) {
  const t = useTranslations("directory");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [locating, setLocating] = useState(false);

  function go(next: URLSearchParams) {
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  function locate() {
    const next = new URLSearchParams(params);
    if (on) {
      ["near", "lat", "lng"].forEach((k) => next.delete(k));
      go(next);
      return;
    }
    next.set("near", "1");
    if (!navigator.geolocation) return go(next);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        next.set("lat", pos.coords.latitude.toFixed(4));
        next.set("lng", pos.coords.longitude.toFixed(4));
        go(next);
      },
      () => {
        // Location refused or unavailable: fall back to the default area.
        setLocating(false);
        go(next);
      },
      { maximumAge: 10 * 60 * 1000, timeout: 10_000 },
    );
  }

  // Arriving from Home's "Churches near me" asks for location straight away.
  useEffect(() => {
    if (params.get("near") === "1" && !params.get("lat") && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const next = new URLSearchParams(params);
        next.set("lat", pos.coords.latitude.toFixed(4));
        next.set("lng", pos.coords.longitude.toFixed(4));
        router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      });
    }
  }, [params, pathname, router]);

  return (
    <Chip on={on} icon="pin" onClick={locate} aria-busy={locating}>
      {locating ? t("locating") : t("nearMe")}
    </Chip>
  );
}
