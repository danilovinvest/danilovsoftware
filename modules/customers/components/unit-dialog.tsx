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
import { useDirtyGuard } from "@/shared/lib/dirty-guard";
import { ErrorNotice } from "@/shared/ui/feedback";
import { SelectField, TextAreaField, TextField } from "@/shared/ui/form";
import { useAction } from "../hooks/use-customers";
import { saveUnit } from "../lib/building-api";
import { OCCUPANT_ROLE, UNIT_KIND, UNIT_PROJECT_ROLE } from "../lib/building-labels";
import type { Building, BuildingUnit, OccupantRole, UnitKind, UnitProjectRole } from "../lib/building-types";
import type { Project } from "../lib/types";
import { CustomerPicker } from "./customer-picker";

const KINDS = Object.entries(UNIT_KIND).map(([value, label]) => ({ value, label }));
const ROLES = Object.entries(OCCUPANT_ROLE).map(([value, label]) => ({ value, label }));
const LINKS = Object.entries(UNIT_PROJECT_ROLE).map(([value, { label }]) => ({ value, label }));

/**
 * Un lot et son occupant, créé ou corrigé.
 *
 * L'occupant se note en texte — on ne crée pas une fiche pour un voisin — et
 * se relie à sa fiche quand il en a une. Chaque affaire vivante de l'immeuble
 * reçoit un rôle ou aucun : concerné, impacté, signataire du PV. La liste part
 * entière, dans le périmètre du compte ; le serveur garde ce qu'il ne montre
 * pas.
 */
export function UnitDialog({
  customerId,
  unit,
  projects,
  onClose,
  onSaved,
}: {
  customerId: string;
  unit: BuildingUnit | null;
  projects: Project[];
  onClose: () => void;
  onSaved: (next: Building) => void;
}) {
  const [draft, setDraft] = useState(() => ({
    label: unit?.label ?? "",
    kind: unit?.kind ?? ("logement" as UnitKind),
    floor: unit?.floor ?? "",
    occupant_name: unit?.occupant_name ?? "",
    occupant_role: unit?.occupant_role ?? ("" as OccupantRole | ""),
    occupant_phone: unit?.occupant_phone ?? "",
    occupant_email: unit?.occupant_email ?? "",
    occupant_customer_id: unit?.occupant_customer_id ?? null,
    note: unit?.note ?? "",
  }));
  const [ficheName, setFicheName] = useState(unit?.occupant_customer_name ?? "");
  const [links, setLinks] = useState<Record<string, UnitProjectRole | "">>(() =>
    Object.fromEntries((unit?.projects ?? []).map((link) => [link.project_id, link.role])),
  );
  const [dirty, setDirty] = useState(false);
  const save = useAction(saveUnit, { inline: true });
  const guard = useDirtyGuard(dirty, (open) => {
    if (!open) onClose();
  });

  function set<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  // Les affaires proposées : les vivantes, et celles déjà liées même archivées.
  // Calculées une fois : « Sans lien » ne doit pas faire disparaître la ligne.
  const [options] = useState(() => {
    const linked = new Set((unit?.projects ?? []).map((link) => link.project_id));
    return projects.filter((project) => project.archived_at === null || linked.has(project.id));
  });

  async function submit() {
    const next = await save.run(customerId, unit?.id ?? null, {
      ...draft,
      projects: Object.entries(links)
        .filter((entry): entry is [string, UnitProjectRole] => entry[1] !== "")
        .map(([project_id, role]) => ({ project_id, role })),
    });
    if (!next) return;
    onSaved(next);
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => void guard(open)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" data-demo="unit-dialog">
        <DialogHeader>
          <DialogTitle>{unit ? `Modifier « ${unit.label} »` : "Ajouter un lot"}</DialogTitle>
          <DialogDescription>
            Le lot, qui l&apos;occupe, et ce qu&apos;il a à voir avec les affaires de l&apos;immeuble.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Lot"
            placeholder="Appartement 2e gauche"
            value={draft.label}
            required
            autoFocus
            error={save.fields.label}
            onChange={(event) => set("label", event.target.value)}
          />
          <SelectField
            label="Type"
            options={KINDS}
            value={draft.kind}
            required
            onValueChange={(value) => set("kind", value as UnitKind)}
          />
          <TextField
            label="Étage"
            placeholder="2e, rez-de-chaussée…"
            value={draft.floor}
            onChange={(event) => set("floor", event.target.value)}
          />
          <SelectField
            label="Qualité de l'occupant"
            options={ROLES}
            value={draft.occupant_role}
            emptyLabel="Non précisée"
            onValueChange={(value) => set("occupant_role", value as OccupantRole | "")}
          />
          <TextField
            label="Occupant"
            placeholder="Mme Saadaoui"
            value={draft.occupant_name}
            onChange={(event) => set("occupant_name", event.target.value)}
          />
          <TextField
            label="Téléphone"
            inputMode="tel"
            value={draft.occupant_phone}
            onChange={(event) => set("occupant_phone", event.target.value)}
          />
          <TextField
            label="Courriel"
            type="email"
            value={draft.occupant_email}
            onChange={(event) => set("occupant_email", event.target.value)}
          />
          <CustomerPicker
            label="Sa fiche, s'il en a une"
            value={draft.occupant_customer_id}
            valueName={ficheName}
            placeholder="Chercher une fiche…"
            onChange={(id, name) => {
              set("occupant_customer_id", id);
              setFicheName(name);
            }}
          />
        </div>
        {options.length > 0 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="text-muted-foreground mb-1 text-xs font-medium">
              Sur les affaires de l&apos;immeuble
            </legend>
            {options.map((project) => (
              <SelectField
                key={project.id}
                // La référence départage deux affaires au même intitulé.
                label={project.reference ? `${project.label} (${project.reference})` : project.label}
                options={LINKS}
                value={links[project.id] ?? ""}
                emptyLabel="Sans lien"
                hint={links[project.id] ? UNIT_PROJECT_ROLE[links[project.id] as UnitProjectRole].hint : undefined}
                onValueChange={(value) => {
                  setLinks((current) => ({ ...current, [project.id]: value as UnitProjectRole | "" }));
                  setDirty(true);
                }}
              />
            ))}
          </fieldset>
        )}
        <TextAreaField
          label="Note"
          placeholder="Accès par la cour, présent le matin…"
          value={draft.note}
          onChange={(event) => set("note", event.target.value)}
        />
        {/* Près du bouton : en haut d'une boîte qui défile, un refus ne se verrait pas. */}
        {save.error && <ErrorNotice message={save.error} />}
        <DialogFooter>
          <Button variant="outline" onClick={() => void guard(false)}>
            Annuler
          </Button>
          <Button disabled={save.pending || draft.label.trim() === ""} onClick={() => void submit()}>
            {save.pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
