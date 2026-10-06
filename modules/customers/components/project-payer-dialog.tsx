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
import { ErrorNotice } from "@/shared/ui/feedback";
import { setProjectPayer } from "../lib/payer";
import { useAction } from "../hooks/use-customers";
import type { CustomerDetail, Project } from "../lib/types";
import { CustomerPicker } from "./customer-picker";

type Payer = { id: string | null; name: string };

/**
 * Qui règle l'affaire, quand ce n'est pas sa fiche (migration 107).
 *
 * « SDC Marot payé par AGEFIM, SAS La Petite Étoile au lieu de la SCI » : le
 * client reste celui pour qui on travaille, et c'est sur sa fiche que vit
 * l'affaire. Le payeur est une autre fiche, dont les virements s'affectent
 * ensuite aux pièces de cette affaire.
 *
 * Le lien `payeur` de la fiche, quand il existe, est **proposé** et jamais
 * posé d'office : un même client fait régler une affaire par sa société et en
 * paie une autre lui-même.
 */
export function ProjectPayerDialog({
  customer,
  project,
  open,
  onOpenChange,
  onSaved,
}: {
  customer: Pick<CustomerDetail, "id" | "display_name" | "suggested_payer">;
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [payer, setPayer] = useState<Payer>({
    id: project.payer_customer_id,
    name: project.payer_name,
  });
  const save = useAction((id: string | null) => setProjectPayer(project.id, id), { inline: true });
  const suggestion = customer.suggested_payer;
  const self = payer.id === customer.id;

  async function submit(id: string | null) {
    if ((await save.run(id)) === null) return;
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-demo="project-payer-dialog">
        <DialogHeader>
          <DialogTitle>Qui paie cette affaire ?</DialogTitle>
          <DialogDescription>
            « {project.label} » reste sur la fiche {customer.display_name}. Le payeur est la fiche
            dont l’argent arrive : ses virements s’affecteront aux pièces de cette affaire.
          </DialogDescription>
        </DialogHeader>
        {save.error !== null && <ErrorNotice message={save.error} />}
        <CustomerPicker
          label="Payé par"
          value={payer.id}
          valueName={payer.name}
          onChange={(id, name) => setPayer({ id, name })}
          placeholder="Chercher la fiche qui paie…"
          hint={
            self
              ? "C’est la fiche de l’affaire : elle paie déjà par défaut."
              : "Une société, un gestionnaire, un organisme payeur — jamais la fiche elle-même."
          }
          disabled={save.pending}
        />
        {suggestion && suggestion.id !== payer.id && (
          <Button
            size="sm"
            variant="outline"
            className="self-start"
            onClick={() => setPayer(suggestion)}
          >
            Proposé par la fiche : {suggestion.name}
          </Button>
        )}
        <DialogFooter>
          {project.payer_customer_id && (
            <Button
              variant="ghost"
              className="mr-auto"
              disabled={save.pending}
              onClick={() => void submit(null)}
            >
              La fiche paie elle-même
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            disabled={save.pending || self || payer.id === project.payer_customer_id}
            onClick={() => void submit(payer.id)}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
