"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/modules/auth";
import { ErrorNotice } from "@/shared/ui/feedback";
import { TextAreaField, TextField } from "@/shared/ui/form";
import { useAction } from "../hooks/use-customers";
import { setBillingRules } from "../lib/syndic-api";
import { BILLING_RULE_FIELDS, changedRules } from "../lib/syndic-labels";
import type { BillingRules } from "../lib/syndic-types";

/**
 * Le circuit de facturation d'une fiche (migration 109) : où envoyer la
 * facture, quelle référence y porter, quel portail la valide, et le libellé que
 * la banque écrira quand ce tiers paie.
 *
 * Le même éditeur sert le syndic — qui porte le circuit — et la copropriété,
 * qui porte son libellé et ce qui lui est propre. Il n'envoie que ce qui a
 * changé : la route lit la requête par-dessus les règles en place, et un champ
 * vidé part vide, ce qui l'efface.
 */
export function BillingRulesEditor({
  customerId,
  rules,
  onSaved,
}: {
  customerId: string;
  rules: BillingRules;
  onSaved: () => void;
}) {
  const canWrite = usePermission("customers:write");
  const [draft, setDraft] = useState(rules);
  const save = useAction(setBillingRules, { inline: true, success: "Circuit de facturation enregistré." });
  const changes = changedRules(rules, draft);
  const dirty = Object.keys(changes).length > 0;
  const locked = !canWrite || save.pending;

  async function submit() {
    const saved = await save.run(customerId, changes);
    if (saved === null) return;
    setDraft(saved);
    onSaved();
  }

  return (
    <div className="flex flex-col gap-3" data-demo="billing-rules">
      {save.error && <ErrorNotice message={save.error} />}
      <div className="grid gap-3 sm:grid-cols-2">
        {BILLING_RULE_FIELDS.map((field) => (
          <TextField
            key={field.key}
            label={field.label}
            placeholder={field.placeholder}
            hint={field.hint}
            error={save.fields[field.key]}
            value={draft[field.key]}
            disabled={locked}
            onChange={(event) => setDraft((current) => ({ ...current, [field.key]: event.target.value }))}
          />
        ))}
      </div>
      <TextAreaField
        label="À savoir pour facturer"
        placeholder="Facture au nom du syndicat, visée par le gestionnaire avant paiement…"
        value={draft.note}
        disabled={locked}
        onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
      />
      {canWrite && (
        <div className="flex justify-end">
          <Button size="sm" disabled={!dirty || save.pending} onClick={() => void submit()}>
            {save.pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      )}
    </div>
  );
}
