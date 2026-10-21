import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { MapPreview } from "@/components/church/MapPreview";
import { Icon } from "@/components/ui/Icon";
import { CopyButton } from "@/components/ui/CopyButton";
import { Card } from "@/components/ui/primitives";
import { getChurch } from "@/lib/data";
import { directionsUrl } from "@/lib/geo";
import { itemTitle, type ProgrammeT } from "@/lib/programme";
import { serviceTimeText } from "@/lib/time";
import type { Locale } from "@/lib/types";

export default async function ChurchAboutPage({ params }: { params: Promise<{ slug: string }> }) {
  const church = await getChurch((await params).slug);
  if (!church) notFound();
  const t = await getTranslations("church");
  const tp = await getTranslations("programme");
  const tw = await getTranslations("weekday");
  const locale = (await getLocale()) as Locale;
  const address = `${church.landmark}, ${church.town}, ${church.county}`;

  return (
    <main className="flex flex-1 flex-col gap-3.5 px-4 pt-3.5 pb-4">
      <Card>
        <MapPreview lat={church.lat} lng={church.lng} name={church.name} />
        <div>
          <h2 className="t-subhead">{church.landmark}</h2>
          <p className="t-small">
            {church.town}, {church.county}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={directionsUrl(church)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-3.5 text-[15px] font-semibold text-on-primary no-underline"
          >
            <Icon name="nav" size={18} />
            {t("directions")}
          </a>
          <CopyButton variant="outline" value={address} label={t("copyAddress")} toast={t("addressCopied")}>
            {t("copyAddress")}
          </CopyButton>
        </div>
      </Card>

      <Card className="gap-1">
        <h2 className="t-overline pb-1">{t("serviceTimes")}</h2>
        {church.serviceTimes.map((s) => (
          <div key={`${s.kind}-${s.day}`} className="flex min-h-11 items-center gap-3">
            <p className="flex-1 text-[15px] leading-[22px] font-bold">
              {itemTitle({ kind: s.kind, title: s.title }, tp as unknown as ProgrammeT)}
            </p>
            <p className="t-small">
              {tw(s.day)} · {serviceTimeText(s.time, locale)}
            </p>
          </div>
        ))}
      </Card>
    </main>
  );
}
