"use client";

import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Chrome commun des créations guidées.
 *
 * Le CRM a trois choses qui se créent en plusieurs temps — une fiche client, un
 * rôle, une invitation — et elles doivent se ressembler : c'est le même geste,
 * appris une fois. La forme vient du wizard des fiches client, d'où elle est
 * extraite telle quelle.
 */

export type WizardStep = { title: string; hint: string };

export function WizardSteps({
  steps,
  current,
}: {
  steps: WizardStep[];
  current: number;
}) {
  return (
    <ol className="flex items-center gap-2">
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={step.title} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold",
                done && "bg-success-soft text-success",
                active && "bg-primary text-primary-foreground",
                !done && !active && "bg-muted text-muted-foreground",
              )}
            >
              {done ? <CheckIcon className="size-3.5" /> : index + 1}
            </span>
            <span
              className={cn(
                "hidden text-sm sm:block",
                active ? "font-medium" : "text-muted-foreground",
              )}
            >
              {step.title}
            </span>
            {index < steps.length - 1 && (
              <span
                className={cn("h-px flex-1", done ? "bg-success" : "bg-border")}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Barre de navigation d'un wizard : reculer, avancer, conclure. */
export function WizardNav({
  step,
  count,
  pending,
  finishLabel,
  onBack,
  onNext,
  onFinish,
  size = "lg",
}: {
  step: number;
  count: number;
  pending?: boolean;
  finishLabel: string;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
  size?: "sm" | "lg";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Button
        variant="ghost"
        size={size}
        onClick={onBack}
        disabled={step === 0 || pending}
      >
        <ArrowLeftIcon />
        Précédent
      </Button>

      {step < count - 1 ? (
        <Button size={size} onClick={onNext} disabled={pending}>
          Continuer
          <ArrowRightIcon />
        </Button>
      ) : (
        <Button size={size} onClick={onFinish} disabled={pending}>
          <CheckIcon />
          {finishLabel}
        </Button>
      )}
    </div>
  );
}

/** Récapitulatif d'un wizard : une ligne par valeur, libellé à gauche. */
export function SummaryLine({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-2.5">
      <dt className="text-muted-foreground shrink-0 text-xs">{label}</dt>
      <dd className="min-w-0 text-right text-sm whitespace-pre-line">{value}</dd>
    </div>
  );
}
