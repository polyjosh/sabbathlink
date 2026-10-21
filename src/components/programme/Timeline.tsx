import { useLocale, useTranslations } from "next-intl";
import { itemTitle, roleLabel, type ProgrammeT } from "@/lib/programme";
import { serviceTime, toClockTime } from "@/lib/time";
import type { Locale, ProgrammeItem } from "@/lib/types";

/**
 * The member's programme: one timeline, with roles labelled the same way
 * every week so members learn where to look. Divine Service is highlighted.
 */
export function Timeline({ items, sunset }: { items: ProgrammeItem[]; sunset?: string }) {
  const t = useTranslations("programme");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const pt = t as unknown as ProgrammeT;

  return (
    <ol className="flex flex-col">
      {items.map((item, i) => {
        const time = serviceTime(item.startTime, locale);
        const last = i === items.length - 1;
        const highlight = item.kind === "divine_service";
        const roles = item.roles.filter((r) => r.roleKey !== "sermon_title");
        const sermon = item.roles.find((r) => r.roleKey === "sermon_title")?.value;
        return (
          <li key={item.id} className="grid grid-cols-[52px_20px_minmax(0,1fr)] gap-x-2">
            <div className="pt-3.5 text-right text-[15px] leading-[22px] font-extrabold num">
              {time.time}
              <small className="block text-xs font-semibold text-ink-3">{time.period}</small>
            </div>
            <div aria-hidden="true" className="flex flex-col items-center">
              <span
                className={`mt-[19px] size-3 shrink-0 rounded-full shadow-[0_0_0_4px_var(--canvas)] ${
                  highlight ? "bg-accent" : last ? "bg-[#B6C2C1]" : "bg-primary"
                }`}
              />
              {!last && <span className="w-0.5 flex-1 bg-line-strong" />}
            </div>
            <div
              className={`my-1.5 flex flex-col gap-1.5 rounded-[14px] border bg-surface px-3.5 py-3 ${
                highlight ? "border-warn-line" : "border-line"
              }`}
            >
              <h2 className="t-subhead">
                {itemTitle(item, pt)}
                {item.kind === "vespers" && ` · ${t("closingSabbath")}`}
              </h2>
              {sermon && <p className="t-small text-neutral-ink italic">&ldquo;{sermon}&rdquo;</p>}
              {roles.length > 0 && (
                <dl className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-sm leading-5">
                  {roles.map((r) => (
                    <div key={r.id} className="contents">
                      <dt className="text-ink-3">{roleLabel(r, pt)}</dt>
                      <dd className={r.value ? "" : "text-accent-ink italic"}>
                        {r.value ?? tc("tba")}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {item.kind === "vespers" && sunset && (
                <p className="t-small">
                  {t("sunset", {
                    time:
                      locale === "sw"
                        ? `${serviceTime(sunset, "sw").time} ${serviceTime(sunset, "sw").period}`
                        : `${toClockTime(sunset).time} ${toClockTime(sunset).period}`,
                  })}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
