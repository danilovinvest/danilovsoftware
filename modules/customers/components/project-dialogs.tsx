"use client";

import { useEffect, useState } from "react";
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
import * as api from "../lib/api";
import { PAYMENT_STATUS, PROJECT_STAGE, QUOTE_KIND, QUOTE_STATUS, toOptions } from "../lib/labels";
import { useAction } from "../hooks/use-customers";
import type { Project, ProjectPayload, ProjectStage, QuotePayload } from "../lib/types";

const EMPTY_PROJECT: ProjectPayload = {
  label: "",
  stage: "demande_recue",
  outcome: null,
  outcome_note: "",
  site_address: "",
  site_postal_code: "",
  site_city: "",
  notes: "",
  started_at: null,
  closed_at: null,
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
  balance_status: "non_applicable",
  comment: "",
};

export function ProjectDialog({
  customerId,
  open,
  onOpenChange,
  onSaved,
}: {
  customerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<ProjectPayload>(EMPTY_PROJECT);
  const create = useAction(() => api.createProject(customerId, values));

  useEffect(() => {
    if (open) setValues(EMPTY_PROJECT);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle affaire</DialogTitle>
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
          <TextField
            label="Début"
            type="date"
            value={values.started_at ?? ""}
            onChange={(event) =>
              setValues({ ...values, started_at: event.target.value || null })
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
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function QuoteDialog({
  project,
  onOpenChange,
  onSaved,
}: {
  project: Project | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<QuotePayload>(EMPTY_QUOTE);
  const create = useAction(() =>
    api.createQuote(project?.id ?? "", values),
  );

  useEffect(() => {
    if (project) setValues(EMPTY_QUOTE);
  }, [project]);

  return (
    <Dialog open={project !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {project ? `Nouveau devis — ${project.label}` : "Nouveau devis"}
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
            Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
