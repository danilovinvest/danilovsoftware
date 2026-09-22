"use client";

import { useState } from "react";
import { useDirtyGuard } from "@/shared/lib/dirty-guard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorNotice } from "@/shared/ui/feedback";
import { SelectField, TextAreaField, TextField } from "@/shared/ui/form";
import { useColleagues } from "@/shared/hooks/use-colleagues";
import * as api from "../lib/api";
import { PROJECT_MISSION, PROJECT_STAGE, toOptions } from "../lib/labels";
import { useAction } from "../hooks/use-customers";
import type { Project, ProjectPayload, ProjectStage } from "../lib/types";

// Le devis a son propre fichier ; il reste importable d'ici.
export { QuoteDialog } from "./quote-dialog";

const EMPTY_PROJECT: ProjectPayload = {
  label: "",
  stage: "demande_recue",
  scope: null,
  manager_id: null,
  engineer_id: null,
  drafter_id: null,
  outcome: null,
  outcome_note: "",
  site_address: "",
  site_postal_code: "",
  site_city: "",
  notes: "",
  started_at: null,
  finished_at: null,
  closed_at: null,
  mission: null,
  promised_at: null,
  internal_deadline_at: null,
};

/**
 * La boîte part d'un état neuf à chaque ouverture. Le remontage est provoqué
 * par une `key` posée à l'appel plutôt que par un effet de réinitialisation,
 * qui déclencherait un rendu en cascade.
 */
/** Une affaire existante, telle que le formulaire l'attend. */
function projectToPayload(project: Project): ProjectPayload {
  return {
    label: project.label,
    stage: project.stage,
    scope: project.scope,
    outcome: project.outcome,
    outcome_note: project.outcome_note,
    site_address: project.site_address,
    site_postal_code: project.site_postal_code,
    site_city: project.site_city,
    notes: project.notes,
    started_at: project.started_at,
    finished_at: project.finished_at,
    closed_at: project.closed_at,
    mission: project.mission,
    promised_at: project.promised_at,
    internal_deadline_at: project.internal_deadline_at,
    manager_id: project.manager_id,
    engineer_id: project.engineer_id,
    drafter_id: project.drafter_id,
  };
}

/**
 * L'affaire, créée ou modifiée.
 *
 * Le même formulaire pour les deux : une affaire se décrit une fois. Il ne
 * savait que créer, si bien que les 514 affaires déjà en base n'avaient aucun
 * endroit où recevoir un responsable — le champ existait et rien ne pouvait le
 * remplir.
 */
export function ProjectDialog({
  customerId,
  project = null,
  open,
  onOpenChange,
  onSaved,
}: {
  customerId: string;
  /** Présente, on la modifie au lieu d'en créer une. */
  project?: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [initial] = useState<ProjectPayload>(() =>
    project ? projectToPayload(project) : EMPTY_PROJECT,
  );
  const [values, setValues] = useState<ProjectPayload>(initial);
  const close = useDirtyGuard(JSON.stringify(values) !== JSON.stringify(initial), onOpenChange);
  const create = useAction(() =>
    project ? api.updateProject(project.id, values) : api.createProject(customerId, values),
    { inline: true },
  );
  const colleagues = useColleagues();

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{project ? "Modifier l'affaire" : "Nouvelle affaire"}</DialogTitle>
        </DialogHeader>

        <form
          id="project-form"
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!(await create.run())) return;
            onOpenChange(false);
            onSaved();
          }}
        >
          {create.error && (
            <div className="sm:col-span-2">
              <ErrorNotice message={create.error} />
            </div>
          )}
          <TextField
            label="Intitulé"
            required
            wrapperClassName="sm:col-span-2"
            placeholder="Ex. Ouverture d'un mur porteur"
            value={values.label}
            error={create.fields.label}
            onChange={(event) => setValues({ ...values, label: event.target.value })}
          />
          <SelectField
            label="Étape"
            options={toOptions(PROJECT_STAGE)}
            value={values.stage}
            onValueChange={(value) => setValues({ ...values, stage: value as ProjectStage })}
          />
          {/*
            Les deux bornes du chantier.

            Le début existait seul : c'est la colonne que l'écran Chantiers lit,
            et un chantier terminé n'avait aucun endroit où le dire — sauf par
            un événement d'agenda, qui l'écrivait sans que la fiche puisse le
            montrer ni le corriger. Ici seulement la date se retire, l'agenda
            n'écrivant que sous `coalesce`.
          */}
          <TextField
            label="Début du chantier"
            data-demo="project-dates"
            type="date"
            value={values.started_at ?? ""}
            onChange={(event) =>
              setValues({ ...values, started_at: event.target.value || null })
            }
          />
          <TextField
            label="Fin du chantier"
            data-demo="project-dates"
            type="date"
            value={values.finished_at ?? ""}
            onChange={(event) =>
              setValues({ ...values, finished_at: event.target.value || null })
            }
            hint="Vide tant que le chantier n'est pas terminé."
          />
          {/*
            La mission et les deux délais.

            La mission se déduit des devis tant que personne ne la choisit :
            « Déduite » est donc un vrai choix, pas un champ vide. Les deux
            dates sont distinctes parce qu'elles ne disent pas la même chose —
            l'une engage l'entreprise, l'autre est la marge qu'elle se donne.
          */}
          <SelectField
            id="project-mission"
            label="Mission"
            wrapperClassName="sm:col-span-2"
            options={[{ value: "", label: "Déduite des devis" }, ...toOptions(PROJECT_MISSION)]}
            value={values.mission ?? ""}
            onValueChange={(value) =>
              setValues({ ...values, mission: (value || null) as ProjectPayload["mission"] })
            }
            hint="Pour une affaire de STRUCTURE : elle choisit le parcours de l'étude."
          />
          <TextField
            label="Promis au client"
            data-demo="project-delais"
            type="date"
            value={values.promised_at ?? ""}
            onChange={(event) =>
              setValues({ ...values, promised_at: event.target.value || null })
            }
          />
          <TextField
            label="Deadline interne"
            data-demo="project-delais"
            type="date"
            value={values.internal_deadline_at ?? ""}
            onChange={(event) =>
              setValues({ ...values, internal_deadline_at: event.target.value || null })
            }
          />
          {/*
            Les trois intervenants.

            Le même annuaire pour les trois, et non la liste des comptes portant
            le rôle : les deux rôles de production viennent d'être créés et
            personne ne les porte encore. Filtrer dessus rendrait les trois
            champs vides, donc inutilisables, le jour même où on les ajoute.
            Quand les postes seront pourvus, c'est le rôle du compte qui dira
            qui fait quoi, pas ce sélecteur.
          */}
          <SelectField
            label="Responsable"
            wrapperClassName="sm:col-span-2"
            options={personnes(colleagues)}
            value={values.manager_id ?? ""}
            onValueChange={(value) =>
              setValues({ ...values, manager_id: value || null })
            }
            hint="Qui suit ce dossier de bout en bout."
          />
          <SelectField
            label="Ingénieur"
            options={personnes(colleagues)}
            value={values.engineer_id ?? ""}
            onValueChange={(value) =>
              setValues({ ...values, engineer_id: value || null })
            }
          />
          <SelectField
            label="Dessinateur"
            options={personnes(colleagues)}
            value={values.drafter_id ?? ""}
            onValueChange={(value) =>
              setValues({ ...values, drafter_id: value || null })
            }
          />

          <TextField
            label="Adresse du chantier"
            wrapperClassName="sm:col-span-2"
            value={values.site_address}
            onChange={(event) => setValues({ ...values, site_address: event.target.value })}
          />
          <TextField
            label="Code postal"
            value={values.site_postal_code}
            onChange={(event) =>
              setValues({ ...values, site_postal_code: event.target.value })
            }
          />
          <TextField
            label="Ville"
            value={values.site_city}
            onChange={(event) => setValues({ ...values, site_city: event.target.value })}
          />
          {/*
            Le contexte de l'affaire — accès, contraintes, voisinage (issue 83).
            Il s'écrivait dans les notes de la fiche, mêlé aux autres affaires.
          */}
          <TextAreaField
            label="Notes de l'affaire"
            wrapperClassName="sm:col-span-2"
            placeholder="Accès, digicode, contraintes du chantier…"
            value={values.notes}
            onChange={(event) => setValues({ ...values, notes: event.target.value })}
          />
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)}>
            Annuler
          </Button>
          <Button form="project-form" type="submit" disabled={create.pending}>
            {project ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * L'annuaire, en options de liste.
 *
 * La première est vide et s'appelle « Personne » : retirer quelqu'un d'un
 * dossier est un geste aussi courant que l'y mettre, et une liste sans issue
 * obligerait à supprimer l'affaire pour défaire une erreur de clic.
 */
function personnes(colleagues: { id: string; name: string }[]) {
  return [
    { value: "", label: "Personne" },
    ...colleagues.map((c) => ({ value: c.id, label: c.name })),
  ];
}
