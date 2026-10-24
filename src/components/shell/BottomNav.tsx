"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Icon, type IconName } from "@/components/ui/Icon";

interface NavItem {
  href: string;
  icon: IconName;
  label: string;
  match: (pathname: string) => boolean;
}

/** In navigation an icon always has a text label. */
function NavBar({ items, label }: { items: NavItem[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label={label}
      className="sticky bottom-0 z-20 flex border-t border-line bg-surface px-1 pt-1.5 pb-[max(10px,env(safe-area-inset-bottom))]"
    >
      {items.map((it) => {
        const on = it.match(pathname);
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={on ? "page" : undefined}
            className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 text-xs leading-4 no-underline ${
              on ? "font-bold text-primary" : "font-semibold text-ink-2"
            }`}
          >
            <span
              className={`flex h-[30px] w-14 items-center justify-center rounded-full ${on ? "bg-primary-soft" : ""}`}
            >
              <Icon name={it.icon} />
            </span>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MemberNav() {
  const t = useTranslations("nav");
  return (
    <NavBar
      label={t("main")}
      items={[
        { href: "/", icon: "home", label: t("home"), match: (p) => p === "/" },
        {
          href: "/churches",
          icon: "church",
          label: t("churches"),
          match: (p) => p.startsWith("/churches"),
        },
        { href: "/updates", icon: "bell", label: t("updates"), match: (p) => p === "/updates" },
        { href: "/me", icon: "user", label: t("me"), match: (p) => p.startsWith("/me") },
      ]}
    />
  );
}

/** Phone admin navigation. On wide screens the sidebar replaces it. */
export function AdminNav() {
  const t = useTranslations("adminNav");
  return (
    <div className="lg:hidden">
      <NavBar
        label={t("label")}
        items={[
          { href: "/admin", icon: "grid", label: t("dashboard"), match: (p) => p === "/admin" },
          {
            href: "/admin/programme",
            icon: "cal",
            label: t("programme"),
            match: (p) => p.startsWith("/admin/programme"),
          },
          {
            href: "/admin/posts",
            icon: "mega",
            label: t("posts"),
            match: (p) => p.startsWith("/admin/posts"),
          },
          {
            href: "/admin/giving",
            icon: "heart",
            label: t("giving"),
            match: (p) => p.startsWith("/admin/giving"),
          },
          {
            href: "/admin/more",
            icon: "more",
            label: t("more"),
            match: (p) =>
              p.startsWith("/admin/more") ||
              p.startsWith("/admin/team") ||
              p.startsWith("/admin/songs"),
          },
        ]}
      />
    </div>
  );
}
