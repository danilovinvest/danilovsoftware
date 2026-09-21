"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorNotice } from "@/shared/ui/feedback";
import { SelectField, TextField } from "@/shared/ui/form";
import { parseAmountInput } from "./deposit-field";
import { useColleagues } from "@/shared/hooks/use-colleagues";
import * as api from "../lib/api";
import {
  PAYMENT_STATUS,
  PROJECT_MISSION,
  PROJECT_STAGE,
  QUOTE_ISSUER,
  QUOTE_KIND,
  QUOTE_STATUS,
  toOptions,
} from "../lib/labels";
import { useAction } from "../hooks/use-customers";
import type {
  Project,
  ProjectPayload,
  ProjectStage,
  Quote,
  QuotePayload,
} from "../lib/types";

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

const EMPTY_QUOTE: QuotePayload = {
  reference: "",
  kind: "etude",
  label: "",
  status: "a_faire",
  issued_at: null,
  amount_ht: null,
  amount_ttc: null,
  vat_rate: null,
  amount_note: "",
  deposit_status: "non_applicable",
  deposit_amount: null,
  balance_status: "non_applicable",
  balance_amount: null,
  comment: "",
};

/**
 * Les deux boîtes de dialogue partent d'un état neuf à chaque ouverture. Le
 * remontage est provoqué par une `key` posée à l'appel plutôt que par un effet
 * de réinitialisation, qui déclencherait un rendu en cascade.
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
  const [values, setValues] = useState<ProjectPayload>(() =>
    project ? projectToPayload(project) : EMPTY_PROJECT,
  );
  const create = useAction(() =>
    project ? api.updateProject(project.id, values) : api.createProject(customerId, values),
  );
  const colleagues = useColleagues();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{project ? "Modifier le projet" : "Nouveau projet"}</DialogTitle>
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
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
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
 * Un devis existant, tel que le formulaire l'attend.
 *
 * `PATCH /v1/quotes/{id}` **remplace le devis entier** : un champ omis est un
 * champ effacé, sans erreur. Tous voyagent donc, y compris ceux que le
 * formulaire ne montre pas — le taux de TVA, que rien n'affiche.
 */
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

function toPayload(quote: Quote): QuotePayload {
  return {
    reference: quote.reference,
    kind: quote.kind,
    label: quote.label,
    status: quote.status,
    issued_at: quote.issued_at,
    amount_ht: quote.amount_ht,
    amount_ttc: quote.amount_ttc,
    vat_rate: quote.vat_rate,
    amount_note: quote.amount_note,
    deposit_status: quote.deposit_status,
    deposit_amount: quote.deposit_amount,
    balance_status: quote.balance_status,
    balance_amount: quote.balance_amount,
    comment: quote.comment,
    issuer: quote.issuer,
  };
}

/**
 * Le devis, créé ou corrigé.
 *
 * Un même formulaire pour les deux, parce qu'un devis se décrit une fois : en
 * tenir un second pour la correction l'aurait fait diverger au premier champ
 * ajouté, et c'est précisément ce qui manquait — trois sources ont peuplé le
 * CRM sans se connaître, et un devis repris d'un export de devis peut porter
 * une référence, un montant ou une société à corriger. Jusqu'ici on ne pouvait
 * que le supprimer.
 *
 * La copie OneDrive ne réécrit jamais un devis qu'elle connaît déjà : elle n'y
 * rattache que son document. Une correction faite ici tient donc.
 */
export function QuoteDialog({
  project,
  quote = null,
  onOpenChange,
  onSaved,
}: {
  project: Project | null;
  /** Présent, on corrige ce devis au lieu d'en créer un. */
  quote?: Quote | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<QuotePayload>(() =>
    quote ? toPayload(quote) : EMPTY_QUOTE,
  );
  const create = useAction(() => {
    // Tapé à la française — « 2 400,50 » — et envoyé comme l'API l'attend.
    const deposit = parseAmountInput(values.deposit_amount);
    if (deposit === undefined) {
      throw new Error("Le montant de l'acompte est illisible : 2 400 ou 2 400,50.");
    }
    const balance = parseAmountInput(values.balance_amount);
    if (balance === undefined) {
      throw new Error("Le montant du solde est illisible : 2 400 ou 2 400,50.");
    }
    const payload = { ...values, deposit_amount: deposit, balance_amount: balance };
    return quote ? api.updateQuote(quote.id, payload) : api.createQuote(project?.id ?? "", payload);
  });

  return (
    <Dialog open={quote !== null || project !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {quote
              ? `Modifier ${quote.reference || "le devis"}`
              : project
                ? `Nouveau devis — ${project.label}`
                : "Nouveau devis"}
          </DialogTitle>
        </DialogHeader>

        <form
          id="quote-form"
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
            label="Référence"
            placeholder="DE2026-0092"
            value={values.reference}
            error={create.fields.reference}
            onChange={(event) => setValues({ ...values, reference: event.target.value })}
          />
          <SelectField
            label="Type"
            options={toOptions(QUOTE_KIND)}
            value={values.kind}
            onValueChange={(value) =>
              setValues({ ...values, kind: value as QuotePayload["kind"] })
            }
          />
          <TextField
            label="Intitulé"
            wrapperClassName="sm:col-span-2"
            placeholder="sondages + étude + travaux"
            value={values.label}
            onChange={(event) => setValues({ ...values, label: event.target.value })}
          />
          <TextField
            label="Montant HT"
            inputMode="decimal"
            placeholder="8050.00"
            value={values.amount_ht ?? ""}
            error={create.fields.amount_ht}
            onChange={(event) =>
              setValues({ ...values, amount_ht: event.target.value || null })
            }
          />
          <TextField
            label="Montant TTC"
            inputMode="decimal"
            placeholder="8975.00"
            value={values.amount_ttc ?? ""}
            onChange={(event) =>
              setValues({ ...values, amount_ttc: event.target.value || null })
            }
          />
          <TextField
            label="Date du devis"
            type="date"
            value={values.issued_at ?? ""}
            onChange={(event) =>
              setValues({ ...values, issued_at: event.target.value || null })
            }
          />
          <SelectField
            label="Statut"
            options={toOptions(QUOTE_STATUS)}
            value={values.status}
            onValueChange={(value) =>
              setValues({ ...values, status: value as QuotePayload["status"] })
            }
          />
          {/*
            L'émetteur ne se propose que pour **corriger** : à la création, le
            serveur le déduit de la nature de la prestation, et le laisser
            choisir d'emblée ferait saisir une évidence neuf fois sur dix.
            C'est le devis qui porte le SIREN et la TVA, donc c'est là que
            l'erreur se répare.
          */}
          {quote && (
            <SelectField
              label="Société qui émet"
              options={toOptions(QUOTE_ISSUER)}
              value={values.issuer ?? ""}
              onValueChange={(value) => setValues({ ...values, issuer: value || null })}
            />
          )}
          <SelectField
            label="Acompte"
            options={toOptions(PAYMENT_STATUS)}
            value={values.deposit_status}
            onValueChange={(value) =>
              setValues({
                ...values,
                deposit_status: value as QuotePayload["deposit_status"],
              })
            }
          />
          {/* Pas d'acompte, pas de montant : le serveur l'efface de lui-même. */}
          {values.deposit_status !== "non_applicable" && (
            <TextField
              label="Montant de l'acompte"
              hint="Ce que le client a réglé, s'il l'a changé"
              inputMode="decimal"
              placeholder="2 400"
              value={values.deposit_amount ?? ""}
              onChange={(event) =>
                setValues({ ...values, deposit_amount: event.target.value || null })
              }
            />
          )}
          <SelectField
            label="Solde"
            options={toOptions(PAYMENT_STATUS)}
            value={values.balance_status}
            onValueChange={(value) =>
              setValues({
                ...values,
                balance_status: value as QuotePayload["balance_status"],
              })
            }
          />
          {/* Pas de solde, pas de montant : le serveur l'efface de lui-même. */}
          {values.balance_status !== "non_applicable" && (
            <TextField
              label="Montant du solde"
              data-demo="quote-balance-amount"
              hint="Ce que le client a réglé, avenant ou remise compris"
              inputMode="decimal"
              placeholder="5 600"
              value={values.balance_amount ?? ""}
              onChange={(event) =>
                setValues({ ...values, balance_amount: event.target.value || null })
              }
            />
          )}
          <TextField
            label="Montant non chiffré"
            hint="Pour les fourchettes : « 5000-6000 € »"
            value={values.amount_note}
            onChange={(event) => setValues({ ...values, amount_note: event.target.value })}
          />
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button form="quote-form" type="submit" disabled={create.pending}>
            {quote ? "Enregistrer" : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
