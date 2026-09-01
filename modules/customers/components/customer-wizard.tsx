"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorNotice } from "@/shared/ui/feedback";
import { SelectField, TextAreaField, TextField } from "@/shared/ui/form";
import { cn } from "@/lib/utils";
import { formatDate } from "@/shared/lib/format";
import * as api from "../lib/api";
import {
  CUSTOMER_KIND,
  CUSTOMER_SOURCE,
  PROJECT_STAGE,
  toOptions,
} from "../lib/labels";
import { useAction } from "../hooks/use-customers";
import type {
  CustomerKind,
  CustomerPayload,
  CustomerSource,
  ProjectPayload,
  ProjectStage,
} from "../lib/types";

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
    outcome: null,
    outcome_note: "",
    site_address: "",
    site_postal_code: "",
    site_city: "",
    notes: "",
    started_at: null,
    closed_at: null,
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

  const submit = useAction(async () => {
    const created = await api.createCustomer(customer);
    // L'affaire est facultative : sans intitulé, on s'arrête à la fiche.
    if (project.label.trim() !== "") {
      await api.createProject(created.id, {
        ...project,
        site_city: project.site_city || customer.city,
        started_at: project.started_at ?? customer.requested_at,
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
    if (created) router.push(`/customers/${created.id}`);
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <Steps current={step} />

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

          {step === 2 && <Summary customer={customer} project={project} />}
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

function Steps({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={step.title} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold",
                done && "bg-success-soft text-success",
                active && "bg-primary text-primary-foreground",
                !done && !active && "bg-muted text-muted-foreground",
              )}
            >
              {done ? <CheckIcon className="size-3.5" /> : index + 1}
            </span>
            <span
              className={cn(
                "hidden text-sm sm:block",
                active ? "font-medium" : "text-muted-foreground",
              )}
            >
              {step.title}
            </span>
            {index < STEPS.length - 1 && (
              <span
                className={cn("h-px flex-1", done ? "bg-success" : "bg-border")}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Summary({
  customer,
  project,
}: {
  customer: CustomerPayload;
  project: ProjectPayload;
}) {
  const contact = [customer.phone, customer.email, customer.city]
    .filter(Boolean)
    .join(" · ");

  return (
    <dl className="divide-y text-sm">
      <Line label="Client" value={customer.display_name} />
      <Line label="Type" value={CUSTOMER_KIND[customer.kind].label} />
      <Line label="Source" value={CUSTOMER_SOURCE[customer.source].label} />
      <Line label="Coordonnées" value={contact || "aucune"} />
      <Line label="Demande reçue le" value={formatDate(customer.requested_at)} />
      <Line
        label="Affaire"
        value={
          project.label.trim() === ""
            ? "aucune pour l'instant"
            : `${project.label} — ${PROJECT_STAGE[project.stage].label}`
        }
      />
      {customer.notes && <Line label="Notes" value={customer.notes} />}
    </dl>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-6 py-2.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-right whitespace-pre-line">{value}</dd>
    </div>
  );
}
