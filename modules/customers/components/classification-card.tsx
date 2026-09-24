"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/modules/auth";
import { LIVE, useCached } from "@/shared/api/cache";
import { errorMessage } from "@/shared/api/errors";
import { SelectField, TextField } from "@/shared/ui/form";
import * as api from "../lib/api";
import { relationOf } from "../lib/classification";
import { CUSTOMER_RELATION } from "../lib/labels";
import type { Customer, CustomerRelation } from "../lib/types";
import { CustomerPicker } from "./customer-picker";

const RELATIONS = Object.entries(CUSTOMER_RELATION).map(([value, { label }]) => ({ value, label }));

/**
 * La relation, le SIRET et le syndic d'une fiche — ce que la vue graphe lit.
 *
 * Ils passent par leur propre route (`PUT …/classification`) et jamais par le
 * formulaire de la fiche, qui remplace la ligne entière : l'import Excel,
 * l'enrichissement et l'assistant réécrivent la fiche sans les connaître, et
 * les auraient effacés à chaque passage.
 *
 * La relation vide n'est pas « client final » : elle est déduite du type, et
 * l'option le dit — une supposition écrite comme un fait se relit comme un fait.
 */
export function ClassificationEditor({
  customer,
  managerName,
  onSaved,
}: {
  customer: Customer;
  /** Le nom du syndic, quand l'écran appelant l'a déjà. */
  managerName?: string;
  onSaved: () => void;
}) {
  const canWrite = usePermission("customers:write");
  const [relation, setRelation] = useState<string>(customer.relation ?? "");
  const [siret, setSiret] = useState(customer.siret);
  const [manager, setManager] = useState<{ id: string | null; name: string }>({
    id: customer.managed_by_customer_id,
    name: "",
  });
  // Le nom du syndic enregistré : la même entrée de cache que la vue graphe,
  // lue seulement quand la fiche en a un et que l'appelant ne l'a pas donné.
  const { data: relations } = useCached(
    customer.managed_by_customer_id && !managerName ? `customers:relations:${customer.id}` : null,
    () => api.getCustomerRelations(customer.id),
    LIVE,
  );
  const savedManagerName = managerName ?? relations?.manager?.display_name ?? "";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deduced = relationOf({ kind: customer.kind, relation: null }).value;
  const dirty =
    relation !== (customer.relation ?? "") ||
    siret !== customer.siret ||
    manager.id !== customer.managed_by_customer_id;

  async function save() {
    setPending(true);
    setError(null);
    try {
      await api.setCustomerClassification(customer.id, {
        relation: relation === "" ? null : (relation as CustomerRelation),
        siret,
        managed_by_customer_id: manager.id,
      });
      onSaved();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3" data-demo="fiche-classification">
      <SelectField
        label="Relation"
        options={RELATIONS}
        value={relation}
        onValueChange={setRelation}
        emptyLabel={`Déduite du type : ${CUSTOMER_RELATION[deduced].label.toLowerCase()}`}
        disabled={!canWrite || pending}
      />
      <TextField
        label="SIRET"
        value={siret}
        onChange={(event) => setSiret(event.target.value)}
        placeholder="123 456 789 00012"
        inputMode="numeric"
        hint="Quatorze chiffres. Les espaces sont acceptés."
        disabled={!canWrite || pending}
      />
      <CustomerPicker
        label="Géré par"
        value={manager.id}
        valueName={manager.id === customer.managed_by_customer_id ? savedManagerName : manager.name}
        onChange={(id, name) => setManager({ id, name })}
        placeholder="Chercher le syndic…"
        hint="Le syndic d'une copropriété : ses interlocuteurs et ses autres immeubles apparaissent dans le graphe."
      />
      {error && <p className="text-danger text-xs">{error}</p>}
      {canWrite && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => void save()} disabled={!dirty || pending}>
            {pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      )}
    </div>
  );
}
