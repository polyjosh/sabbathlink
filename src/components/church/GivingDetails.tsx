"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Chip } from "@/components/ui/controls";
import { CopyButton } from "@/components/ui/CopyButton";
import { Icon } from "@/components/ui/Icon";
import { Card, IconTile } from "@/components/ui/primitives";
import type { GivingCategory, PaymentMethod } from "@/lib/types";

/** Category label: translated for the standard ones, as typed for custom ones. */
export function useCategoryLabel() {
  const t = useTranslations("categories");
  return (c: Pick<GivingCategory, "key" | "label">) => (c.key ? t(c.key) : (c.label ?? ""));
}

/**
 * Display-only giving. Numbers are large, in tabular figures, each with a copy
 * button. Picking a category updates the Paybill account word. SabbathLink
 * never collects money.
 */
export function GivingDetails({
  methods,
  categories,
}: {
  methods: PaymentMethod[];
  categories: GivingCategory[];
}) {
  const t = useTranslations("give");
  const label = useCategoryLabel();
  const [categoryId, setCategoryId] = useState(categories[0]?.id);
  const category = categories.find((c) => c.id === categoryId);
  const showsCategories = methods.some((m) => m.type === "paybill" && m.accountsByCategory);

  return (
    <>
      <div className="flex items-start gap-2.5 rounded-[14px] bg-primary-soft px-3.5 py-3 text-sm leading-5 text-primary-soft-ink">
        <Icon name="shield" />
        <p>
          <strong>{t("trustStrong")}</strong> {t("trustRest")}
        </p>
      </div>

      {showsCategories && categories.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="t-subhead">{t("whatFor")}</h2>
          <div role="radiogroup" aria-label={t("category")} className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Chip key={c.id} radio on={c.id === categoryId} onClick={() => setCategoryId(c.id)}>
                {label(c)}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {methods.map((m) => {
        if (m.type === "paybill") {
          const account = (categoryId && m.accountsByCategory?.[categoryId]) || null;
          return (
            <Card key={m.id}>
              <MethodHead icon="mobile" tone="green" title={t("paybill")} sub={t("paybillPath")} />
              <div className="h-px bg-line" />
              <NumberRow
                k={t("businessNumber")}
                v={m.number ?? ""}
                copyLabel={t("copyAria", { label: t("businessNumber"), value: m.number ?? "" })}
                toast={t("paybillCopied", { value: m.number ?? "" })}
              />
              {account && category && (
                <NumberRow
                  k={t("accountFor", { category: label(category) })}
                  v={account}
                  copyLabel={t("copyAria", { label: t("accountNumber"), value: account })}
                  toast={t("copiedToast", { label: account })}
                />
              )}
              <div>
                <p className="text-xs leading-4 font-semibold text-ink-3">{t("nameOnMpesa")}</p>
                <p className="text-base leading-[22px] font-bold">{m.accountName}</p>
              </div>
            </Card>
          );
        }
        if (m.type === "till") {
          return (
            <Card key={m.id}>
              <MethodHead
                icon="mobile"
                tone="green"
                title={t("till")}
                sub={m.note === "offering_on_the_day" ? t("tillNote") : undefined}
              />
              <div className="h-px bg-line" />
              <NumberRow
                k={t("tillNumber")}
                v={m.number ?? ""}
                copyLabel={t("copyAria", { label: t("tillNumber"), value: m.number ?? "" })}
                toast={t("copiedToast", { label: `Till ${m.number}` })}
              />
            </Card>
          );
        }
        return (
          <Card key={m.id}>
            <MethodHead
              icon="bank"
              tone="teal"
              title={t("bank")}
              sub={[m.bankName, m.branch].filter(Boolean).join(" · ")}
            />
            <div className="h-px bg-line" />
            <div>
              <p className="text-xs leading-4 font-semibold text-ink-3">{t("accountName")}</p>
              <p className="text-base leading-[22px] font-bold">{m.accountName}</p>
            </div>
            <NumberRow
              k={t("accountNumber")}
              v={m.bankAccountNumber ?? ""}
              small
              copyLabel={t("copyAria", { label: t("accountNumber"), value: m.bankAccountNumber ?? "" })}
              toast={t("copiedToast", { label: t("accountNumber") })}
            />
          </Card>
        );
      })}

      <div className="flex items-start gap-2.5 px-0.5 py-1">
        <Icon name="alert" size={18} className="mt-px text-accent-ink" />
        <p className="t-small">{t("fraud")}</p>
      </div>
    </>
  );
}

function MethodHead({
  icon,
  tone,
  title,
  sub,
}: {
  icon: "mobile" | "bank";
  tone: "green" | "teal";
  title: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <IconTile icon={icon} tone={tone} />
      <div className="min-w-0 flex-1">
        <h2 className="t-subhead">{title}</h2>
        {sub && <p className="t-caption">{sub}</p>}
      </div>
    </div>
  );
}

function NumberRow({
  k,
  v,
  copyLabel,
  toast,
  small,
}: {
  k: string;
  v: string;
  copyLabel: string;
  toast: string;
  small?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-xs leading-4 font-semibold text-ink-3">{k}</p>
        <p
          className={`font-extrabold tracking-[.04em] num ${small ? "text-xl leading-7" : "text-[22px] leading-7"}`}
        >
          {v}
        </p>
      </div>
      <CopyButton value={v.replace(/\s/g, "")} label={copyLabel} toast={toast} />
    </div>
  );
}
