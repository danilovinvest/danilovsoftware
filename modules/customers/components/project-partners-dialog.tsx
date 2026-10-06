"use client";

import { useState } from "react";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDirtyGuard } from "@/shared/lib/dirty-guard";
import { ErrorNotice } from "@/shared/ui/feedback";
import { SelectField, TextField } from "@/shared/ui/form";
import { useAction } from "../hooks/use-customers";
import { amountToInput, parseAmountInput } from "../lib/amount";
import {
  PARTNER_LINK,
  PARTNER_ROLE_OPTIONS,
  setProjectPartners,
  type PartnerRole,
  type ProjectPartner,
} from "../lib/partners";
import { CustomerPicker } from "./customer-picker";

type Row = { key: number; partner_id: string; partner_name: string; role: PartnerRole; fee: string; note: string };

/**
 * Les partenaires d'une affaire : qui l'a prescrite, qui intervient sur le même
 * chantier, qui on a recommandé (migration 113).
 *
 * L'apporteur n'est pas ici : il est unique, et se pose sur l'affaire. La même
 * fiche peut porter deux rôles — l'ingénieur qui prescrit et suit le chantier —
 * sur deux lignes. « Réglé en direct » note ce que le client a payé au
 * partenaire lui-même, l'étude du bureau d'études : pour mémoire, jamais compté
 * dans le chiffre d'OMPT. La route remplace la liste entière.
 */
export function ProjectPartnersDialog({
  projectId,
  ownerId,
  partners,
  onClose,
  onSaved,
}: {
  projectId: string;
  /** La fiche de l'affaire : elle n'est pas son propre partenaire. */
  ownerId: string;
  partners: ProjectPartner[];
  onClose: () => void;
  onSaved: (next: ProjectPartner[]) => void;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    partners.map((partner, index) => ({
      key: index,
      partner_id: partner.partner_id,
      partner_name: partner.partner_name,
      role: partner.role,
      fee: amountToInput(partner.direct_fee),
      note: partner.note,
    })),
  );
  const [nextKey, setNextKey] = useState(partners.length);
  const [dirty, setDirty] = useState(false);
  const save = useAction(setProjectPartners, { inline: true });
  const guard = useDirtyGuard(dirty, (open) => {
    if (!open) onClose();
  });

  const seen = new Set<string>();
  const problems = rows.map((row) => {
    if (row.partner_id === "") return "Choisir la fiche du partenaire.";
    if (row.partner_id === ownerId) return "La fiche de l'affaire n'est pas son propre partenaire.";
    // Le montant illisible se dit sous son champ.
    if (parseAmountInput(row.fee) === undefined) return "";
    const id = `${row.partner_id}:${row.role}`;
    if (seen.has(id)) return "Ce rôle est déjà donné à cette fiche.";
    seen.add(id);
    return null;
  });
  const invalid = problems.some((problem) => problem !== null);

  function patch(key: number, change: Partial<Row>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...change } : row)));
    setDirty(true);
  }

  async function submit() {
    if (invalid) return;
    const next = await save.run(
      projectId,
      rows.map((row) => ({
        partner_id: row.partner_id,
        role: row.role,
        direct_fee: parseAmountInput(row.fee) ?? null,
        note: row.note.trim(),
      })),
    );
    if (!next) return;
    onSaved(next);
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => void guard(open)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl" data-demo="project-partners-dialog">
        <DialogHeader>
          <DialogTitle>Partenaires de l&apos;affaire</DialogTitle>
          <DialogDescription>
            Qui l&apos;a prescrite, qui intervient sur le même chantier, qui on a recommandé. L&apos;apporteur se
            pose à part, sur l&apos;affaire.
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 && (
          <p className="text-muted-foreground text-sm">Aucun partenaire sur cette affaire.</p>
        )}
        <ul className="flex flex-col gap-3">
          {rows.map((row, index) => (
            <li key={row.key} className="flex flex-col gap-2 rounded-lg border p-3">
              <div className="flex items-start gap-2">
                <CustomerPicker
                  className="min-w-0 flex-1"
                  label="Fiche du partenaire"
                  value={row.partner_id || null}
                  valueName={row.partner_name}
                  placeholder="Chercher un ingénieur, un architecte…"
                  allowCreate
                  // Celui qui prescrit est le plus souvent un bureau d'études.
                  createAs={row.role === "prescripteur" ? "ingenieur" : "architecte"}
                  onChange={(id, name) => patch(row.key, { partner_id: id ?? "", partner_name: name })}
                />
                <Button
                  size="icon-xs"
                  variant="ghost"
                  className="mt-6"
                  aria-label={`Retirer ${row.partner_name || "ce partenaire"}`}
                  onClick={() => {
                    setRows((current) => current.filter((other) => other.key !== row.key));
                    setDirty(true);
                  }}
                >
                  <Trash2Icon />
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <SelectField
                  label="Rôle"
                  options={PARTNER_ROLE_OPTIONS}
                  value={row.role}
                  required
                  hint={PARTNER_LINK[row.role].hint}
                  onValueChange={(value) => patch(row.key, { role: value as PartnerRole })}
                />
                <TextField
                  label="Réglé en direct au partenaire"
                  inputMode="decimal"
                  value={row.fee}
                  hint="Par le client, hors chiffre d'OMPT."
                  error={parseAmountInput(row.fee) === undefined ? "Un montant en euros." : undefined}
                  onChange={(event) => patch(row.key, { fee: event.target.value })}
                />
              </div>
              <TextField
                label="Note"
                placeholder="Étude de faisabilité, suivi de chantier…"
                value={row.note}
                onChange={(event) => patch(row.key, { note: event.target.value })}
              />
              {problems[index] && (
                <p className="text-danger text-xs" role="alert">
                  {problems[index]}
                </p>
              )}
            </li>
          ))}
        </ul>
        <Button
          size="sm"
          variant="outline"
          className="self-start"
          onClick={() => {
            setRows((current) => [
              ...current,
              { key: nextKey, partner_id: "", partner_name: "", role: "prescripteur", fee: "", note: "" },
            ]);
            setNextKey(nextKey + 1);
            setDirty(true);
          }}
        >
          Ajouter un partenaire
        </Button>

        {save.error && <ErrorNotice message={save.error} />}
        <DialogFooter>
          <Button variant="outline" onClick={() => void guard(false)}>
            Annuler
          </Button>
          <Button disabled={invalid || save.pending} onClick={() => void submit()}>
            {save.pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
