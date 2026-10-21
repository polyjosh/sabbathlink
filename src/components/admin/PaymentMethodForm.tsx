"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { requestMethodChange } from "@/app/admin/actions";
import { useCategoryLabel } from "@/components/church/GivingDetails";
import { BackButton } from "@/components/shell/BackButton";
import { Screen, TopBar } from "@/components/shell/Screen";
import { Button } from "@/components/ui/Button";
import { Segmented, TextInput } from "@/components/ui/controls";
import { Icon } from "@/components/ui/Icon";
import { Note } from "@/components/ui/primitives";
import type { GivingCategory, PaymentMethod, PaymentMethodType } from "@/lib/types";

/** Each category gets its own account word. A second admin must approve any change to a number. */
export function PaymentMethodForm({
  method,
  categories,
}: {
  method: PaymentMethod | null;
  categories: GivingCategory[];
}) {
  const t = useTranslations("givingAdmin");
  const label = useCategoryLabel();
  const [type, setType] = useState<PaymentMethodType>(method?.type ?? "paybill");
  const numberClass = "font-bold tracking-[.04em]";

  return (
    <form action={requestMethodChange} className="contents">
      <input type="hidden" name="methodId" value={method?.id ?? ""} />
      <input type="hidden" name="type" value={type} />
      <Screen
        className="lg:max-w-[640px]"
        top={
          <TopBar>
            <BackButton fallback="/admin/giving" />
            <h1 className="t-subhead flex-1">{t("methodTitle")}</h1>
          </TopBar>
        }
        footer={
          <div className="flex gap-2">
            {method && (
              <Button
                type="submit"
                name="intent"
                value="remove"
                formNoValidate
                variant="danger"
                aria-label={t("remove")}
              >
                <Icon name="trash" size={18} />
              </Button>
            )}
            <Button type="submit" className="flex-1">
              {t("sendForApproval")}
            </Button>
          </div>
        }
      >
        <Segmented
          label={t("type")}
          shape="rounded"
          value={type}
          onChange={setType}
          options={[
            { value: "paybill", label: t("paybill") },
            { value: "till", label: t("till") },
            { value: "bank", label: t("bank") },
          ]}
        />
        {type === "bank" ? (
          <>
            <TextInput name="bankName" label={t("bankName")} defaultValue={method?.bankName} required />
            <TextInput name="branch" label={t("branch")} defaultValue={method?.branch} />
            <TextInput name="accountName" label={t("accountName")} defaultValue={method?.accountName} required />
            <TextInput
              name="bankAccountNumber"
              label={t("accountNumber")}
              inputMode="numeric"
              defaultValue={method?.bankAccountNumber}
              className={numberClass}
              required
            />
          </>
        ) : (
          <>
            <TextInput
              name="number"
              label={type === "paybill" ? t("businessNumber") : t("tillNumber")}
              inputMode="numeric"
              pattern="\d{5,8}"
              defaultValue={method?.number}
              className={numberClass}
              required
            />
            <TextInput
              name="accountName"
              label={t("nameOnMpesa")}
              hint={t("nameHint")}
              defaultValue={method?.accountName}
              required
            />
          </>
        )}
        {type === "paybill" && categories.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="t-label">{t("perCategory")}</p>
            {categories.map((c) => (
              <div key={c.id} className="grid grid-cols-[minmax(0,1fr)_128px] items-center gap-2">
                <span className="t-small text-ink">{label(c)}</span>
                <input
                  name={`account:${c.id}`}
                  aria-label={t("accountFor", { category: label(c) })}
                  defaultValue={method?.accountsByCategory?.[c.id] ?? ""}
                  maxLength={20}
                  className="min-h-11 w-full rounded-xl border-[1.5px] border-field bg-surface px-3 py-2 text-[15px] font-bold tracking-[.03em] text-ink uppercase outline-none focus:border-2 focus:border-primary"
                />
              </div>
            ))}
          </div>
        )}
        <Note icon="shield">{t("approvalNote")}</Note>
      </Screen>
    </form>
  );
}
