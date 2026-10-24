"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon, type IconName } from "@/components/ui/Icon";
import { LogoMark, Wordmark } from "@/components/ui/Logo";
import { Badge } from "@/components/ui/primitives";
import type { Capability } from "@/lib/permissions";

/** Tablet/desktop navigation. Hidden on phones, where each screen has the bottom bar. */
export function AdminSidebar({
  church,
  roleLine,
  capabilities,
}: {
  church: { name: string; initials: string };
  roleLine: string;
  capabilities: Capability[];
}) {
  const t = useTranslations("adminNav");
  const tc = useTranslations("common");
  const pathname = usePathname();
  const caps = new Set(capabilities);

  const items: { href: string; icon: IconName; label: string; show: boolean }[] = [
    { href: "/admin", icon: "grid", label: t("dashboard"), show: true },
    { href: "/admin/programme", icon: "cal", label: t("programme"), show: caps.has("programme.edit") },
    { href: "/admin/posts", icon: "mega", label: t("eventsPosts"), show: caps.has("posts.edit") },
    { href: "/admin/songs", icon: "music", label: t("songs"), show: caps.has("programme.edit") },
    { href: "/admin/giving", icon: "heart", label: t("giving"), show: caps.has("giving.view") },
    { href: "/admin/team", icon: "users", label: t("team"), show: caps.has("team.invite") },
  ];

  const isOn = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

  return (
    <aside className="sticky top-0 hidden h-dvh w-[260px] shrink-0 flex-col gap-5 border-r border-line bg-surface px-4 py-6 lg:flex">
      <Link href="/" className="flex items-center gap-2.5 px-2 no-underline">
        <LogoMark size={36} />
        <Wordmark className="text-xl" />
      </Link>
      <div className="flex min-h-14 items-center gap-2.5 rounded-xl border border-line bg-canvas px-3 py-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-[13px] font-extrabold text-primary-soft-ink">
          {church.initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">{church.name}</span>
          <span className="t-caption block">{roleLine}</span>
        </span>
      </div>
      <nav aria-label={t("label")} className="flex flex-col gap-0.5">
        {items
          .filter((i) => i.show)
          .map((i) => (
            <Link
              key={i.href}
              href={i.href}
              aria-current={isOn(i.href) ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-[15px] no-underline ${
                isOn(i.href)
                  ? "bg-primary-soft font-bold text-primary-soft-ink"
                  : "font-semibold text-ink-label"
              }`}
            >
              <Icon name={i.icon} />
              {i.label}
            </Link>
          ))}
      </nav>
      <div className="h-px bg-line" />
      {/* Phase 2 clerk tools have their place reserved, so navigation won't need rebuilding. */}
      <div className="flex flex-col gap-0.5" aria-label={t("clerkTools")} role="group">
        <p className="t-caption px-3 pb-1 font-bold">{t("clerkTools")}</p>
        {[
          { icon: "list" as const, label: t("membersRoll") },
          { icon: "swap" as const, label: t("transfers") },
        ].map((i) => (
          <div key={i.label} className="flex min-h-11 items-center gap-3 px-3 text-[15px] font-semibold text-ink-label">
            <Icon name={i.icon} />
            <span className="flex-1">{i.label}</span>
            <Badge>{tc("soon")}</Badge>
          </div>
        ))}
      </div>
      <Link href="/" className="mt-auto flex min-h-11 items-center gap-2 px-3 text-sm font-semibold no-underline">
        <Icon name="left" size={18} />
        {t("memberView")}
      </Link>
    </aside>
  );
}
