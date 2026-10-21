"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { inviteAdmin } from "@/app/admin/actions";
import { Button } from "@/components/ui/Button";
import { Chip, PhoneInput } from "@/components/ui/controls";
import { Banner, Card } from "@/components/ui/primitives";
import { formatKenyanPhone } from "@/lib/phone";
import type { AdminRole } from "@/lib/types";

const ROLES: AdminRole[] = ["communication", "treasurer", "elder"];

export function InviteForm() {
  const t = useTranslations("team");
  const ts = useTranslations("signIn");
  const tr = useTranslations("adminRoles");
  const [role, setRole] = useState<AdminRole>("communication");
  const [state, action, pending] = useActionState(inviteAdmin, null);

  return (
    <Card className="gap-3">
      <h2 className="t-subhead">{t("invite")}</h2>
      {state?.sentTo && (
        <Banner tone="success" icon="check" className="rounded-xl">
          {t("inviteSent", { phone: formatKenyanPhone(state.sentTo) })}
        </Banner>
      )}
      <form action={action} className="flex flex-col gap-3">
        <PhoneInput
          name="phone"
          label={t("phone")}
          placeholder="7XX XXX XXX"
          error={state?.error === "phone" ? ts("phoneError") : undefined}
          required
        />
        <input type="hidden" name="role" value={role} />
        <div role="radiogroup" aria-label={t("role")} className="flex flex-wrap gap-1.5">
          {ROLES.map((r) => (
            <Chip key={r} radio on={role === r} onClick={() => setRole(r)}>
              {tr(r)}
            </Chip>
          ))}
        </div>
        <Button type="submit" disabled={pending}>
          {t("sendInvite")}
        </Button>
      </form>
    </Card>
  );
}
