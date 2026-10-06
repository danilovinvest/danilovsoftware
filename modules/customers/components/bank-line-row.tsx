"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckIcon,
  EyeOffIcon,
  HourglassIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TextField } from "@/shared/ui/form";
import { ErrorNotice } from "@/shared/ui/feedback";
import { formatAmount, formatDate } from "@/shared/lib/format";
import { cn } from "@/lib/utils";
import { useDirtyGuard } from "@/shared/lib/dirty-guard";
import { useAction } from "../hooks/use-customers";
import {
  ignoreBankLine,
  reconcileBankLine,
  reopenBankLine,
  suggestionAction,
  suggestionPayload,
  type BankLine,
} from "../lib/bank";
import { CustomerPicker } from "./customer-picker";

/**
 * Une ligne de relevé : ce que la banque écrit, ce que le CRM en propose, et
 * les trois gestes qui la tranchent.
 *
 * La proposition dit **pourquoi** avant de proposer quoi que ce soit, et son
 * bouton nomme ce qu'il écrira. Une proposition sûre porte un écusson — ce sont
 * celles que « Valider les sûres » prend en lot ; les autres se relisent une à
 * une.
 */
export function BankLineRow({
  line,
  canWrite,
  onChanged,
}: {
  line: BankLine;
  canWrite: boolean;
  onChanged: () => void;
}) {
  const [dialog, setDialog] = useState<"pending" | "ignore" | null>(null);
  const accept = useAction(reconcileBankLine, { success: "Ligne rapprochée." });
  const reopen = useAction(reopenBankLine, {
    success: "Ligne rendue à rapprocher.",
  });
  const suggestion = line.suggestion;
  const payload = suggestionPayload(suggestion);
  const open = line.status === "a_rapprocher";
  // Tranchée, la ligne attend que la liste se relise : ses boutons restent
  // éteints, pour qu'un second clic ne rejoue pas le geste.
  const [settled, setSettled] = useState(false);
  const busy = settled || accept.pending || reopen.pending;
  const what = `${line.label}, ${formatAmount(line.amount)}`;
  const changed = () => {
    setSettled(true);
    onChanged();
  };

  async function validate() {
    if (!payload) return;
    if ((await accept.run(line.id, payload)) !== null) changed();
  }

  return (
    <li
      className="flex flex-col gap-1.5 px-3 py-2.5 text-sm"
      data-demo="bank-line"
    >
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="text-muted-foreground tabular-nums">
          {formatDate(line.booked_at)}
        </span>
        <span className="font-semibold tabular-nums">
          {formatAmount(line.amount)}
        </span>
        <span className="min-w-0 flex-1 font-medium break-words">
          {line.label}
        </span>
        <span className="text-muted-foreground text-xs">
          {line.account_label}
        </span>
      </div>
      {line.detail && (
        <p className="text-muted-foreground text-xs break-words">
          {line.detail}
        </p>
      )}
      {open && suggestion?.reason && (
        <p
          className={cn(
            "flex flex-wrap items-center gap-x-1.5 text-xs",
            suggestion.sure
              ? "text-success"
              : payload
                ? "text-info"
                : "text-muted-foreground",
          )}
          data-demo="bank-suggestion"
        >
          {suggestion.sure && <ShieldCheckIcon className="size-3.5" />}
          <span>
            {suggestion.sure ? "Sûr — " : payload ? "À vérifier — " : ""}
            {suggestion.reason}
          </span>
          {suggestion.allocations?.map((a) => (
            <span key={a.quote_id} className="text-foreground font-medium">
              {a.reference} · {formatAmount(a.amount)}
            </span>
          ))}
          {suggestion.pending && (
            <span>
              · {formatAmount(suggestion.pending)} resteront à affecter
            </span>
          )}
        </p>
      )}
      {!open && (
        <p className="text-muted-foreground text-xs">
          {line.status === "ignore"
            ? `Écartée${line.note ? ` : ${line.note}` : ""}`
            : line.matched_by === "proposition"
              ? "Rapprochée sur proposition"
              : "Rapprochée à la main"}
          {line.decided_at && ` · ${formatDate(line.decided_at)}`}
          {line.decided_by_name && ` par ${line.decided_by_name}`}
        </p>
      )}
      {canWrite && (
        <div className="flex flex-wrap gap-2">
          {open && payload && (
            <Button
              size="xs"
              onClick={() => void validate()}
              disabled={busy}
              aria-label={`${suggestionAction(suggestion)} : ${what}`}
            >
              <CheckIcon />
              {suggestionAction(suggestion)}
            </Button>
          )}
          {open && (
            <Button
              size="xs"
              variant="outline"
              disabled={busy}
              onClick={() => setDialog("pending")}
              aria-label={`Mettre en attente : ${what}`}
            >
              <HourglassIcon />
              Mettre en attente…
            </Button>
          )}
          {open && (
            <Button
              size="xs"
              variant="ghost"
              disabled={busy}
              onClick={() => setDialog("ignore")}
              aria-label={`Pas un encaissement : ${what}`}
            >
              <EyeOffIcon />
              Pas un encaissement…
            </Button>
          )}
          {!open && (
            <Button
              size="xs"
              variant="ghost"
              disabled={busy}
              aria-label={`Rouvrir : ${what}`}
              onClick={async () => {
                if ((await reopen.run(line.id)) !== null) changed();
              }}
            >
              <RotateCcwIcon />
              Rouvrir
            </Button>
          )}
        </div>
      )}
      {dialog === "pending" && (
        <PendingLineDialog
          line={line}
          onClose={() => setDialog(null)}
          onDone={changed}
        />
      )}
      {dialog === "ignore" && (
        <IgnoreLineDialog
          line={line}
          onClose={() => setDialog(null)}
          onDone={changed}
        />
      )}
    </li>
  );
}

/**
 * Inscrire la ligne comme un encaissement en attente d'affectation : sur la
 * fiche du payeur quand on le reconnaît, sans fiche sinon. Il rejoint « À
 * affecter », où il se répartit sur ses pièces par la boîte de toujours.
 */
function PendingLineDialog({
  line,
  onClose,
  onDone,
}: {
  line: BankLine;
  onClose: () => void;
  onDone: () => void;
}) {
  const [payer, setPayer] = useState<{ id: string | null; name: string }>({
    id: line.suggestion?.customer_id ?? null,
    name: line.suggestion?.customer_name ?? "",
  });
  const save = useAction(reconcileBankLine, { inline: true });
  const close = useDirtyGuard(
    payer.id !== (line.suggestion?.customer_id ?? null),
    (open) => {
      if (!open) onClose();
    },
  );

  async function submit() {
    const done = await save.run(line.id, { customer_id: payer.id });
    if (done !== null) {
      onDone();
      onClose();
    }
  }

  return (
    <Dialog open onOpenChange={(open) => void close(open)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mettre en attente</DialogTitle>
          <DialogDescription>
            {formatAmount(line.amount)} du {formatDate(line.booked_at)} — «{" "}
            {line.label} ». L&apos;encaissement est inscrit sur{" "}
            {line.account_label} et attend son affectation.
          </DialogDescription>
        </DialogHeader>
        <CustomerPicker
          label="Payeur"
          value={payer.id}
          valueName={payer.name}
          onChange={(id, name) => setPayer({ id, name })}
          hint="Facultatif : sans fiche, il attend comme « payeur non reconnu »."
        />
        {save.error ? <ErrorNotice message={save.error} /> : null}
        <DialogFooter>
          <Button variant="ghost" onClick={() => void close(false)}>
            Annuler
          </Button>
          <Button onClick={() => void submit()} disabled={save.pending}>
            Inscrire en attente
          </Button>
        </DialogFooter>
        <p className="text-muted-foreground text-xs">
          Il se répartit ensuite depuis{" "}
          <Link href="/billing/a-affecter" className="underline">
            À affecter
          </Link>
          .
        </p>
      </DialogContent>
    </Dialog>
  );
}

/** Écarter une ligne qui n'est pas un encaissement client, en disant pourquoi. */
function IgnoreLineDialog({
  line,
  onClose,
  onDone,
}: {
  line: BankLine;
  onClose: () => void;
  onDone: () => void;
}) {
  const [note, setNote] = useState("");
  const save = useAction(ignoreBankLine, { inline: true });
  const close = useDirtyGuard(note.trim() !== "", (open) => {
    if (!open) onClose();
  });

  async function submit() {
    if ((await save.run(line.id, note)) !== null) {
      onDone();
      onClose();
    }
  }

  return (
    <Dialog open onOpenChange={(open) => void close(open)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pas un encaissement client</DialogTitle>
          <DialogDescription>
            {formatAmount(line.amount)} du {formatDate(line.booked_at)} — «{" "}
            {line.label} ». La ligne quitte la liste à rapprocher ; elle se
            rouvre depuis « Écartées ».
          </DialogDescription>
        </DialogHeader>
        <TextField
          label="Pourquoi"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Virement entre comptes, prêt, remboursement…"
        />
        {save.error ? <ErrorNotice message={save.error} /> : null}
        <DialogFooter>
          <Button variant="ghost" onClick={() => void close(false)}>
            Annuler
          </Button>
          <Button onClick={() => void submit()} disabled={save.pending}>
            Écarter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
