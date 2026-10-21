"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

/* Form controls from the design system. All targets are 44px or more. */

/** 40px filter chip. Use `role="radio"` inside a radiogroup, otherwise aria-pressed. */
export function Chip({
  on,
  icon,
  children,
  radio,
  className = "",
  ...rest
}: {
  on?: boolean;
  icon?: IconName;
  radio?: boolean;
  children: ReactNode;
} & Omit<ComponentProps<"button">, "children">) {
  const a11y = radio ? { role: "radio", "aria-checked": !!on } : { "aria-pressed": !!on };
  return (
    <button
      type="button"
      {...a11y}
      className={`inline-flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-sm leading-[18px] font-semibold whitespace-nowrap ${
        on
          ? "border-primary bg-primary text-on-primary"
          : "border-field bg-surface text-ink-label"
      } ${className}`}
      {...rest}
    >
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-[#A9B3B2]"
      }`}
    >
      <span
        className={`absolute top-[3px] size-[22px] rounded-full bg-white transition-[left] ${
          checked ? "left-[23px]" : "left-[3px]"
        }`}
      />
    </button>
  );
}

/** Pill segmented control (language, list/map, payment type). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  shape = "pill",
  className = "",
}: {
  options: { value: T; label: ReactNode; icon?: IconName }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  shape?: "pill" | "rounded";
  className?: string;
}) {
  const r = shape === "pill" ? "rounded-full" : "rounded-xl";
  const ri = shape === "pill" ? "rounded-full" : "rounded-[9px]";
  return (
    <div role="group" aria-label={label} className={`flex gap-0.5 bg-seg p-[3px] ${r} ${className}`}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`inline-flex h-[38px] min-w-11 flex-1 cursor-pointer items-center justify-center gap-1.5 px-3 text-[13px] leading-4 font-bold ${ri} ${
              on
                ? "bg-surface text-primary shadow-[0_1px_2px_rgba(22,37,42,.12)]"
                : "text-neutral-ink"
            }`}
          >
            {o.icon && <Icon name={o.icon} size={18} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Big radio card ("opt" in the design). */
export function RadioCard({
  checked,
  onSelect,
  children,
  align = "center",
}: {
  checked: boolean;
  onSelect: () => void;
  children: ReactNode;
  align?: "center" | "start";
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={`flex min-h-14 w-full cursor-pointer gap-3 rounded-[14px] bg-surface px-3.5 py-3 text-left text-ink ${
        align === "start" ? "items-start" : "items-center"
      } ${checked ? "border-2 border-primary bg-primary-tint" : "border-[1.5px] border-line-strong"}`}
    >
      <span
        aria-hidden="true"
        className={`size-[22px] shrink-0 rounded-full ${
          checked ? "border-[7px] border-primary" : "border-2 border-[#8A989B]"
        }`}
      />
      {children}
    </button>
  );
}

const inputClass =
  "w-full min-h-12 rounded-xl border-[1.5px] border-field bg-surface px-3.5 py-3 text-base leading-[22px] text-ink placeholder:text-[#66767A] outline-none focus:border-2 focus:border-primary focus:shadow-[0_0_0_4px_var(--primary-soft)]";

export function Field({
  label,
  hint,
  error,
  optionalLabel,
  children,
  htmlFor,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optionalLabel?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="t-label">
        {label}
        {optionalLabel && <span className="font-normal text-ink-3"> ({optionalLabel})</span>}
      </label>
      {children}
      {error ? (
        <p className="t-caption font-semibold text-danger-ink" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="t-caption">{hint}</p>
      )}
    </div>
  );
}

export function TextInput({
  label,
  hint,
  error,
  optionalLabel,
  className = "",
  id,
  ...rest
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  optionalLabel?: string;
} & ComponentProps<"input">) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <Field label={label} hint={hint} error={error} optionalLabel={optionalLabel} htmlFor={inputId}>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={`${inputClass} ${error ? "border-danger" : ""} ${className}`}
        {...rest}
      />
    </Field>
  );
}

export function TextArea({
  label,
  hint,
  id,
  className = "",
  ...rest
}: { label: ReactNode; hint?: ReactNode } & ComponentProps<"textarea">) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <Field label={label} hint={hint} htmlFor={inputId}>
      <textarea id={inputId} className={`${inputClass} min-h-[104px] resize-none ${className}`} {...rest} />
    </Field>
  );
}

/** Field with the +254 prefix built in. */
export function PhoneInput({
  label,
  hint,
  error,
  large,
  id,
  ...rest
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  large?: boolean;
} & ComponentProps<"input">) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <Field label={label} hint={hint} error={error} htmlFor={inputId}>
      <div
        className={`flex w-full items-center gap-2.5 rounded-xl bg-surface px-3.5 text-ink focus-within:border-2 focus-within:border-primary focus-within:shadow-[0_0_0_4px_var(--primary-soft)] ${
          large ? "min-h-14 text-lg" : "min-h-12 text-base"
        } ${error ? "border-[1.5px] border-danger" : "border-[1.5px] border-field"}`}
      >
        <span className="font-bold text-neutral-ink">+254</span>
        <span aria-hidden="true" className="h-6 w-px bg-line-strong" />
        <input
          id={inputId}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          aria-invalid={error ? true : undefined}
          className="min-w-0 flex-1 bg-transparent tracking-[.04em] outline-none placeholder:text-[#66767A]"
          {...rest}
        />
      </div>
    </Field>
  );
}

export function SelectInput({
  label,
  id,
  children,
  ...rest
}: { label: ReactNode; children: ReactNode } & ComponentProps<"select">) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <Field label={label} htmlFor={inputId}>
      <div className="relative">
        <select id={inputId} className={`${inputClass} appearance-none pr-10`} {...rest}>
          {children}
        </select>
        <Icon
          name="down"
          className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-2"
        />
      </div>
    </Field>
  );
}

/** Square checkbox from the publish screen. */
export function Checkbox({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`flex size-11 shrink-0 cursor-pointer items-center justify-center`}
      >
        <span
          className={`flex size-6 items-center justify-center rounded-md ${
            checked ? "bg-primary text-on-primary" : "border-2 border-field bg-surface"
          }`}
        >
          {checked && <Icon name="check" size={16} strokeWidth={2.6} />}
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-[22px] font-bold">{label}</p>
        {hint && <p className="t-caption">{hint}</p>}
      </div>
    </div>
  );
}
