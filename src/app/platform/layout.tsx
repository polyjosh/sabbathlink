import type { Metadata } from "next";
import { PlatformNav } from "@/components/platform/PlatformNav";
import { requireStaff } from "./guard";

export const metadata: Metadata = {
  title: { default: "Platform", template: "%s · SabbathLink platform" },
  robots: { index: false, follow: false },
};

/** SabbathLink staff console (CLAUDE.md, "Platform admin panel"). */
export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  await requireStaff();
  return (
    <div className="min-h-dvh bg-canvas">
      <PlatformNav />
      {children}
    </div>
  );
}
