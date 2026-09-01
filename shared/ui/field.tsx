"use client";

import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { useId } from "react";
import { cn } from "@/shared/lib/cn";

const controlClass =
  "w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-foreground " +
  "placeholder:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-60";

function Wrapper({
  id,
  label,
  error,
  hint,
  required,
  children,
}: {
  id: string;
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

export function TextField({ label, error, hint, className, ...props }: TextFieldProps) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  return (
    <Wrapper id={id} label={label} error={error} hint={hint} required={props.required}>
      <input
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        className={cn(controlClass, error && "border-danger", className)}
      />
    </Wrapper>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  hint?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
};

export function SelectField({
  label,
  error,
  hint,
  options,
  placeholder,
  className,
  ...props
}: SelectFieldProps) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  return (
    <Wrapper id={id} label={label} error={error} hint={hint} required={props.required}>
      <select
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        className={cn(controlClass, error && "border-danger", className)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Wrapper>
  );
}

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

export function TextAreaField({
  label,
  error,
  hint,
  className,
  ...props
}: TextAreaFieldProps) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  return (
    <Wrapper id={id} label={label} error={error} hint={hint} required={props.required}>
      <textarea
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        className={cn(controlClass, "min-h-24 resize-y", error && "border-danger", className)}
      />
    </Wrapper>
  );
}
