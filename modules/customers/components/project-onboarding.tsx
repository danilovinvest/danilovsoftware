"use client";

import { useState } from "react";
import { AlertTriangleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ErrorNotice } from "@/shared/ui/feedback";
import { TextField } from "@/shared/ui/form";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/shared/api/errors";
import * as api from "../lib/api";
import { INTERVENTION_SCOPE } from "../lib/labels";
import type {
  CustomerDetail,
  InterventionScope,
  Project,
  Milestones,
} from "../lib/types";

/**
 * Compléter une affaire en un écran, pendant que le client est en ligne.
 *
 * Une fiche créée au téléphone naît avec un nom et rien d'autre : pas de
 * téléphone, pas d'adresse, et une affaire intitulée « Affaire 2026 » dont
 * personne ne sait ce qu'elle est. Trois cent quatre-vingt-onze affaires sur
 * cinq cent neuf n'ont aucun type d'intervention, et c'est pourtant lui qui
 * fait le prix avec le type de bien.
 *
 * Le tiroir demande **ce qui manque et rien d'autre**, dans l'ordre où on le
 * dit au téléphone : de quoi il s'agit, où, et à quel numéro rappeler. Tout le
 * reste de la fiche se remplit après, une fois raccroché.
 *
 * **Il fait l'intelligent sur trois choses**, parce qu'un formulaire rapide est
 * un formulaire qui devine ce qu'il peut :
 *
 *   * le **premier contact** est daté d'aujourd'hui si rien ne le datait — on
 *     est en train de parler au client, c'est le contact ;
 *   * l'**intitulé** de l'affaire prend le type choisi quand il ne disait rien
 *     (« Affaire 2026 », un intitulé vide) — et il est laissé tel quel s'il dit
 *     déjà quelque chose, parce qu'on n'écrase pas ce que quelqu'un a écrit ;
 *   * le **téléphone** va sur la fiche et non sur l'affaire : c'est la personne
 *     qu'on rappelle, pas le chantier.
 */

/** Un intitulé qui ne dit rien : celui que l'import pose faute de mieux. */
function muet(label: string): boolean {
  return label.trim() === "" || /^(affaire|dossier|projet)\s*\d*$/i.test(label.trim());
}

/**
 * L'affaire manque-t-elle de l'essentiel ?
 *
 * Le type d'intervention seul décide. L'adresse et le téléphone se complètent
 * souvent plus tard — on ne les a pas toujours au premier appel — et faire
 * clignoter une alerte pour un code postal absent apprendrait à l'ignorer.
 */
export function projetIncomplet(project: Project): boolean {
  return project.scope === null;
}

export function ProjectOnboardingButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-warning-soft flex flex-wrap items-center gap-x-4 gap-y-3 rounded-md border border-transparent px-3 py-2.5",
        className,
      )}
    >
      <AlertTriangleIcon className="text-warning size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-warning text-sm font-medium">Type de projet à renseigner</div>
        <div className="text-muted-foreground mt-0.5 text-xs">
          C&apos;est lui qui fait le prix. Trente secondes, et l&apos;affaire est
          lisible par tout le monde.
        </div>
      </div>
      <Button
        size="xs"
        className="bg-warning text-background hover:bg-warning/85"
        onClick={onClick}
      >
        Compléter
      </Button>
    </div>
  );
}

export function ProjectOnboardingDrawer({
  customer,
  project,
  milestones,
  open,
  onOpenChange,
  onSaved,
}: {
  customer: CustomerDetail;
  project: Project;
  /** Les jalons de l'affaire, pour ne dater le contact que s'il ne l'est pas. */
  milestones: Milestones | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [scope, setScope] = useState<InterventionScope | null>(project.scope);
  const [label, setLabel] = useState(project.label);
  const [phone, setPhone] = useState(customer.phone);
  const [address, setAddress] = useState(project.site_address);
  const [postal, setPostal] = useState(project.site_postal_code);
  const [city, setCity] = useState(project.site_city);
  const [pending, setPending] = useState(false);
  const [echec, setEchec] = useState<string | null>(null);

  /*
    Choisir le type renomme l'affaire, tant qu'elle ne dit rien.

    C'est le geste qui fait gagner le plus de temps : « Affaire 2026 » devient
    « Ouverture de mur porteur » sans qu'on ait à taper. Dès que l'intitulé dit
    quelque chose, on n'y touche plus — y compris si c'est l'utilisateur qui
    vient de l'écrire.
  */
  function choisir(valeur: InterventionScope) {
    setScope(valeur);
    if (muet(label)) setLabel(INTERVENTION_SCOPE[valeur].label);
  }

  async function enregistrer() {
    setPending(true);
    setEchec(null);
    try {
      await api.updateProject(project.id, {
        label: label.trim() || project.label,
        stage: project.stage,
        scope,
        // Renvoyés tels quels : ce tiroir ne nomme personne, et un champ omis
        // est un champ effacé.
        manager_id: project.manager_id,
        engineer_id: project.engineer_id,
        drafter_id: project.drafter_id,
        outcome: project.outcome,
        outcome_note: project.outcome_note,
        site_address: address,
        site_postal_code: postal,
        site_city: city,
        notes: project.notes,
        started_at: project.started_at,
        closed_at: project.closed_at,
      });

      // Le téléphone appartient à la personne, pas au chantier.
      if (phone.trim() !== customer.phone) {
        await api.updateCustomer(customer.id, {
          display_name: customer.display_name,
          kind: customer.kind,
          status: customer.status,
          source: customer.source,
          company_name: customer.company_name,
          email: customer.email,
          phone: phone.trim(),
          address_line: customer.address_line,
          postal_code: customer.postal_code,
          city: customer.city,
          country: customer.country,
          requested_at: customer.requested_at,
          notes: customer.notes,
          owner_id: customer.owner_id,
        });
      }

      /*
        Le premier contact est daté d'aujourd'hui s'il ne l'était pas.

        On est en train de parler au client : le cran « Contact » est franchi,
        et le laisser gris obligerait à le cocher à la main juste après. La
        route remplace la ligne entière, donc tout le reste repart tel quel.
      */
      if (milestones?.contact_at == null) {
        await api.setMilestones(project.id, {
          rib_sent_at: milestones?.rib_sent_at ?? null,
          insurance_sent_at: milestones?.insurance_sent_at ?? null,
          materials_ordered_at: milestones?.materials_ordered_at ?? null,
          materials: milestones?.materials ?? [],
          resume_at: milestones?.resume_at ?? null,
          plans_sent_at: milestones?.plans_sent_at ?? null,
          review_requested_at: milestones?.review_requested_at ?? null,
          review_received_at: milestones?.review_received_at ?? null,
          pv_sent_at: milestones?.pv_sent_at ?? null,
          pv_signed_at: milestones?.pv_signed_at ?? null,
          visit_report_sent_at: milestones?.visit_report_sent_at ?? null,
          survey_report_sent_at: milestones?.survey_report_sent_at ?? null,
          contact_at: new Date().toISOString(),
          rdv_at: milestones?.rdv_at ?? null,
          quote_sent_at: milestones?.quote_sent_at ?? null,
          negotiation_at: milestones?.negotiation_at ?? null,
          signed_at: milestones?.signed_at ?? null,
        });
      }

      onOpenChange(false);
      onSaved();
    } catch (cause) {
      setEchec(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Compléter l&apos;affaire</SheetTitle>
          <SheetDescription>
            {customer.display_name}. Ce qui manque pour que l&apos;affaire soit
            lisible, et rien d&apos;autre.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-4">
          {echec && <ErrorNotice message={echec} />}

          {/*
            Le type se touche, il ne se déroule pas : une liste déroulante
            demande un clic pour l'ouvrir, un pour choisir, et cache les autres
            valeurs entre les deux. Ici tout est visible et c'est un seul geste.
          */}
          <div>
            <Label className="mb-1.5 block text-sm font-normal">Type de projet</Label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(INTERVENTION_SCOPE) as InterventionScope[]).map((valeur) => (
                <button
                  key={valeur}
                  type="button"
                  aria-pressed={scope === valeur}
                  onClick={() => choisir(valeur)}
                  className={cn(
                    "cursor-pointer rounded-md border px-2 py-1 text-xs transition-colors",
                    scope === valeur
                      ? "border-success/40 bg-success-soft text-success font-medium"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30",
                  )}
                >
                  {INTERVENTION_SCOPE[valeur].label}
                </button>
              ))}
            </div>
          </div>

          <TextField
            label="Intitulé de l'affaire"
            value={label}
            hint="Repris du type choisi tant qu'il ne dit rien."
            onChange={(event) => setLabel(event.target.value)}
          />

          <TextField
            label="Téléphone"
            type="tel"
            inputMode="tel"
            placeholder="06 12 34 56 78"
            value={phone}
            hint="Va sur la fiche : c'est la personne qu'on rappelle."
            onChange={(event) => setPhone(event.target.value)}
          />

          <TextField
            label="Adresse du chantier"
            placeholder="12 rue Beaulieu"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
          <div className="grid grid-cols-3 gap-3">
            <TextField
              label="Code postal"
              inputMode="numeric"
              value={postal}
              onChange={(event) => setPostal(event.target.value)}
            />
            <TextField
              label="Ville"
              wrapperClassName="col-span-2"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            />
          </div>

          {milestones?.contact_at == null && (
            <p className="text-muted-foreground/70 text-[11px]">
              Le premier contact sera daté d&apos;aujourd&apos;hui.
            </p>
          )}
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button disabled={pending} onClick={enregistrer}>
            Enregistrer
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
