import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

/* Small presentational pieces from the design system. */

export type BadgeTone = "verified" | "success" | "warn" | "danger" | "neutral";

const badgeTones: Record<BadgeTone, string> = {
  verified: "bg-primary-soft text-primary-soft-ink",
  success: "bg-success-soft text-success-ink",
  warn: "bg-warn-soft text-warn-ink",
  danger: "bg-danger-soft text-danger-ink",
  neutral: "bg-neutral-soft text-neutral-ink",
};

/** Status always uses words plus colour. */
export function Badge({
  tone = "neutral",
  icon,
  children,
  className = "",
}: {
  tone?: BadgeTone;
  icon?: IconName;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs leading-4 font-bold whitespace-nowrap ${badgeTones[tone]} ${className}`}
    >
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  );
}

/** White surface, 1px line, 16px radius, no shadow. */
export function Card({
  children,
  className = "",
  as: Tag = "section",
  ...rest
}: { children: ReactNode; className?: string; as?: "section" | "article" | "div" } & Omit<
  ComponentProps<"section">,
  "children" | "ref"
>) {
  return (
    <Tag
      className={`flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-3.5 ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Grouped list rows, as in Profile and settings. */
export function Group({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border border-line bg-surface [&>*+*]:border-t [&>*+*]:border-line-soft ${className}`}
    >
      {children}
    </div>
  );
}

export function GroupHeading({ children }: { children: ReactNode }) {
  return <h2 className="px-1 text-[13px] leading-[18px] font-bold text-neutral-ink">{children}</h2>;
}

/** Initials instead of photos keeps pages light. */
export function Avatar({
  initials,
  size = "md",
  tone = "teal",
}: {
  initials: string;
  size?: "sm" | "md" | "lg";
  tone?: "teal" | "amber" | "neutral" | "solid";
}) {
  const sizes = {
    sm: "size-10 rounded-full text-sm",
    md: "size-11 rounded-[14px] text-[15px]",
    lg: "size-14 rounded-[18px] text-[19px]",
  };
  const tones = {
    teal: "bg-primary-soft text-primary-soft-ink",
    amber: "bg-warn-soft text-warn-ink",
    neutral: "bg-neutral-soft text-neutral-ink",
    solid: "bg-primary text-on-primary",
  };
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center font-extrabold ${sizes[size]} ${tones[tone]}`}
    >
      {initials}
    </span>
  );
}

export function Banner({
  tone,
  icon,
  children,
  action,
  className = "",
}: {
  tone: "offline" | "warn" | "success" | "info";
  icon: IconName;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const tones = {
    offline: "bg-offline text-white",
    warn: "bg-warn-soft text-warn-ink-strong",
    success: "bg-success-soft text-success-ink",
    info: "bg-primary-soft text-primary-soft-ink",
  };
  return (
    <div
      role="status"
      className={`flex items-center gap-2.5 px-4 py-2.5 text-sm leading-5 font-semibold ${tones[tone]} ${className}`}
    >
      <Icon name={icon} size={18} />
      <span className="min-w-0 flex-1">{children}</span>
      {action}
    </div>
  );
}

/** Inline note panel (amber), e.g. "2 roles will show To be announced". */
export function Note({
  icon = "info",
  children,
  tone = "warn",
}: {
  icon?: IconName;
  children: ReactNode;
  tone?: "warn" | "info";
}) {
  const tones = {
    warn: "bg-warn-soft text-warn-ink-strong [&_svg]:text-warn-ink",
    info: "bg-primary-soft text-primary-soft-ink",
  };
  return (
    <div className={`flex items-start gap-2.5 rounded-xl px-3 py-2.5 ${tones[tone]}`}>
      <Icon name={icon} size={18} className="mt-px" />
      <p className="t-small text-inherit">{children}</p>
    </div>
  );
}

export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div style={style} className={`rounded-lg bg-skeleton ${className}`} />;
}

export function EmptyState({
  icon,
  tone = "teal",
  title,
  children,
  action,
  className = "",
}: {
  icon: IconName;
  tone?: "teal" | "amber" | "danger";
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const tones = {
    teal: "bg-primary-soft text-primary",
    amber: "bg-warn-soft text-warn-ink",
    danger: "bg-danger-soft text-danger-ink",
  };
  return (
    <div className={`flex flex-col items-center gap-2.5 text-center ${className}`}>
      <div className={`flex size-[72px] items-center justify-center rounded-full ${tones[tone]}`}>
        <Icon name={icon} size={32} />
      </div>
      <h2 className="t-heading">{title}</h2>
      {children && <div className="flex max-w-[290px] flex-col gap-2.5 t-small">{children}</div>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Tappable list row with a chevron. */
export function RowLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-14 items-center gap-3 px-3.5 py-2 text-ink no-underline ${className}`}
    >
      {children}
      <Icon name="right" size={18} className="text-ink-muted" />
    </Link>
  );
}

/** Square icon tile used in list rows and quick actions. */
export function IconTile({
  icon,
  tone = "teal",
  size = 36,
}: {
  icon: IconName;
  tone?: "teal" | "green" | "neutral";
  size?: number;
}) {
  const tones = {
    teal: "bg-primary-soft text-primary",
    green: "bg-success-soft text-success-ink",
    neutral: "bg-surface-2 text-primary",
  };
  return (
    <span
      style={{ width: size, height: size }}
      className={`flex shrink-0 items-center justify-center rounded-[10px] ${tones[tone]}`}
    >
      <Icon name={icon} size={18} />
    </span>
  );
}

/** Calendar date tile (amber) for events. */
export function DateTile({ month, day }: { month: string; day: string }) {
  return (
    <div className="flex h-[54px] w-[50px] shrink-0 flex-col items-center justify-center rounded-xl bg-warn-soft text-warn-ink">
      <span className="text-xs font-bold uppercase">{month}</span>
      <b className="text-[19px] leading-[21px] font-extrabold">{day}</b>
    </div>
  );
}
