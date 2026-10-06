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
import { saveBuildingDocument } from "../lib/building-api";
import { DOCUMENT_KIND, canBeLifted } from "../lib/building-labels";
import type { Building, BuildingDocument, BuildingDocumentKind } from "../lib/building-types";
import type { Project } from "../lib/types";

const KINDS = Object.entries(DOCUMENT_KIND).map(([value, label]) => ({ value, label }));

/**
 * Une pièce du dossier réglementaire, ajoutée ou corrigée.
 *
 * Le lien est celui du document dans OneDrive ou SharePoint : le serveur
 * n'accepte que ces hôtes, et le dit. Seul un arrêté se lève — le champ
 * n'apparaît que pour lui.
 */
export function BuildingDocumentDialog({
  customerId,
  document,
  projects,
  onClose,
  onSaved,
}: {
  customerId: string;
  document: BuildingDocument | null;
  projects: Project[];
  onClose: () => void;
  onSaved: (next: Building) => void;
}) {
  const [draft, setDraft] = useState(() => ({
    kind: document?.kind ?? ("arrete_peril" as BuildingDocumentKind),
    title: document?.title ?? "",
    issued_at: document?.issued_at ?? "",
    lifted_at: document?.lifted_at ?? "",
    authority: document?.authority ?? "",
    reference: document?.reference ?? "",
    document_url: document?.document_url ?? "",
    project_id: document?.project_id ?? "",
    note: document?.note ?? "",
  }));
  const [dirty, setDirty] = useState(false);
  const save = useAction(saveBuildingDocument, { inline: true });
  const guard = useDirtyGuard(dirty, (open) => {
    if (!open) onClose();
  });
  const liftable = canBeLifted(draft.kind);

  function set<K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  async function submit() {
    const next = await save.run(customerId, document?.id ?? null, {
      ...draft,
      issued_at: draft.issued_at || null,
      // Changer le type d'un arrêté levé en rapport retire sa levée avec lui.
      lifted_at: liftable ? draft.lifted_at || null : null,
      project_id: draft.project_id || null,
    });
    if (!next) return;
    onSaved(next);
    onClose();
  }

  const affaires = projects
    .filter((project) => project.archived_at === null || project.id === draft.project_id)
    .map((project) => ({ value: project.id, label: project.label }));

  return (
    <Dialog open onOpenChange={(open) => void guard(open)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" data-demo="building-document-dialog">
        <DialogHeader>
          <DialogTitle>{document ? `Modifier « ${document.title} »` : "Ajouter une pièce au dossier"}</DialogTitle>
          <DialogDescription>
            Ce qui tient à l&apos;immeuble : un arrêté, un rapport, un contrôle. Il y reste quand
            l&apos;affaire est close.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Type"
            options={KINDS}
            value={draft.kind}
            required
            onValueChange={(value) => set("kind", value as BuildingDocumentKind)}
          />
          <TextField
            label="Intitulé"
            placeholder="Arrêté de mise en sécurité"
            value={draft.title}
            required
            autoFocus
            onChange={(event) => set("title", event.target.value)}
          />
          <TextField
            label="Du"
            type="date"
            value={draft.issued_at}
            onChange={(event) => set("issued_at", event.target.value)}
          />
          {liftable && (
            <TextField
              label="Levé le"
              type="date"
              value={draft.lifted_at}
              hint="Vide tant que l'arrêté est en vigueur."
              onChange={(event) => set("lifted_at", event.target.value)}
            />
          )}
          <TextField
            label="Émis par"
            placeholder="Mairie, APAVE, bureau d'études…"
            value={draft.authority}
            onChange={(event) => set("authority", event.target.value)}
          />
          <TextField
            label="Numéro"
            value={draft.reference}
            onChange={(event) => set("reference", event.target.value)}
          />
        </div>
        <TextField
          label="Lien du document"
          placeholder="Lien OneDrive ou SharePoint"
          value={draft.document_url}
          hint="Le lien, jamais le fichier : le document reste où il est rangé."
          onChange={(event) => set("document_url", event.target.value)}
        />
        {affaires.length > 0 && (
          <SelectField
            label="Affaire d'origine"
            options={affaires}
            value={draft.project_id}
            emptyLabel="Aucune : la pièce tient à l'immeuble"
            onValueChange={(value) => set("project_id", value)}
          />
        )}
        <TextAreaField
          label="Note"
          placeholder="Interlocuteur en mairie, périmètre de l'arrêté…"
          value={draft.note}
          onChange={(event) => set("note", event.target.value)}
        />
        {/* Près du bouton : en haut d'une boîte qui défile, un refus ne se verrait pas. */}
        {save.error && <ErrorNotice message={save.error} />}
        <DialogFooter>
          <Button variant="outline" onClick={() => void guard(false)}>
            Annuler
          </Button>
          <Button disabled={save.pending || draft.title.trim() === ""} onClick={() => void submit()}>
            {save.pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
