import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const inputClass =
  "block w-full min-h-11 rounded-xl border border-field bg-surface px-3.5 py-2 text-base text-fg placeholder:text-fg-muted/80 focus:border-primary focus:outline-none focus-visible:outline-3 focus-visible:outline-offset-1 aria-[invalid=true]:border-danger disabled:opacity-60";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
  optionalLabel = "optional",
}: {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
  optionalLabel?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block font-medium text-heading">
        {label}
        {required ? null : <span className="ms-1 text-sm font-normal text-fg-muted">({optionalLabel})</span>}
      </label>
      {hint ? (
        <p id={`${htmlFor}-hint`} className="text-sm text-fg-muted">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cn(inputClass, className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClass, "min-h-28 py-2.5", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: ComponentProps<"select">) {
  return (
    <select className={cn(inputClass, "appearance-auto pe-8", className)} {...rest}>
      {children}
    </select>
  );
}

export function Checkbox({ label, hint, className, id, ...rest }: ComponentProps<"input"> & { label: ReactNode; hint?: ReactNode }) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <input id={id} type="checkbox" className="mt-0.5 size-6 shrink-0 cursor-pointer rounded-md border-field accent-[var(--primary)]" {...rest} />
      <label htmlFor={id} className="cursor-pointer">
        <span className="block">{label}</span>
        {hint ? <span className="block text-sm text-fg-muted">{hint}</span> : null}
      </label>
    </div>
  );
}

/** Large tappable radio cards (mode, slot, patient pickers). */
export function RadioCard({
  name,
  value,
  checked,
  defaultChecked,
  onChange,
  children,
  className,
  disabled,
  required,
}: {
  name: string;
  value: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (v: string) => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <label
      className={cn(
        "relative flex cursor-pointer items-center gap-3 rounded-xl border border-field bg-surface p-3.5 transition has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:checked]:ring-2 has-[:checked]:ring-primary has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-focus has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
        className,
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        required={required}
        onChange={onChange ? () => onChange(value) : undefined}
        className="sr-only"
      />
      {children}
    </label>
  );
}
