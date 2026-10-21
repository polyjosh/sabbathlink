import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/primitives";
import type { AuditEntry } from "@/lib/data/platform";
import { formatDate } from "@/lib/time";
import type { Locale } from "@/lib/types";

/** Audit entries as readable lines: "Mon 21 Oct, 14:02 · Jane W. verified the church". */
export async function AuditList({
  entries,
  showChurch = true,
}: {
  entries: AuditEntry[];
  showChurch?: boolean;
}) {
  const t = await getTranslations("platform");
  const locale = (await getLocale()) as Locale;
  if (entries.length === 0) {
    return (
      <Card>
        <p className="t-small">{t("audit.none")}</p>
      </Card>
    );
  }
  const label = (action: string) => {
    // Built at runtime from audit_log.action, so checked with has() before use.
    const key = `audit.actions.${action.replace(/\./g, "_")}` as Parameters<typeof t>[0];
    return t.has(key) ? t(key) : action;
  };
  return (
    <Card className="gap-0 p-0">
      <ul className="flex flex-col [&>*+*]:border-t [&>*+*]:border-line-soft">
        {entries.map((e) => {
          const reason = typeof e.detail?.reason === "string" ? e.detail.reason : null;
          return (
            <li key={e.id} className="flex flex-col gap-0.5 px-3.5 py-2.5">
              <p className="text-[15px] leading-[22px]">
                <strong>
                  {e.actorId ? (
                    <Link href={`/platform/people/${e.actorId}`}>
                      {e.actorName || t("audit.someone")}
                    </Link>
                  ) : (
                    t("audit.system")
                  )}
                </strong>{" "}
                · {label(e.action)}
                {e.subject && !e.action.startsWith("viewed.") && <> · {e.subject}</>}
              </p>
              <p className="t-caption">
                {formatDate(e.at, locale, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {showChurch && e.churchId && e.churchName && (
                  <>
                    {" · "}
                    <Link href={`/platform/churches/${e.churchId}`}>{e.churchName}</Link>
                  </>
                )}
              </p>
              {reason && <p className="t-small">{t("church.reason", { reason })}</p>}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
