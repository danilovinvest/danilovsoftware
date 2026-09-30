"use client";

import { useState } from "react";
import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TextField } from "@/shared/ui/form";
import { formatAmount, formatDate } from "@/shared/lib/format";
import { cn } from "@/lib/utils";
import { amountToInput, parseAmountInput } from "../lib/amount";
import { COPRO_JALONS } from "../lib/copro-jalons";
import type { Jalons } from "../lib/jalons";
import type { CoproValidations as Validations } from "../lib/syndic-types";
import { StepDateButton } from "./step-date-editor";

/**
 * Les validations d'une copropriété, sous l'après-signature (migration 109) :
 * l'assemblée générale, le vote des travaux, les fonds de l'assureur, le bon
 * pour accord du syndic et le PV qu'il contresigne.
 *
 * Elles s'écrivent par la route des jalons, sous le même calendrier que les
 * autres lignes. Aucune n'est obligatoire et aucune ne réclame : un sinistre
 * fait intervenir l'assureur, une étude n'a pas toujours besoin d'un vote. Le
 * bloc ne s'affiche que là où il a un sens (`coproApplies`).
 */
export function CoproValidations({
  jalons,
  disabled,
  onWrite,
}: {
  jalons: Jalons;
  disabled?: boolean;
  /** Écrit les seules clés touchées, par la route des jalons. */
  onWrite: (patch: Partial<Validations>) => unknown;
}) {
  return (
    <div className="flex flex-col gap-2 border-t pt-3" data-demo="copro-validations">
      <p className="text-muted-foreground text-xs font-medium">
        Validations de la copropriété — facultatives, dans l&apos;ordre où elles arrivent
      </p>
      <ul className="flex flex-col">
        {COPRO_JALONS.map((jalon) => {
          const at = jalons[jalon.key];
          const insurance = jalon.picks === "insurance";
          const expected = insurance ? expectedFunds(jalons) : "";
          return (
            <li key={jalon.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5">
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
                  at ? "bg-success border-success" : "border-border",
                )}
              >
                {at && <CheckIcon className="text-background size-2.5" strokeWidth={4} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className={cn("text-sm", at ? "text-foreground" : "text-muted-foreground")}>
                  {jalon.label}
                </div>
                <div className="text-muted-foreground/70 text-xs">
                  {at ? formatDate(at) : expected ? `Attendus : ${expected}` : jalon.hint}
                  {at && expected && ` · ${expected}`}
                </div>
              </div>
              {insurance ? (
                <InsuranceButton jalons={jalons} disabled={disabled} onWrite={onWrite} />
              ) : (
                <StepDateButton
                  title={jalon.label}
                  value={at}
                  mode={jalon.picks === "date" ? "booking" : "past"}
                  disabled={disabled}
                  onPick={(value) => onWrite({ [jalon.key]: value })}
                />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** « AXA · 12 000,00 € », ce qu'on en sait. */
function expectedFunds(jalons: Jalons): string {
  return [
    jalons.insurance_funds_insurer,
    jalons.insurance_funds_amount ? formatAmount(jalons.insurance_funds_amount) : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Les fonds d'assurance : qui, combien, et le jour où ils arrivent.
 *
 * Trois champs pour une ligne, parce qu'on sait l'assureur et le montant bien
 * avant de recevoir — OXIA attendait AXA pour Le Marot. Le jour vide laisse la
 * ligne « attendue », et vider l'assureur et le montant retire ce qu'on en
 * savait.
 */
function InsuranceButton({
  jalons,
  disabled,
  onWrite,
}: {
  jalons: Jalons;
  disabled?: boolean;
  onWrite: (patch: Partial<Validations>) => unknown;
}) {
  const [open, setOpen] = useState(false);
  const known = Boolean(
    jalons.insurance_funds_insurer || jalons.insurance_funds_amount || jalons.insurance_funds_received_at,
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="xs" variant={known ? "ghost" : "outline"} disabled={disabled}>
          {known ? "Modifier" : "Renseigner"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        {open && (
          <InsuranceForm
            jalons={jalons}
            onSave={async (patch) => {
              // Un échec garde la saisie ouverte : fermer la perdrait.
              if ((await onWrite(patch)) !== false) setOpen(false);
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

function InsuranceForm({
  jalons,
  onSave,
}: {
  jalons: Jalons;
  onSave: (patch: Partial<Validations>) => Promise<void>;
}) {
  const [insurer, setInsurer] = useState(jalons.insurance_funds_insurer);
  const [amount, setAmount] = useState(() => amountToInput(jalons.insurance_funds_amount));
  const [day, setDay] = useState(jalons.insurance_funds_received_at?.slice(0, 10) ?? "");
  const [pending, setPending] = useState(false);
  const parsed = parseAmountInput(amount);

  async function submit() {
    if (parsed === undefined) return;
    setPending(true);
    try {
      await onSave({
        insurance_funds_insurer: insurer.trim(),
        insurance_funds_amount: parsed,
        // Midi, heure locale : le jour ne glisse pas d'un fuseau à l'autre.
        insurance_funds_received_at: day ? new Date(`${day}T12:00:00`).toISOString() : null,
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">Fonds d&apos;assurance</p>
      <TextField
        label="Assureur"
        placeholder="AXA"
        value={insurer}
        autoFocus
        onChange={(event) => setInsurer(event.target.value)}
      />
      <TextField
        label="Montant attendu"
        inputMode="decimal"
        value={amount}
        error={amount !== "" && parsed === undefined ? "Un montant en euros." : undefined}
        onChange={(event) => setAmount(event.target.value)}
      />
      <TextField
        label="Reçus le"
        type="date"
        value={day}
        hint="Vide tant qu'ils sont attendus."
        onChange={(event) => setDay(event.target.value)}
      />
      <div className="flex justify-end">
        <Button size="sm" disabled={pending || parsed === undefined} onClick={() => void submit()}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}
