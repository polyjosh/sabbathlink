"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { addCategory, setCategoryEnabled } from "@/app/admin/actions";
import { useCategoryLabel } from "@/components/church/GivingDetails";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/controls";
import { Badge, Group } from "@/components/ui/primitives";
import type { GivingCategory } from "@/lib/types";

/** Categories switch on and off; churches can add their own (e.g. Harvest). */
export function CategoryList({
  categories,
  editable,
}: {
  categories: GivingCategory[];
  editable: boolean;
}) {
  const t = useTranslations("givingAdmin");
  const label = useCategoryLabel();
  const [optimistic, setOptimistic] = useOptimistic(
    categories,
    (list, change: { id: string; enabled: boolean }) =>
      list.map((c) => (c.id === change.id ? { ...c, enabled: change.enabled } : c)),
  );
  const [, start] = useTransition();
  const [adding, setAdding] = useState(false);

  return (
    <>
      <Group>
        {optimistic.map((c) => (
          <div key={c.id} className="flex min-h-[52px] items-center gap-2.5 py-1 pr-1.5 pl-3.5">
            <p className="min-w-0 flex-1 text-[15px] leading-[22px] font-bold">
              {label(c)}
              {!c.key && (
                <Badge className="ml-1">{t("custom")}</Badge>
              )}
            </p>
            {editable ? (
              <Switch
                checked={c.enabled}
                label={label(c)}
                onChange={(enabled) =>
                  start(async () => {
                    setOptimistic({ id: c.id, enabled });
                    await setCategoryEnabled(c.id, enabled);
                  })
                }
              />
            ) : null}
          </div>
        ))}
      </Group>
      {editable &&
        (adding ? (
          <form
            action={async (form) => {
              await addCategory(form);
              setAdding(false);
            }}
            className="flex items-end gap-2"
          >
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="t-label">{t("newCategory")}</span>
              <input
                name="label"
                required
                autoFocus
                maxLength={40}
                className="min-h-12 rounded-xl border-[1.5px] border-field bg-surface px-3.5 text-base text-ink outline-none focus:border-2 focus:border-primary"
              />
            </label>
            <Button type="submit">{t("add")}</Button>
          </form>
        ) : (
          <Button variant="text" icon="plus" className="self-start !px-1" onClick={() => setAdding(true)}>
            {t("addCategory")}
          </Button>
        ))}
    </>
  );
}
