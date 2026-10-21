import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

/*
 * Buttons from the design system. 48px by default, 56px ("lg") for the one
 * main action on a screen. Accent (amber) is only for Give; share green is
 * only for WhatsApp; destructive actions are outlined.
 */
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "text"
  | "accent"
  | "share"
  | "danger"
  | "soft";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold no-underline cursor-pointer select-none disabled:cursor-not-allowed disabled:bg-[#E6E8E6] disabled:text-[#6B777A] disabled:shadow-none";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary",
  secondary: "bg-surface text-primary shadow-[inset_0_0_0_1.5px_var(--primary)]",
  text: "bg-transparent text-primary",
  accent: "bg-accent text-on-accent",
  share: "bg-share text-white",
  danger: "bg-surface text-danger shadow-[inset_0_0_0_1.5px_var(--danger)]",
  soft: "bg-primary-soft text-primary-soft-ink",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-11 px-3.5 text-[15px] leading-5",
  md: "min-h-12 px-5 text-base leading-5",
  lg: "min-h-14 px-5 text-[17px] leading-5",
};

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra = "",
) {
  const pad = variant === "text" && size !== "sm" ? "px-3" : "";
  return `${base} ${variants[variant]} ${sizes[size]} ${pad} ${extra}`;
}

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  className?: string;
  children?: ReactNode;
}

export function Button({
  variant,
  size,
  icon,
  iconRight,
  className,
  children,
  type = "button",
  ...rest
}: CommonProps & ComponentProps<"button">) {
  const iconSize = size === "sm" ? 18 : 22;
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...rest}>
      {icon && <Icon name={icon} size={iconSize} />}
      {children}
      {iconRight && <Icon name={iconRight} size={18} />}
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  icon,
  iconRight,
  className,
  children,
  ...rest
}: CommonProps & ComponentProps<typeof Link>) {
  const iconSize = size === "sm" ? 18 : 22;
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon && <Icon name={icon} size={iconSize} />}
      {children}
      {iconRight && <Icon name={iconRight} size={18} />}
    </Link>
  );
}

/** 44×44 icon-only button. Always needs an accessible label. */
export function IconButton({
  icon,
  label,
  className = "",
  iconSize = 22,
  type = "button",
  ...rest
}: { icon: IconName; label: string; iconSize?: number } & Omit<
  ComponentProps<"button">,
  "children"
>) {
  return (
    <button
      type={type}
      aria-label={label}
      className={`inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink ${className}`}
      {...rest}
    >
      <Icon name={icon} size={iconSize} />
    </button>
  );
}

export function IconLink({
  icon,
  label,
  className = "",
  ...rest
}: { icon: IconName; label: string } & Omit<ComponentProps<typeof Link>, "children">) {
  return (
    <Link
      aria-label={label}
      className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink ${className}`}
      {...rest}
    >
      <Icon name={icon} />
    </Link>
  );
}
