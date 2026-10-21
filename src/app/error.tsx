"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/primitives";

/** Plain words, a likely cause and a retry. */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("states");
  return (
    <main role="alert" className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center bg-canvas px-4">
      <div className="rounded-2xl border border-line bg-surface px-[18px] py-7">
        <EmptyState
          icon="alert"
          tone="danger"
          title={t("errorTitle")}
          action={
            <Button icon="refresh" className="w-full" onClick={reset}>
              {t("retry")}
            </Button>
          }
        >
          <p>{t("errorBody")}</p>
        </EmptyState>
      </div>
    </main>
  );
}
