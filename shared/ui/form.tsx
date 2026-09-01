"use client";

import type { ComponentProps, ReactNode } from "react";
import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * Champs de formulaire du CRM : libellé, contrôle shadcn et message d'erreur
 * dans une seule enveloppe. Les erreurs viennent telles quelles de l'API
 * (réponse `validation_failed`, dictionnaire champ → message).
 */

export function Field({
  id,
  label,
  error,
  hint,
  required,
  className,
  children,
}: {
  id: string;
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <Label htmlFor={id} className="text-muted-foreground text-xs font-medium">
          {label}
          {required && <span className="text-destructive"> *</span>}
        </Label>
      )}
      {children}
      {error ? (
        <p className="text-destructive text-xs">{error}</p>
      ) : hint ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}
    </div>
  );
}

type FieldExtras = { label?: string; error?: string; hint?: string; wrapperClassName?: string };

export function TextField({
  label,
  error,
  hint,
  wrapperClassName,
  ...props
}: ComponentProps<typeof Input> & FieldExtras) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  return (
    <Field
      id={id}
      label={label}
      error={error}
      hint={hint}
      required={props.required}
      className={wrapperClassName}
    >
      <Input {...props} id={id} aria-invalid={error ? true : undefined} />
    </Field>
  );
}

export function TextAreaField({
  label,
  error,
  hint,
  wrapperClassName,
  className,
  ...props
}: ComponentProps<typeof Textarea> & FieldExtras) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  return (
    <Field
      id={id}
      label={label}
      error={error}
      hint={hint}
      required={props.required}
      className={wrapperClassName}
    >
      <Textarea
        {...props}
        id={id}
        aria-invalid={error ? true : undefined}
        className={cn("min-h-24", className)}
      />
    </Field>
  );
}

/**
 * Radix interdit la chaîne vide comme valeur d'option ; « aucune sélection »
 * passe donc par une sentinelle interne, invisible pour l'appelant qui
 * continue de manipuler "".
 */
const NONE = "__none__";

export function SelectField({
  label,
  error,
  hint,
  wrapperClassName,
  options,
  value,
  onValueChange,
  placeholder,
  emptyLabel,
  required,
  disabled,
  id: providedId,
}: FieldExtras & {
  options: Array<{ value: string; label: string }>;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  /** Libellé de l'option « aucune valeur ». Absent = champ obligatoire. */
  emptyLabel?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
}) {
  const generatedId = useId();
  const id = providedId ?? generatedId;

  return (
    <Field
      id={id}
      label={label}
      error={error}
      hint={hint}
      required={required}
      className={wrapperClassName}
    >
      <Select
        value={value === "" ? NONE : value}
        onValueChange={(next) => onValueChange(next === NONE ? "" : next)}
        disabled={disabled}
      >
        <SelectTrigger id={id} aria-invalid={error ? true : undefined} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {emptyLabel && <SelectItem value={NONE}>{emptyLabel}</SelectItem>}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
