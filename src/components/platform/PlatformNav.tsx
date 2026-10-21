"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon, type IconName } from "@/components/ui/Icon";
import { LogoMark } from "@/components/ui/Logo";

/** Staff console navigation: one scrollable row on phones, the same row on desktop. */
export function PlatformNav() {
  const t = useTranslations("platform");
  const pathname = usePathname();
  const items: { href: string; icon: IconName; label: string }[] = [
    { href: "/platform", icon: "grid", label: t("nav.overview") },
    { href: "/platform/churches", icon: "church", label: t("nav.churches") },
    { href: "/platform/people", icon: "users", label: t("nav.people") },
    { href: "/platform/messages", icon: "send", label: t("nav.messages") },
    { href: "/platform/audit", icon: "history", label: t("nav.audit") },
  ];
  const isOn = (href: string) =>
    href === "/platform" ? pathname === href : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[1040px] items-center gap-2.5 px-4 pt-3">
        <LogoMark size={30} />
        <p className="min-w-0 flex-1 text-[15px] font-extrabold">{t("title")}</p>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold no-underline"
        >
          <Icon name="left" size={18} />
          {t("nav.exit")}
        </Link>
      </div>
      <nav
        aria-label={t("nav.label")}
        className="mx-auto flex max-w-[1040px] gap-1 overflow-x-auto px-2 pb-1.5 [scrollbar-width:none]"
      >
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            aria-current={isOn(i.href) ? "page" : undefined}
            className={`flex min-h-11 shrink-0 items-center gap-2 rounded-[10px] px-3 text-[15px] no-underline ${
              isOn(i.href)
                ? "bg-primary-soft font-bold text-primary-soft-ink"
                : "font-semibold text-ink-label"
            }`}
          >
            <Icon name={i.icon} size={20} />
            {i.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
