"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DateTimeField } from "@/shared/ui/date-time-field";
import { ErrorNotice } from "@/shared/ui/feedback";
import { SelectField, TextAreaField, TextField } from "@/shared/ui/form";
import { useAction } from "../hooks/use-customers";
import * as api from "../lib/api";
import { INTERACTION_KIND, toOptions } from "../lib/labels";
import type { InteractionKind, Project } from "../lib/types";

/**
 * Enregistrer un échange depuis l'affaire.
 *
 * L'onglet « Échanges » de la fiche sait déjà le faire, mais il est ailleurs et
 * ne présélectionne rien. Ici l'affaire est connue, le type est choisi par le
 * geste qui a ouvert le dialogue, et l'échange se rattache d'office — trois
 * choix en moins à chaque appel noté.
 *
 * Le mode `rdv` est le seul à proposer une date future : c'est le seul échange
 * qu'on planifie au lieu de le constater.
 */
export function InteractionDialog({
  project,
  kind,
  open,
  onOpenChange,
  onSaved,
}: {
  project: Project;
  kind: InteractionKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const planning = kind === "rdv";
  const [type, setType] = useState<InteractionKind>(kind);
  const [occurredAt, setOccurredAt] = useState<string | null>(() =>
    planning ? inDays(3) : new Date().toISOString(),
  );
  const [summary, setSummary] = useState(planning ? "Visite sur site" : "");
  const [details, setDetails] = useState("");

  const save = useAction(() =>
    api.createInteraction(project.customer_id, {
      project_id: project.id,
      kind: type,
      occurred_at: occurredAt ?? new Date().toISOString(),
      summary: summary.trim(),
      details: details.trim(),
    }),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{planning ? "Planifier le rendez-vous" : "Enregistrer un échange"}</DialogTitle>
          <DialogDescription>
            {planning
              ? "La visite sur site est obligatoire avant d'établir un devis. Un sondage peut s'y ajouter."
              : project.label}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)]">
          <SelectField
            label="Type"
            options={toOptions(INTERACTION_KIND)}
            value={type}
            onValueChange={(value) => setType(value as InteractionKind)}
          />
          <DateTimeField
            label={planning ? "Date du rendez-vous" : "Quand"}
            value={occurredAt}
            onChange={setOccurredAt}
          />
          <TextField
            label="Résumé"
            required
            wrapperClassName="sm:col-span-2"
            placeholder={
              planning ? "Visite sur site — relevé et cotes" : "Ce qui s'est dit, en une ligne"
            }
            value={summary}
            error={save.fields.summary}
            onChange={(event) => setSummary(event.target.value)}
          />
          <TextAreaField
            label="Détails"
            wrapperClassName="sm:col-span-2"
            className="min-h-24"
            placeholder={planning ? "Sondage à prévoir, accès, personne à rencontrer…" : ""}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
          />
        </div>

        {save.error && <ErrorNotice message={save.error} />}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            disabled={save.pending || !summary.trim()}
            onClick={async () => {
              if (!(await save.run())) return;
              onOpenChange(false);
              onSaved();
            }}
          >
            {planning ? "Planifier" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function inDays(days: number): string {
  const at = new Date();
  at.setDate(at.getDate() + days);
  at.setHours(9, 0, 0, 0);
  return at.toISOString();
}
