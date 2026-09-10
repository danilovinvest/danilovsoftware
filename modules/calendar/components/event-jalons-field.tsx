"use client";

import { CheckCircle2Icon, InfoIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ProjectPicker } from "@/modules/customers";
import { DateField } from "@/shared/ui/date-time-field";
import { SelectField, TextAreaField } from "@/shared/ui/form";
import { EVENT_KIND_JALONS, MOYEN_OPTIONS } from "../lib/labels";
import type { EventJalons, EventKind } from "../lib/types";

/**
 * Ce que l'événement inscrit dans la fiche du client.
 *
 * Le geste que le dirigeant réclamait : « quand on crée un événement et qu'on
 * sélectionne la catégorie, je veux avoir des champs prédéfinis — le début, la
 * fin, PV envoyé, PV signé — pour que ça s'actualise tout seul dans la fiche
 * client ». Poser un chantier au planning renseignait le planning et rien
 * d'autre ; il fallait rouvrir la fiche pour y redire la même date, puis y
 * revenir un mois plus tard pour cocher le PV.
 *
 * **Le bloc suit la catégorie**, et quatre catégories sur neuf en portent un.
 * Les cinq autres n'affichent rien parce qu'aucune colonne du CRM ne les
 * attend : un prélèvement LOXAM ne concerne aucune affaire, un congé aucun
 * client. Leur inventer un champ serait pire que de n'en proposer aucun.
 *
 * **Rien ne s'inscrit sans affaire.** Une fiche en porte plusieurs, et deviner
 * laquelle serait pire que de ne rien écrire — d'où le sélecteur d'affaire en
 * tête du bloc, et le message qui le dit quand il manque.
 *
 * **Un champ vide n'efface rien.** Une même affaire porte plusieurs événements
 * de chantier — « Début Toiture », « Coulage Chape », « Enlèvement étais » — et
 * si chacun faisait autorité sur les jalons, le second effacerait le PV saisi
 * sur le premier. L'événement ajoute de l'information, il n'en retire pas ; on
 * retire une date sur la fiche, où l'on voit l'état complet. L'écran le dit.
 */
export function EventJalonsField({
  kind,
  customerId,
  projectId,
  jalons,
  passe,
  onProject,
  onJalons,
}: {
  kind: EventKind;
  customerId: string | null;
  projectId: string | null;
  jalons: EventJalons;
  /** L'événement a-t-il déjà eu lieu ? Décide du compte rendu. */
  passe: boolean;
  onProject: (projectId: string | null) => void;
  onJalons: (next: EventJalons) => void;
}) {
  const champs = EVENT_KIND_JALONS[kind];
  if (champs.length === 0) return null;

  const set = <K extends keyof EventJalons>(field: K, value: EventJalons[K]) =>
    onJalons({ ...jalons, [field]: value });

  const a = (champ: string) => champs.includes(champ as never);
  // Le compte rendu seul ne demande pas d'affaire : consigner un appel sur la
  // fiche entière est légitime. Tout le reste est un jalon d'affaire.
  const affaireRequise = champs.some((champ) => champ !== "compte_rendu" && champ !== "moyen");

  return (
    <section className="border-brand/20 bg-brand/[0.03] flex flex-col gap-3 rounded-xl border p-3">
      <header className="flex items-center gap-2">
        <CheckCircle2Icon className="text-brand-text size-4 shrink-0" />
        <p className="text-xs font-medium">Ce que ça inscrit dans la fiche</p>
      </header>

      {customerId === null ? (
        <p className="text-muted-foreground flex items-start gap-1.5 text-[11px]">
          <InfoIcon className="mt-0.5 size-3 shrink-0" />
          Choisissez d&apos;abord un client : c&apos;est sa fiche qui recueille
          ces informations.
        </p>
      ) : (
        <ProjectPicker
          customerId={customerId}
          value={projectId}
          required={affaireRequise}
          emptyLabel={affaireRequise ? "Aucune — rien ne sera inscrit" : "Toute la fiche"}
          hint={
            affaireRequise
              ? "L'affaire concernée : c'est elle qui porte les dates et les jalons."
              : "Facultatif : range le compte rendu sur une affaire précise."
          }
          onChange={onProject}
        />
      )}

      {projectId !== null && (
        <>
          {a("debut") && (
            <Case
              id="jalon-debut"
              label="C'est le démarrage du chantier"
              hint="Inscrit la date de cet événement comme date de démarrage de l'affaire."
              checked={jalons.is_worksite_start}
              onChange={(value) => set("is_worksite_start", value)}
            />
          )}
          {a("fin") && (
            <Case
              id="jalon-fin"
              label="C'est la fin du chantier"
              hint="Inscrit la date de fin de l'affaire, celle qui donnera sa durée."
              checked={jalons.is_worksite_end}
              onChange={(value) => set("is_worksite_end", value)}
            />
          )}
          {a("pv_envoye") && (
            <DateField
              label="PV de réception envoyé le"
              hint="Laisser vide s'il n'est pas encore parti."
              value={jalons.pv_sent_at}
              onChange={(value) => set("pv_sent_at", value)}
            />
          )}
          {a("pv_signe") && (
            <DateField
              label="PV de réception signé le"
              hint="C'est lui qui clôt le chantier et débloque le solde."
              value={jalons.pv_signed_at}
              onChange={(value) => set("pv_signed_at", value)}
            />
          )}
          {a("rapport_visite") && (
            <DateField
              label="Rapport de visite remis le"
              hint="Le premier livrable d'une étude, remis avant de chiffrer."
              value={jalons.visit_report_sent_at}
              onChange={(value) => set("visit_report_sent_at", value)}
            />
          )}
          {a("rapport_sondage") && (
            <DateField
              label="Rapport de sondage remis le"
              hint="Distinct du rapport de visite : une affaire peut porter les deux."
              value={jalons.survey_report_sent_at}
              onChange={(value) => set("survey_report_sent_at", value)}
            />
          )}
        </>
      )}

      {a("moyen") && (
        <SelectField
          label="Moyen"
          options={MOYEN_OPTIONS}
          value={jalons.means}
          onValueChange={(value) => set("means", value)}
        />
      )}

      {a("compte_rendu") &&
        (passe ? (
          <TextAreaField
            label="Compte rendu"
            placeholder="Ce qui s'est dit, ce qui a été décidé."
            hint="Enregistré dans l'historique de la fiche, à la date de l'événement."
            rows={3}
            value={jalons.summary}
            onChange={(nativeEvent) => set("summary", nativeEvent.target.value)}
          />
        ) : (
          <p className="text-muted-foreground flex items-start gap-1.5 text-[11px]">
            <InfoIcon className="mt-0.5 size-3 shrink-0" />
            Le compte rendu s&apos;écrira quand l&apos;événement aura eu lieu.
            Un rendez-vous à venir est un engagement, pas une trace — et il
            n&apos;a rien à faire dans l&apos;historique de ce qui s&apos;est
            passé.
          </p>
        ))}

      {projectId !== null && (
        <p className="text-muted-foreground/70 text-[11px] leading-relaxed">
          Un champ laissé vide n&apos;efface rien. Pour retirer une date, c&apos;est
          sur la fiche, où l&apos;on voit l&apos;état complet de l&apos;affaire.
        </p>
      )}
    </section>
  );
}

/** Une case à cocher avec son explication : ce qu'elle va écrire, et où. */
function Case({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onChange(value === true)}
        className="mt-0.5"
      />
      <div className="min-w-0">
        <Label htmlFor={id} className="text-xs font-normal">
          {label}
        </Label>
        <p className="text-muted-foreground/70 text-[11px]">{hint}</p>
      </div>
    </div>
  );
}
