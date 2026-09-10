"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DateField } from "@/shared/ui/date-time-field";
import { SelectField, TextAreaField } from "@/shared/ui/form";
import { EVENT_KIND_JALONS, MOYEN_OPTIONS } from "../lib/labels";
import type { EventJalons, EventKind } from "../lib/types";

/**
 * Les champs propres à la catégorie, ceux qui remontent dans la fiche.
 *
 * Un chantier a un démarrage, une fin et un procès-verbal ; un rendez-vous a un
 * rapport de visite ; un échange a un compte rendu. Les saisir ici épargne
 * l'aller-retour vers la fiche, où il fallait redire la même date.
 *
 * **Un groupe de champs, pas une section.** La première version en faisait une
 * carte teintée, avec une icône et un titre, posée avant les dates : beaucoup
 * de décor pour quatre champs facultatifs, et la date de l'événement s'en
 * trouvait repoussée hors de l'écran. Un filet et un intitulé discret suffisent
 * à dire « ces champs-là ne décrivent pas l'événement, ils écrivent ailleurs ».
 *
 * Il ne s'affiche que s'il a quelque chose à proposer : cinq catégories sur neuf
 * ne portent aucun jalon — un prélèvement ne concerne aucune affaire, un congé
 * aucun client — et les jalons d'affaire attendent qu'une affaire soit choisie.
 */
export function EventJalonsField({
  kind,
  projectId,
  jalons,
  passe,
  onJalons,
}: {
  kind: EventKind;
  projectId: string | null;
  jalons: EventJalons;
  /** L'événement a-t-il déjà eu lieu ? Décide du compte rendu. */
  passe: boolean;
  onJalons: (next: EventJalons) => void;
}) {
  const champs = EVENT_KIND_JALONS[kind];
  const set = <K extends keyof EventJalons>(field: K, value: EventJalons[K]) =>
    onJalons({ ...jalons, [field]: value });

  const a = (champ: string) => champs.includes(champ as never);
  const surAffaire = projectId !== null;

  /*
    Les champs réellement rendus, et non ceux que la catégorie *pourrait*
    rendre.

    La nuance n'est pas théorique : un rendez-vous à venir sans affaire ne rend
    aucun champ — ses jalons attendent une affaire, son compte rendu attend que
    la visite ait eu lieu — et l'intitulé s'affichait quand même, au-dessus de
    rien. Un titre suivi du vide se lit comme un écran inachevé.

    Les jalons appartiennent à une affaire ; le moyen appartient à la fiche et se
    choisit sans en désigner une ; le compte rendu attend le passé, parce que
    planifier et consigner restent deux gestes.
  */
  const rendus = champs.filter((champ) => {
    if (champ === "moyen") return true;
    if (champ === "compte_rendu") return passe;
    return surAffaire;
  });
  if (rendus.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 border-t pt-3">
      <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        Ce que ça inscrit dans la fiche
      </p>

      {a("debut") && surAffaire && (
        <Case
          id="jalon-debut"
          label="C'est le démarrage du chantier"
          hint="La date de cet événement devient la date de démarrage de l'affaire."
          checked={jalons.is_worksite_start}
          onChange={(value) => set("is_worksite_start", value)}
        />
      )}
      {a("fin") && surAffaire && (
        <Case
          id="jalon-fin"
          label="C'est la fin du chantier"
          hint="Elle donnera sa durée au chantier."
          checked={jalons.is_worksite_end}
          onChange={(value) => set("is_worksite_end", value)}
        />
      )}
      {a("pv_envoye") && surAffaire && (
        <DateField
          label="PV de réception envoyé le"
          value={jalons.pv_sent_at}
          onChange={(value) => set("pv_sent_at", value)}
        />
      )}
      {a("pv_signe") && surAffaire && (
        <DateField
          label="PV de réception signé le"
          hint="Il clôt le chantier et débloque le solde."
          value={jalons.pv_signed_at}
          onChange={(value) => set("pv_signed_at", value)}
        />
      )}
      {a("rapport_visite") && surAffaire && (
        <DateField
          label="Rapport de visite remis le"
          hint="Le premier livrable d'une étude, remis avant de chiffrer."
          value={jalons.visit_report_sent_at}
          onChange={(value) => set("visit_report_sent_at", value)}
        />
      )}
      {a("rapport_sondage") && surAffaire && (
        <DateField
          label="Rapport de sondage remis le"
          value={jalons.survey_report_sent_at}
          onChange={(value) => set("survey_report_sent_at", value)}
        />
      )}

      {a("moyen") && (
        <SelectField
          label="Moyen"
          options={MOYEN_OPTIONS}
          value={jalons.means}
          onValueChange={(value) => set("means", value)}
        />
      )}

      {a("compte_rendu") && passe && (
        <TextAreaField
          label="Compte rendu"
          placeholder="Ce qui s'est dit, ce qui a été décidé."
          hint="Enregistré dans l'historique de la fiche, à la date de l'événement."
          rows={3}
          value={jalons.summary}
          onChange={(nativeEvent) => set("summary", nativeEvent.target.value)}
        />
      )}

      {surAffaire && (
        <p className="text-muted-foreground/60 text-[11px]">
          Un champ laissé vide n&apos;efface rien. Les dates se retirent sur la
          fiche.
        </p>
      )}
    </section>
  );
}

/** Une case à cocher qui dit ce qu'elle va écrire, et où. */
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
