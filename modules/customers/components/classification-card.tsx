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
 *
 * Le syndic, lui, n'est pas un champ de la fiche : c'est un lien entre deux
 * fiches (rôle `syndic`), qui se lit donc par `getCustomerRelations`. L'écran
 * appelant qui les a déjà chargées les passe, pour ne pas les redemander.
 */
export function ClassificationEditor({
  customer,
  manager: knownManager,
  onSaved,
}: {
  customer: Customer;
  /** Le syndic enregistré, quand l'écran appelant l'a déjà chargé. */
  manager?: { id: string; name: string } | null;
  onSaved: () => void;
}) {
  const canWrite = usePermission("customers:write");
  const [relation, setRelation] = useState<string>(customer.relation ?? "");
  const [siret, setSiret] = useState(customer.siret);
  // Le syndic enregistré : la même entrée de cache que la vue graphe, lue
  // seulement quand l'appelant ne l'a pas donné.
  const { data: relations } = useCached(
    knownManager === undefined ? `customers:relations:${customer.id}` : null,
    () => api.getCustomerRelations(customer.id),
    LIVE,
  );
  const saved =
    knownManager !== undefined
      ? knownManager
      : relations
        ? relations.manager
          ? { id: relations.manager.id, name: relations.manager.display_name }
          : null
        : undefined;
  /*
    Tant que le syndic enregistré n'est pas connu, la saisie n'est pas montée :
    partir de « aucun » puis basculer effacerait ce qu'on est en train de
    choisir, et enregistrer avant la réponse retirerait un syndic qu'on n'a
    jamais vu.
  */
  const [manager, setManager] = useState<{ id: string | null; name: string } | null>(null);
  const courant = manager ?? { id: saved?.id ?? null, name: saved?.name ?? "" };
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deduced = relationOf({ kind: customer.kind, relation: null }).value;
  const dirty =
    relation !== (customer.relation ?? "") ||
    siret !== customer.siret ||
    courant.id !== (saved?.id ?? null);

  async function save() {
    setPending(true);
    setError(null);
    try {
      await api.setCustomerClassification(customer.id, {
        relation: relation === "" ? null : (relation as CustomerRelation),
        siret,
        managed_by_customer_id: courant.id,
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
        value={courant.id}
        valueName={courant.name}
        onChange={(id, name) => setManager({ id, name })}
        placeholder={saved === undefined ? "Lecture du syndic…" : "Chercher le syndic…"}
        hint="Le syndic d'une copropriété : ses interlocuteurs et ses autres immeubles apparaissent dans le graphe."
        disabled={!canWrite || pending || saved === undefined}
      />
      {error && <p className="text-danger text-xs">{error}</p>}
      {canWrite && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => void save()} disabled={!dirty || pending || saved === undefined}>
            {pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      )}
    </div>
  );
}
