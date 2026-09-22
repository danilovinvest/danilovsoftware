"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { CheckIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ErrorNotice } from "@/shared/ui/feedback";
import { SelectField, TextAreaField, TextField } from "@/shared/ui/form";
import { useDirtyGuard } from "@/shared/lib/dirty-guard";
import { customerHref } from "@/shared/lib/routes";
import * as api from "../lib/api";
import { CUSTOMER_KIND, CUSTOMER_SOURCE, PROJECT_STAGE, toOptions } from "../lib/labels";
import { useAction } from "../hooks/use-customers";
import { ReferrerPicker } from "./referrer-picker";
import { SimilarCustomers } from "./similar-customers";
import type {
  CustomerKind,
  CustomerPayload,
  CustomerSource,
  ProjectPayload,
  ProjectStage,
  Referrer,
} from "../lib/types";

/** Le jour local, AAAA-MM-JJ. */
function aujourdhui(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function emptyCustomer(email: string, name: string): CustomerPayload {
  return {
    display_name: name,
    kind: "particulier",
    status: "prospect",
    // Posée vide, jamais « site web » d'office : une source préremplie se
    // valide sans être lue, et fausse le compte de ce qui fait venir les clients.
    source: "" as CustomerSource,
    company_name: "",
    email,
    phone: "",
    address_line: "",
    postal_code: "",
    city: "",
    country: "France",
    requested_at: aujourdhui(),
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

const SOURCES = toOptions(CUSTOMER_SOURCE);

/**
 * Créer une fiche pendant l'appel : un écran, trois champs qui comptent.
 *
 * C'était un assistant en trois étapes, sans formulaire — Entrée ne faisait
 * rien — et sans regarder ce qui existait déjà. On le remplit désormais d'une
 * traite : le nom, le numéro, l'objet de la demande et d'où vient le client ;
 * le reste attend sous « Plus de détails ». Les fiches qui ressemblent à celle
 * qu'on tape s'affichent au fil de la saisie.
 *
 * Ouvert depuis un courriel (`?email=&name=`), il part de l'expéditeur : la
 * fiche naît avec son adresse, et la copie suivante lui rattache ses messages.
 */
export function CustomerWizard() {
  const router = useRouter();
  const params = useSearchParams();
  const [customer, setCustomer] = useState<CustomerPayload>(() => {
    const email = params.get("email") ?? "";
    const fiche = emptyCustomer(email, params.get("name") ?? "");
    return email ? { ...fiche, source: "email" } : fiche;
  });
  const [project, setProject] = useState<ProjectPayload>(emptyProject);
  const [details, setDetails] = useState(false);
  const [missing, setMissing] = useState<Record<string, string>>({});
  /** Le parrain, quand la source est une recommandation. Écrit après la fiche. */
  const [referrer, setReferrer] = useState<Referrer | null>(null);
  // Comparée à l'état réellement posé à l'ouverture, pas à un second appel des
  // valeurs par défaut, qui peuvent dépendre de l'heure ou de l'adresse.
  const [vierge] = useState(() => JSON.stringify([customer, project]));
  useDirtyGuard(JSON.stringify([customer, project]) !== vierge);

  /*
    Ce qui est déjà créé, pour qu'un réessai reprenne où l'échec s'est produit.

    Trois écritures se suivent — la fiche, son parrain, l'affaire — et un échec
    sur la deuxième laissait le bouton actif : un nouveau clic recréait la fiche,
    et le CRM en portait deux. Le réessai ne rejoue plus que ce qui manque.
  */
  const fait = useRef<{ customerId: string | null; referrer: boolean; project: boolean }>({
    customerId: null,
    referrer: false,
    project: false,
  });
  const [ficheCreee, setFicheCreee] = useState<string | null>(null);

  const submit = useAction(async () => {
    const id = fait.current.customerId ?? (await api.createCustomer(customer)).id;
    if (fait.current.customerId === null) {
      fait.current.customerId = id;
      setFicheCreee(id);
    }
    // Le parrain a sa propre route : la fiche doit exister avant qu'on la relie.
    if (customer.source === "recommandation" && referrer && !fait.current.referrer) {
      await api.setCustomerReferrer(id, referrer);
      fait.current.referrer = true;
    }
    // L'affaire est facultative : sans objet, on s'arrête à la fiche.
    if (project.label.trim() !== "" && !fait.current.project) {
      await api.createProject(id, {
        ...project,
        site_city: project.site_city || customer.city,
        /*
          `started_at` est la date de chantier réservée, pas celle de la
          demande. La recopier faisait naître chaque affaire avec un chantier
          déjà daté : le cran « Date » vert à tort, et les alertes « sans date
          de chantier » muettes sur tous les écrans.
        */
        started_at: project.started_at,
        finished_at: project.finished_at,
      });
      fait.current.project = true;
    }
    return id;
  }, { inline: true });

  async function finish(event: React.FormEvent) {
    event.preventDefault();
    const manque: Record<string, string> = {};
    if (customer.display_name.trim() === "") manque.display_name = "Le nom du client est requis.";
    if (!customer.source) manque.source = "Dites comment il nous a contactés.";
    setMissing(manque);
    if (Object.keys(manque).length > 0) return;
    const id = await submit.run();
    if (id) router.push(customerHref(id));
  }

  const set = (patch: Partial<CustomerPayload>) => setCustomer({ ...customer, ...patch });

  return (
    <form className="flex w-full flex-col gap-4" onSubmit={finish} noValidate>
      <Card>
        <CardContent className="grid gap-4 py-6 sm:grid-cols-2">
          {submit.error && (
            <ErrorNotice
              className="sm:col-span-2"
              message={
                ficheCreee
                  ? `La fiche est créée, la suite a échoué : ${submit.error} « Créer la fiche » reprend sans la recréer.`
                  : submit.error
              }
            />
          )}

          <TextField
            label="Nom du client"
            required
            autoFocus
            wrapperClassName="sm:col-span-2"
            placeholder="Ex. Alain Cochin, LE BEFORE / Chloé Ballion"
            value={customer.display_name}
            error={missing.display_name ?? submit.fields.display_name}
            onChange={(event) => set({ display_name: event.target.value })}
          />
          <TextField
            label="Téléphone"
            type="tel"
            placeholder="06 62 46 48 67"
            value={customer.phone}
            onChange={(event) => set({ phone: event.target.value })}
          />
          <TextField
            label="E-mail"
            type="email"
            value={customer.email}
            error={submit.fields.email}
            onChange={(event) => set({ email: event.target.value })}
          />

          <SimilarCustomers name={customer.display_name} phone={customer.phone} email={customer.email} />

          <TextField
            label="Objet de la demande"
            wrapperClassName="sm:col-span-2"
            hint="Facultatif : vide, la fiche naît seule et l'affaire s'ajoutera plus tard."
            placeholder="Ex. Ouverture d'un mur porteur"
            value={project.label}
            onChange={(event) => setProject({ ...project, label: event.target.value })}
          />

          <fieldset className="flex flex-col gap-1.5 sm:col-span-2" data-demo="wizard-source">
            <legend className="mb-1.5 text-xs font-medium">
              Comment nous a-t-il contactés ? <span className="text-destructive">*</span>
            </legend>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Source">
              {SOURCES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={customer.source === option.value}
                  onClick={() => set({ source: option.value as CustomerSource })}
                  className={cn(
                    "rounded-md border px-2.5 py-1.5 text-xs transition-colors",
                    customer.source === option.value
                      ? "border-primary bg-primary/5 font-medium"
                      : "hover:bg-muted/50 border-border",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {missing.source && <p className="text-destructive text-xs">{missing.source}</p>}
          </fieldset>

          {customer.source === "recommandation" && (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-xs font-medium">Recommandé par</span>
              <ReferrerPicker value={referrer} onChange={setReferrer} />
            </div>
          )}

          <button
            type="button"
            onClick={() => setDetails((open) => !open)}
            aria-expanded={details}
            className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-xs sm:col-span-2"
          >
            <ChevronRightIcon className={cn("size-3.5 transition-transform", details && "rotate-90")} />
            Plus de détails — type, ville, chantier, notes
          </button>

          {details && (
            <>
              <SelectField
                label="Type"
                options={toOptions(CUSTOMER_KIND)}
                value={customer.kind}
                onValueChange={(value) => set({ kind: value as CustomerKind })}
              />
              <TextField
                label="Date de la demande"
                type="date"
                value={customer.requested_at ?? ""}
                onChange={(event) => set({ requested_at: event.target.value || null })}
              />
              <TextField
                label="Ville du client"
                placeholder="Cannes, Nice…"
                value={customer.city}
                onChange={(event) => set({ city: event.target.value })}
              />
              <SelectField
                label="Où en est-on ?"
                options={toOptions(PROJECT_STAGE)}
                value={project.stage}
                onValueChange={(value) => setProject({ ...project, stage: value as ProjectStage })}
              />
              <TextField
                label="Adresse du chantier"
                wrapperClassName="sm:col-span-2"
                value={project.site_address}
                onChange={(event) => setProject({ ...project, site_address: event.target.value })}
              />
              <TextField
                label="Code postal"
                value={project.site_postal_code}
                onChange={(event) => setProject({ ...project, site_postal_code: event.target.value })}
              />
              <TextField
                label="Ville du chantier"
                placeholder={customer.city || "Comme le client"}
                value={project.site_city}
                onChange={(event) => setProject({ ...project, site_city: event.target.value })}
              />
              <TextAreaField
                label="Notes"
                wrapperClassName="sm:col-span-2"
                className="min-h-20"
                placeholder="Contexte, contraintes, ce qu'a dit le client…"
                value={customer.notes}
                onChange={(event) => set({ notes: event.target.value })}
              />
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={submit.pending}>
          <CheckIcon />
          Créer la fiche
        </Button>
      </div>
    </form>
  );
}
