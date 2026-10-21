import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/primitives";

export default async function NotFound() {
  const t = await getTranslations("states");
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center bg-canvas px-4">
      <EmptyState
        icon="search"
        title={t("notFoundTitle")}
        action={
          <ButtonLink href="/" variant="secondary">
            {t("goHome")}
          </ButtonLink>
        }
      >
        <p>{t("notFoundBody")}</p>
      </EmptyState>
    </main>
  );
}
