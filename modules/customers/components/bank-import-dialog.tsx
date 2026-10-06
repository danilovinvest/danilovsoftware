"use client";

import { useRef, useState } from "react";
import { FileUpIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DateField } from "@/shared/ui/date-time-field";
import { ErrorNotice } from "@/shared/ui/feedback";
import { formatAmount, plural } from "@/shared/lib/format";
import { useDirtyGuard } from "@/shared/lib/dirty-guard";
import { useAction } from "../hooks/use-customers";
import {
  importStatement,
  previewStatement,
  type StatementPreview,
} from "../lib/bank";
import { BankAccountSelect } from "./bank-account-select";

/**
 * Importer un relevé : le compte, le fichier, puis ce qu'il contient avant
 * toute écriture.
 *
 * **Deux temps, comme l'import du classeur.** L'aperçu dit combien d'écritures
 * le fichier porte, combien le compte connaît déjà, et la période qu'il
 * couvre — que la personne confirme. C'est sur cette période que se lit un
 * relevé manquant : la déduire des seules écritures ferait un trou de chaque
 * début de mois sans mouvement.
 */
export function BankImportDialog({
  accountId,
  onClose,
  onDone,
}: {
  accountId: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [account, setAccount] = useState<string | null>(accountId);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<StatementPreview | null>(null);
  const [period, setPeriod] = useState({ start: "", end: "" });
  const input = useRef<HTMLInputElement>(null);
  const look = useAction(previewStatement, { inline: true });
  const write = useAction(importStatement, { inline: true });
  const close = useDirtyGuard(file !== null, (open) => {
    if (!open) onClose();
  });

  // Le rang de la dernière lecture demandée : changer de compte pendant qu'un
  // aperçu arrive ne doit pas laisser l'ancien s'afficher sous le nouveau.
  const asked = useRef(0);

  async function read(next: File | null, nextAccount: string | null) {
    const turn = ++asked.current;
    setPreview(null);
    if (!next || !nextAccount) return;
    const result = await look.run(next, nextAccount);
    if (result && turn === asked.current) {
      setPreview(result);
      setPeriod({ start: result.period_start, end: result.period_end });
    }
  }

  async function submit() {
    if (!file || !account || !preview) return;
    const statement = await write.run(file, account, period);
    if (statement) {
      onDone();
      onClose();
    }
  }

  const fresh = preview ? preview.lines - preview.known : 0;
  return (
    <Dialog open onOpenChange={(open) => void close(open)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importer un relevé</DialogTitle>
          <DialogDescription>
            L&apos;export CSV du compte, tel que la banque le rend. Rien
            n&apos;est écrit avant « Importer ».
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <BankAccountSelect
            label="Compte du relevé"
            emptyLabel="Choisir un compte"
            value={account}
            onChange={(id) => {
              setAccount(id);
              void read(file, id);
            }}
          />
          <input
            ref={input}
            type="file"
            accept=".csv,text/csv,text/plain"
            className="hidden"
            onChange={(event) => {
              const next = event.target.files?.[0] ?? null;
              setFile(next);
              void read(next, account);
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => input.current?.click()}
            className="max-w-full self-start"
          >
            <FileUpIcon />
            <span className="truncate">
              {file ? file.name : "Choisir le fichier…"}
            </span>
          </Button>
          {look.error && file && account ? (
            <ErrorNotice message={look.error} />
          ) : null}
          {preview && (
            <div
              className="bg-muted/50 flex flex-col gap-2 rounded-lg p-3 text-sm"
              data-demo="bank-preview"
            >
              <p>
                <strong>{plural(preview.lines, "écriture")}</strong> :{" "}
                {plural(preview.credits, "crédit")} (
                {formatAmount(preview.credits_total)}),{" "}
                {plural(preview.debits, "débit")} (
                {formatAmount(preview.debits_total)}).
              </p>
              <p className="text-muted-foreground">
                {preview.known > 0
                  ? `${plural(preview.known, "écriture")} déjà connue${preview.known > 1 ? "s" : ""} de ce compte : ${fresh} entreront.`
                  : "Aucune n'est encore connue de ce compte."}
                {preview.skipped > 0 &&
                  ` ${plural(preview.skipped, "ligne")} sans date (solde, total) laissée${preview.skipped > 1 ? "s" : ""}.`}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <DateField
                  label="Période du"
                  value={period.start}
                  onChange={(start) => setPeriod((p) => ({ ...p, start }))}
                />
                <DateField
                  label="au"
                  value={period.end}
                  onChange={(end) => setPeriod((p) => ({ ...p, end }))}
                />
              </div>
              <p className="text-muted-foreground text-xs">
                {preview.period_announced
                  ? "Période annoncée par le fichier."
                  : "Le fichier n'annonce pas sa période : celle de ses écritures est proposée, à étendre au mois entier s'il le couvre."}
              </p>
            </div>
          )}
          {write.error ? <ErrorNotice message={write.error} /> : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => void close(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={!preview || write.pending || look.pending}
          >
            Importer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
