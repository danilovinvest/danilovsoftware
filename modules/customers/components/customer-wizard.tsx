"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorNotice } from "@/shared/ui/feedback";
import { SummaryLine, WizardSteps } from "@/shared/ui/wizard";
import { SelectField, TextAreaField, TextField } from "@/shared/ui/form";
import { formatDate } from "@/shared/lib/format";
import * as api from "../lib/api";
import {
  CUSTOMER_KIND,
  CUSTOMER_SOURCE,
  PROJECT_STAGE,
  toOptions,
} from "../lib/labels";
import { useAction } from "../hooks/use-customers";
import { ReferrerPicker } from "./referrer-picker";
import type {
  CustomerKind,
  CustomerPayload,
  CustomerSource,
  ProjectPayload,
  ProjectStage,
  Referrer,
} from "../lib/types";
import { customerHref } from "@/shared/lib/routes";

const STEPS = [
  { title: "Le client", hint: "Qui appelle, et d'où vient la demande" },
  { title: "La demande", hint: "Le chantier concerné — facultatif" },
  { title: "Vérification", hint: "Un dernier coup d'œil avant création" },
];

function emptyCustomer(): CustomerPayload {
  return {
    display_name: "",
    kind: "particulier",
    status: "prospect",
    source: "site_web",
    company_name: "",
    email: "",
    phone: "",
    address_line: "",
    postal_code: "",
    city: "",
    country: "France",
    requested_at: new Date().toISOString().slice(0, 10),
    notes: "",
    owner_id: null,
  };
}

function emptyProject(): ProjectPayload {
  return {
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
}

/**
 * Création guidée : la fiche et sa première affaire se saisissent d'une traite.
 * Le formulaire complet reste utilisé pour la modification, où l'on sait déjà
 * ce qu'on cherche.
 */
export function CustomerWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [customer, setCustomer] = useState<CustomerPayload>(emptyCustomer);
  const [project, setProject] = useState<ProjectPayload>(emptyProject);
  const [stepError, setStepError] = useState<string | null>(null);
  /** Le parrain, quand la source est une recommandation. Écrit après la fiche. */
  const [referrer, setReferrer] = useState<Referrer | null>(null);

  const submit = useAction(async () => {
    const created = await api.createCustomer(customer);
    // Le parrain a sa propre route : la fiche doit exister avant qu'on la relie.
    if (customer.source === "recommandation" && referrer) {
      await api.setCustomerReferrer(created.id, referrer);
    }
    // L'affaire est facultative : sans intitulé, on s'arrête à la fiche.
    if (project.label.trim() !== "") {
      await api.createProject(created.id, {
        ...project,
        site_city: project.site_city || customer.city,
        started_at: project.started_at ?? customer.requested_at,
        finished_at: project.finished_at,
      });
    }
    return created;
  });

  function next() {
    if (step === 0 && customer.display_name.trim() === "") {
      setStepError("Le nom du client est requis pour continuer.");
      return;
    }
    setStepError(null);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  async function finish() {
    const created = await submit.run();
    if (created) router.push(customerHref(created.id));
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <WizardSteps steps={STEPS} current={step} />

      <Card>
        <CardContent className="flex flex-col gap-5 py-6">
          <div>
            <h2 className="font-semibold">{STEPS[step].title}</h2>
            <p className="text-muted-foreground text-sm">{STEPS[step].hint}</p>
          </div>

          {stepError && <ErrorNotice message={stepError} />}
          {submit.error && <ErrorNotice message={submit.error} />}

          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Nom du client"
                required
                autoFocus
                wrapperClassName="sm:col-span-2"
                placeholder="Ex. Alain Cochin, LE BEFORE / Chloé Ballion"
                value={customer.display_name}
                error={submit.fields.display_name}
                onChange={(event) =>
                  setCustomer({ ...customer, display_name: event.target.value })
                }
              />
              <SelectField
                label="Type"
                options={toOptions(CUSTOMER_KIND)}
                value={customer.kind}
                onValueChange={(value) =>
                  setCustomer({ ...customer, kind: value as CustomerKind })
                }
              />
              <SelectField
                label="Comment nous a-t-il contactés ?"
                options={toOptions(CUSTOMER_SOURCE)}
                value={customer.source}
                onValueChange={(value) =>
                  setCustomer({ ...customer, source: value as CustomerSource })
                }
              />
              {customer.source === "recommandation" && (
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="text-xs font-medium">Recommandé par</span>
                  <ReferrerPicker value={referrer} onChange={setReferrer} />
                </div>
              )}
              <TextField
                label="Téléphone"
                placeholder="06 62 46 48 67"
                value={customer.phone}
                onChange={(event) =>
                  setCustomer({ ...customer, phone: event.target.value })
                }
              />
              <TextField
                label="E-mail"
                type="email"
                value={customer.email}
                error={submit.fields.email}
                onChange={(event) =>
                  setCustomer({ ...customer, email: event.target.value })
                }
              />
              <TextField
                label="Ville"
                placeholder="Cannes, Nice…"
                value={customer.city}
                onChange={(event) =>
                  setCustomer({ ...customer, city: event.target.value })
                }
              />
              <TextField
                label="Date de la demande"
                type="date"
                value={customer.requested_at ?? ""}
                onChange={(event) =>
                  setCustomer({ ...customer, requested_at: event.target.value || null })
                }
              />
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label="Objet de la demande"
                autoFocus
                wrapperClassName="sm:col-span-2"
                hint="Laissez vide pour créer la fiche seule ; l'affaire s'ajoutera plus tard."
                placeholder="Ex. Ouverture d'un mur porteur"
                value={project.label}
                onChange={(event) => setProject({ ...project, label: event.target.value })}
              />
              <TextField
                label="Adresse du chantier"
                wrapperClassName="sm:col-span-2"
                value={project.site_address}
                onChange={(event) =>
                  setProject({ ...project, site_address: event.target.value })
                }
              />
              <TextField
                label="Code postal"
                value={project.site_postal_code}
                onChange={(event) =>
                  setProject({ ...project, site_postal_code: event.target.value })
                }
              />
              <TextField
                label="Ville du chantier"
                placeholder={customer.city || "Comme le client"}
                value={project.site_city}
                onChange={(event) =>
                  setProject({ ...project, site_city: event.target.value })
                }
              />
              <SelectField
                label="Où en est-on ?"
                wrapperClassName="sm:col-span-2"
                options={toOptions(PROJECT_STAGE)}
                value={project.stage}
                onValueChange={(value) =>
                  setProject({ ...project, stage: value as ProjectStage })
                }
              />
              <TextAreaField
                label="Notes"
                wrapperClassName="sm:col-span-2"
                className="min-h-20"
                placeholder="Contexte, contraintes, ce qu'a dit le client…"
                value={customer.notes}
                onChange={(event) =>
                  setCustomer({ ...customer, notes: event.target.value })
                }
              />
            </div>
          )}

          {step === 2 && <Summary customer={customer} project={project} referrer={referrer} />}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          disabled={step === 0 || submit.pending}
          onClick={() => {
            setStepError(null);
            setStep((current) => Math.max(current - 1, 0));
          }}
        >
          <ArrowLeftIcon />
          Précédent
        </Button>

        {step < STEPS.length - 1 ? (
          <Button size="lg" onClick={next}>
            Continuer
            <ArrowRightIcon />
          </Button>
        ) : (
          <Button size="lg" disabled={submit.pending} onClick={finish}>
            <CheckIcon />
            Créer la fiche
          </Button>
        )}
      </div>
    </div>
  );
}

function Summary({
  customer,
  project,
  referrer,
}: {
  customer: CustomerPayload;
  project: ProjectPayload;
  referrer: Referrer | null;
}) {
  const contact = [customer.phone, customer.email, customer.city]
    .filter(Boolean)
    .join(" · ");

  return (
    <dl className="divide-y text-sm">
      <SummaryLine label="Client" value={customer.display_name} />
      <SummaryLine label="Type" value={CUSTOMER_KIND[customer.kind].label} />
      <SummaryLine
        label="Source"
        value={
          customer.source === "recommandation" && referrer
            ? `${CUSTOMER_SOURCE[customer.source].label} · ${referrer.name}`
            : CUSTOMER_SOURCE[customer.source].label
        }
      />
      <SummaryLine label="Coordonnées" value={contact || "aucune"} />
      <SummaryLine label="Demande reçue le" value={formatDate(customer.requested_at)} />
      <SummaryLine
        label="Affaire"
        value={
          project.label.trim() === ""
            ? "aucune pour l'instant"
            : `${project.label} — ${PROJECT_STAGE[project.stage].label}`
        }
      />
      {customer.notes && <SummaryLine label="Notes" value={customer.notes} />}
    </dl>
  );
}
