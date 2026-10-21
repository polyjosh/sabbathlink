"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/Icon";

/**
 * Low data by default: a drawn placeholder until the member taps "Load map".
 * Then an OpenStreetMap embed loads (no API key, no extra JS bundle).
 */
export function MapPreview({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  const t = useTranslations("church");
  const [loaded, setLoaded] = useState(false);
  const d = 0.006;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lng}`;

  if (loaded) {
    return (
      <iframe
        title={t("mapLoaded", { name })}
        src={src}
        loading="lazy"
        className="h-[180px] w-full rounded-xl border-0"
      />
    );
  }

  return (
    <div
      role="group"
      aria-label={t("mapNotLoaded")}
      className="relative flex h-[110px] items-center justify-center overflow-hidden rounded-xl bg-map"
    >
      <div aria-hidden="true">
        <div className="absolute top-[50px] -left-2.5 h-2.5 w-[110%] -rotate-[10deg] bg-map-road" />
        <div className="absolute -top-2.5 left-[140px] h-[140px] w-2.5 rotate-12 bg-map-road" />
      </div>
      <Icon name="pin" size={34} className="relative fill-white text-primary" />
      <button
        type="button"
        onClick={() => setLoaded(true)}
        className="absolute right-2 bottom-2 inline-flex min-h-11 cursor-pointer items-center rounded-xl bg-surface px-3 text-[13px] font-semibold text-primary shadow-[inset_0_0_0_1.5px_var(--primary)]"
      >
        {t("loadMap")}
      </button>
    </div>
  );
}
