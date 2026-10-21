import type { ReactNode } from "react";
import { Button, type ButtonVariant } from "@/components/ui/Button";

/**
 * A staff action that needs a written reason (reject, suspend, remove…).
 * Collapsed behind its button label until opened, so a stray tap does nothing.
 * Server component: works without JavaScript.
 */
export function ReasonForm({
  action,
  label,
  reasonLabel,
  submitLabel,
  hidden,
  variant = "danger",
  required = true,
}: {
  action: (form: FormData) => Promise<void>;
  label: ReactNode;
  reasonLabel: string;
  submitLabel: string;
  hidden: Record<string, string>;
  variant?: ButtonVariant;
  required?: boolean;
}) {
  return (
    <details className="group rounded-xl border border-line bg-surface [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex min-h-11 cursor-pointer list-none items-center px-3.5 text-[15px] font-semibold text-primary">
        {label}
      </summary>
      <form action={action} className="flex flex-col gap-2 px-3.5 pb-3.5">
        {Object.entries(hidden).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <label className="t-label" htmlFor={`reason-${Object.values(hidden).join("-")}`}>
          {reasonLabel}
        </label>
        <textarea
          id={`reason-${Object.values(hidden).join("-")}`}
          name="reason"
          required={required}
          maxLength={300}
          rows={2}
          className="min-h-[72px] w-full resize-none rounded-xl border-[1.5px] border-field bg-surface px-3.5 py-3 text-base outline-none focus:border-primary"
        />
        <Button type="submit" variant={variant} size="sm" className="self-start">
          {submitLabel}
        </Button>
      </form>
    </details>
  );
}
