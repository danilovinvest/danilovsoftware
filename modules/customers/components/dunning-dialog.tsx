"use client";

import { useState } from "react";
import { TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePermission } from "@/modules/auth";
import { LIVE, useCached } from "@/shared/api/cache";
import { askConfirm } from "@/shared/ui/confirm";
import { ErrorNotice } from "@/shared/ui/feedback";
import { SelectField, TextField } from "@/shared/ui/form";
import { Bar } from "@/shared/ui/loading";
import { formatAmount, formatDate, todayLocal } from "@/shared/lib/format";
import { useAction } from "../hooks/use-customers";
import { amountToInput, parseAmountInput } from "../lib/amount";
import { addDunningStep, getDunning, removeDunningStep } from "../lib/syndic-api";
import { refreshSyndicViews } from "../lib/syndic-cache";
import { DUNNING_ORDER, DUNNING_STAGE, nextDunningStage } from "../lib/syndic-labels";
import type { Dunning, DunningStage } from "../lib/syndic-types";

const STAGES = DUNNING_ORDER.map((value) => ({ value, label: DUNNING_STAGE[value].label }));

/**
 * L'échelle de recouvrement d'une facture (migration 109) : courriel, LRAR,
 * huissier, assignation, décision.
 *
 * Jardin Secret : une LRAR, une sommation portant sur un montant périmé, une
 * ordonnance de rejet, et rien pour le suivre. Chaque marche est datée et dit
 * ce qu'elle réclamait **ce jour-là** ; le reste dû, lui, n'est jamais écrit —
 * le serveur le recalcule, et c'est lui qu'on transmet à l'huissier. Une marche
 * qui a réclamé autre chose que le reste dû d'aujourd'hui le dit.
 */
export function DunningDialog({
  quoteId,
  title,
  onClose,
  onChanged,
}: {
  quoteId: string;
  /** La facture, telle qu'on la nomme : « G · FA2025-0412 ». */
  title: string;
  onClose: () => void;
  /** Une marche ajoutée ou retirée : les listes qui la résument se relisent. */
  onChanged?: () => void;
}) {
  const canWrite = usePermission("quotes:write");
  const { data, error, mutate } = useCached(`customers:dunning:${quoteId}`, () => getDunning(quoteId), LIVE);
  const remove = useAction(removeDunningStep);

  function adopt(next: Dunning) {
    void mutate(next, { revalidate: false });
    // Le portefeuille et la liste du recouvrement résument cette échelle.
    refreshSyndicViews();
    onChanged?.();
  }

  async function retirer(stepId: string, label: string) {
    const sure = await askConfirm({
      title: `Retirer « ${label} » ?`,
      description: "La marche quitte l'échelle de cette facture. Le reste dû ne change pas.",
      confirmLabel: "Retirer",
      destructive: true,
    });
    if (!sure) return;
    const next = await remove.run(quoteId, stepId);
    if (next) adopt(next);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg" data-demo="dunning-dialog">
        <DialogHeader>
          <DialogTitle>Recouvrement — {title}</DialogTitle>
          <DialogDescription>
            Chaque marche garde le montant réclamé ce jour-là. Le reste dû se recalcule : avoirs et
            virements compris.
          </DialogDescription>
        </DialogHeader>

        {error ? <ErrorNotice message="Échelle illisible." onRetry={() => void mutate()} /> : null}
        {!data && !error && <Bar hue="jade" className="h-16 w-full" />}

        {data && (
          <>
            <div className="bg-muted/50 flex flex-wrap items-baseline justify-between gap-2 rounded-lg px-3 py-2">
              <span className="text-muted-foreground text-xs">
                Net à payer {formatAmount(data.net)}
              </span>
              <span className="text-sm">
                Reste dû aujourd&apos;hui{" "}
                <strong className="tabular-nums">{formatAmount(data.remaining)}</strong>
              </span>
            </div>

            {data.steps.length === 0 ? (
              <p className="text-muted-foreground text-sm">Aucune relance enregistrée sur cette facture.</p>
            ) : (
              <ol className="divide-y rounded-lg border text-sm">
                {data.steps.map((step) => {
                  const stale = step.amount_claimed !== null && Number(step.amount_claimed) !== Number(data.remaining);
                  return (
                    <li key={step.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-3 py-2">
                      <span className="text-muted-foreground tabular-nums">{formatDate(step.done_at)}</span>
                      <span className="font-medium">{DUNNING_STAGE[step.step].label}</span>
                      {step.amount_claimed && (
                        <span className={stale ? "text-warning" : "text-muted-foreground"}>
                          {formatAmount(step.amount_claimed)} réclamés{stale ? " — plus le reste dû" : ""}
                        </span>
                      )}
                      <span className="flex-1" />
                      {step.document_url && (
                        <a
                          href={step.document_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium hover:underline"
                        >
                          Document
                        </a>
                      )}
                      {canWrite && (
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          aria-label={`Retirer ${DUNNING_STAGE[step.step].label}`}
                          disabled={remove.pending}
                          onClick={() => void retirer(step.id, DUNNING_STAGE[step.step].label)}
                        >
                          <TrashIcon />
                        </Button>
                      )}
                      {step.note && <p className="text-muted-foreground min-w-0 basis-full text-xs break-words">{step.note}</p>}
                    </li>
                  );
                })}
              </ol>
            )}

            {canWrite && (
              <StepForm
                // Repart de la marche suivante et du reste dû après chaque ajout.
                key={`${data.steps.length}:${data.remaining}`}
                quoteId={quoteId}
                dunning={data}
                onAdded={adopt}
              />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** La marche qu'on monte : laquelle, quand, combien, et la pièce qui la prouve. */
function StepForm({
  quoteId,
  dunning,
  onAdded,
}: {
  quoteId: string;
  dunning: Dunning;
  onAdded: (next: Dunning) => void;
}) {
  const [step, setStep] = useState<DunningStage>(() => nextDunningStage(dunning.steps.map((s) => s.step)));
  const [day, setDay] = useState(todayLocal);
  const [amount, setAmount] = useState(() => amountToInput(dunning.remaining));
  const [note, setNote] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const add = useAction(addDunningStep, { inline: true });
  const parsed = parseAmountInput(amount);
  const invalid = parsed === undefined || day === "";

  async function submit() {
    if (invalid) return;
    const next = await add.run(quoteId, {
      step,
      done_at: day,
      amount_claimed: parsed,
      note: note.trim(),
      document_url: documentUrl.trim(),
    });
    if (next) onAdded(next);
  }

  return (
    <div className="flex flex-col gap-3 border-t pt-3" data-demo="dunning-form">
      {add.error && <ErrorNotice message={add.error} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Marche"
          options={STAGES}
          value={step}
          onValueChange={(value) => setStep(value as DunningStage)}
          hint={DUNNING_STAGE[step].hint}
          required
        />
        <TextField
          label="Faite le"
          type="date"
          value={day}
          required
          onChange={(event) => setDay(event.target.value)}
        />
        <TextField
          label="Montant réclamé"
          inputMode="decimal"
          value={amount}
          hint="Le reste dû du jour, proposé d'office."
          error={amount !== "" && parsed === undefined ? "Un montant en euros." : undefined}
          onChange={(event) => setAmount(event.target.value)}
        />
        <TextField
          label="Document"
          placeholder="Lien OneDrive de la lettre ou de l'acte"
          value={documentUrl}
          error={add.fields.document_url}
          onChange={(event) => setDocumentUrl(event.target.value)}
        />
      </div>
      <TextField
        label="Note"
        placeholder="Numéro de recommandé, étude saisie, date d'audience…"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <div className="flex justify-end">
        <Button size="sm" disabled={invalid || add.pending} onClick={() => void submit()}>
          {add.pending ? "Enregistrement…" : "Ajouter la marche"}
        </Button>
      </div>
    </div>
  );
}
