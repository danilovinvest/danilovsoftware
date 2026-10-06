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
import { SelectField } from "@/shared/ui/form";
import * as api from "../lib/api";
import { CUSTOMER_KIND, CUSTOMER_RELATION } from "../lib/labels";
import { isNoop, reclassPlan, type ReclassState } from "../lib/reclass";
import { useAction } from "../hooks/use-customers";
import type { CustomerKind, CustomerRelation } from "../lib/types";

const KINDS = Object.entries(CUSTOMER_KIND).map(([value, { label }]) => ({ value, label }));
const RELATIONS = Object.entries(CUSTOMER_RELATION).map(([value, { label }]) => ({ value, label }));

/**
 * « Reclasser… » depuis la liste des fiches (migration 107).
 *
 * Balitrand, Chancel, OXIA, ArcelorMittal remontaient comme clients à
 * enrichir : un fournisseur ou un syndic mal typé se corrige en une minute
 * sans ouvrir la fiche. Le type et la relation, rien d'autre — le SIRET et le
 * syndic restent à l'onglet Fiche, où l'on voit ce qu'on touche. Une fiche dont
 * la relation n'est pas « client final » sort d'elle-même de Clients et
 * Prospects.
 */
export function ReclassDialog({
  customer,
  onClose,
  onSaved,
}: {
  customer: { id: string; display_name: string } & ReclassState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [next, setNext] = useState<ReclassState>({ kind: customer.kind, relation: customer.relation });
  const plan = reclassPlan(customer, next);
  const save = useAction(
    async () => {
      if (plan.kind) await api.updateCustomer(customer.id, { kind: plan.kind });
      if (plan.relation !== undefined) {
        await api.setCustomerClassification(customer.id, { relation: plan.relation });
      }
    },
    { inline: true, success: `${customer.display_name} reclassée` },
  );

  async function submit() {
    if ((await save.run()) === null) return;
    onSaved();
    onClose();
  }

  const deduced = reclassPlan(customer, { ...next, relation: null }).effective;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" data-demo="reclass-dialog">
        <DialogHeader>
          <DialogTitle>Reclasser {customer.display_name}</DialogTitle>
          <DialogDescription>
            Le type dit qui c’est, la relation ce qu’il représente pour nous. Seul un client final
            reste dans Clients et Prospects.
          </DialogDescription>
        </DialogHeader>
        {save.error !== null && <ErrorNotice message={save.error} />}
        <SelectField
          label="Type"
          options={KINDS}
          value={next.kind}
          onValueChange={(kind) => setNext((s) => ({ ...s, kind: kind as CustomerKind }))}
          disabled={save.pending}
        />
        <SelectField
          label="Relation"
          options={RELATIONS}
          value={next.relation ?? ""}
          onValueChange={(relation) =>
            setNext((s) => ({ ...s, relation: relation === "" ? null : (relation as CustomerRelation) }))
          }
          emptyLabel={`Déduite du type : ${CUSTOMER_RELATION[deduced].label.toLowerCase()}`}
          disabled={save.pending}
        />
        <p className="text-muted-foreground text-xs">
          {plan.effective === "client_final"
            ? "Restera parmi les clients et prospects."
            : `Sortira de Clients et Prospects : ${CUSTOMER_RELATION[plan.effective].label.toLowerCase()}.`}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button disabled={isNoop(plan) || save.pending} onClick={() => void submit()}>
            Reclasser
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
