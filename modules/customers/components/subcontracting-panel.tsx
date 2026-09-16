"use client";

import { useEffect, useState } from "react";
import { HardHatIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorMessage } from "@/shared/api/errors";
import { ErrorNotice } from "@/shared/ui/feedback";
import { formatAmount } from "@/shared/lib/format";
import { cn } from "@/lib/utils";
import * as api from "../lib/api";
import { parseAmountInput } from "./deposit-field";
import type { Project, Quote, Subcontractor } from "../lib/types";

/**
 * La sous-traitance d'une affaire : qui intervient, et pour combien.
 *
 * Demandé par le dirigeant : quatre sous-traitants réguliers, et le besoin de
 * savoir « combien il va prendre » quand on en assigne un. Tout est
 * **facultatif** — un chantier fait en interne n'a rien ici, et un
 * sous-traitant dont on ne connaît pas encore le prix s'inscrit sans montant.
 *
 * **Plusieurs par affaire**, parce qu'un chantier se partage. Le total et la
 * marge se lisent en face des devis : c'est la seule raison pour laquelle ce
 * bloc vit dans l'onglet Devis et non ailleurs.
 *
 * La marge n'est affichée que si l'affaire porte un montant de devis. Sur 531
 * devis, 136 seulement en ont un : un « 0 € de marge » serait faux, pas
 * prudent.
 */
export function SubcontractingPanel({
  project,
  quotes,
  canWrite,
  onChanged,
}: {
  project: Project;
  quotes: Quote[];
  canWrite: boolean;
  onChanged: () => void;
}) {
  const [people, setPeople] = useState<Subcontractor[] | null>(null);
  const [rows, setRows] = useState(() =>
    project.subcontractors.map((entry) => ({
      subcontractor_id: entry.subcontractor_id,
      name: entry.name,
      amount: entry.amount ? entry.amount.replace(".", ",") : "",
    })),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api
      .listSubcontractors(controller.signal)
      .then((page) => setPeople(page.items))
      .catch((cause) => {
        if (!controller.signal.aborted) setError(errorMessage(cause));
      });
    return () => controller.abort();
  }, []);

  const libres = (people ?? []).filter(
    (person) => !rows.some((row) => row.subcontractor_id === person.id),
  );
  const illisible = rows.some((row) => parseAmountInput(row.amount) === undefined);
  const total = rows.reduce((sum, row) => {
    const value = parseAmountInput(row.amount);
    return sum + (value ? Number(value) : 0);
  }, 0);
  // Le chiffré de l'affaire : le TTC s'il est connu, sinon le HT. Les factures
  // ne comptent pas — elles soldent un devis, les additionner doublerait.
  const devis = quotes.filter((quote) => !quote.reference.toUpperCase().startsWith("FA"));
  const chiffre = devis.reduce((sum, quote) => {
    const raw = quote.amount_ht ?? quote.amount_ttc;
    return sum + (raw ? Number(raw) : 0);
  }, 0);
  const part = chiffre > 0 && total > 0 ? Math.round((total / chiffre) * 100) : null;

  async function enregistrer() {
    setPending(true);
    setError(null);
    try {
      await api.setProjectSubcontractors(
        project.id,
        rows.map((row) => ({
          subcontractor_id: row.subcontractor_id,
          amount: parseAmountInput(row.amount) ?? null,
        })),
      );
      setSaved(true);
      onChanged();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <div data-demo="subcontracting" className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
          <HardHatIcon className="size-3.5" />
          Sous-traitance
        </p>
        {total > 0 && (
          <p className="text-sm font-semibold tabular-nums">
            {formatAmount(String(total))}
            {part !== null && (
              <span className="text-muted-foreground text-xs font-normal">
                {" "}
                · {part} % du chiffré
              </span>
            )}
          </p>
        )}
      </div>

      {error && <ErrorNotice message={error} />}

      {rows.length === 0 && (
        <p className="text-muted-foreground/70 text-xs">
          Aucun sous-traitant sur cette affaire. C&apos;est facultatif.
        </p>
      )}

      <ul className="flex flex-col gap-1.5">
        {rows.map((row, index) => (
          <li key={row.subcontractor_id} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{row.name}</span>
            <div className="relative w-32">
              <Input
                inputMode="decimal"
                placeholder="montant"
                value={row.amount}
                disabled={!canWrite || pending}
                aria-invalid={parseAmountInput(row.amount) === undefined || undefined}
                className="h-7 pr-6 text-xs tabular-nums"
                onChange={(event) => {
                  const value = event.target.value;
                  setSaved(false);
                  setRows((current) =>
                    current.map((entry, i) => (i === index ? { ...entry, amount: value } : entry)),
                  );
                }}
              />
              <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs">
                €
              </span>
            </div>
            {canWrite && (
              <button
                type="button"
                disabled={pending}
                aria-label={`Retirer ${row.name}`}
                className="text-muted-foreground hover:text-destructive rounded p-1"
                onClick={() => {
                  setSaved(false);
                  setRows((current) => current.filter((_, i) => i !== index));
                }}
              >
                <Trash2Icon className="size-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* La marge ne s'affiche qu'avec un chiffré : sur 531 devis, 136 en portent un. */}
      {chiffre > 0 && total > 0 && (
        <p className={cn("text-xs", chiffre - total < 0 ? "text-danger" : "text-muted-foreground")}>
          Marge estimée : {formatAmount(String(chiffre - total))} sur {formatAmount(String(chiffre))}{" "}
          de devis
        </p>
      )}

      {canWrite && (
        <div className="flex flex-wrap items-center gap-1.5">
          {libres.map((person) => (
            <Button
              key={person.id}
              size="xs"
              variant="outline"
              disabled={pending}
              onClick={() => {
                setSaved(false);
                setRows((current) => [
                  ...current,
                  { subcontractor_id: person.id, name: person.name, amount: "" },
                ]);
              }}
            >
              <PlusIcon />
              {person.name}
            </Button>
          ))}
          <Button
            size="xs"
            className="ml-auto"
            disabled={pending || illisible}
            onClick={() => void enregistrer()}
          >
            {saved ? "Enregistré" : "Enregistrer"}
          </Button>
        </div>
      )}
    </div>
  );
}
