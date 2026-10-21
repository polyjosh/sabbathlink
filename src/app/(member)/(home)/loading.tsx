import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/primitives";

/** Skeletons use the real layout, so the page doesn't jump. No spinners for lists. */
export default async function Loading() {
  const t = await getTranslations("states");
  return (
    <div
      aria-busy="true"
      aria-label={t("loading")}
      className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col gap-3.5 bg-canvas px-4 pt-[72px]"
    >
      <Skeleton className="h-12 rounded-full" />
      <div className="overflow-hidden rounded-[18px] border border-line bg-surface">
        <div className="flex flex-col gap-2 bg-header px-4 py-3.5">
          <Skeleton className="h-2.5 w-[70px] bg-white/20" />
          <Skeleton className="h-4 w-[200px] bg-white/20" />
        </div>
        <div className="flex flex-col gap-3.5 p-4">
          <Skeleton className="h-3.5 w-3/5" />
          {[55, 50, 45].map((w) => (
            <div key={w} className="flex gap-3">
              <Skeleton className="h-3.5 w-10" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-3" style={{ width: `${w}%` }} />
                <Skeleton className="h-2.5" style={{ width: `${w + 20}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
