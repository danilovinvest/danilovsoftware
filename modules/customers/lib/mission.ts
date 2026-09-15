import type { Tone } from "./labels";
import type { ProjectMission } from "./types";

/**
 * La mission d'une affaire du bureau d'études, et ce qui en découle.
 *
 * Le cahier des charges décrit trois missions qui ne se déroulent pas pareil :
 * une **étude structurelle** calcule, dessine, valide et envoie un dossier ;
 * un **rapport ou une attestation** se paie en une fois, se rédige, se contrôle
 * et part ; un **sondage** se fait sur site puis se rend en rapport. Le type de
 * devis était proche mais ne commandait rien — une affaire porte plusieurs
 * devis, et c'est l'affaire qui a un parcours.
 *
 * Le module est **pur** : ni React, ni réseau, et l'instant lui est passé.
 */

/**
 * La mission, choisie ou déduite des devis.
 *
 * La colonne reste nulle tant que personne ne tranche : la déduction suffit
 * neuf fois sur dix, et l'enregistrer figerait une supposition qu'un devis
 * ajouté demain rendrait fausse. Une valeur posée l'emporte toujours — les
 * exceptions appartiennent à l'entreprise, pas au code.
 *
 * L'étude l'emporte sur l'attestation, et l'attestation sur le sondage : un
 * sondage accompagne souvent une étude, et c'est alors l'étude qu'on livre.
 * Sans devis, on suppose une étude, la mission la plus complète des trois.
 */
export function missionOf(
  project: { mission?: ProjectMission | null },
  quotes: ReadonlyArray<{ kind: string }>,
): ProjectMission {
  if (project.mission) return project.mission;
  const kinds = new Set(quotes.map((quote) => quote.kind));
  if (kinds.has("etude") || kinds.has("maitrise_oeuvre")) return "etude_structurelle";
  if (kinds.has("attestation")) return "rapport_attestation";
  if (kinds.has("sondages")) return "sondage";
  return "etude_structurelle";
}

/**
 * Le numéro de dossier tel qu'on le dit au téléphone : `STR-2026-0148`.
 *
 * Seuls l'année et le rang sont en base. Le préfixe se lit du métier, parce
 * qu'une affaire peut changer de société avec ses devis alors qu'un numéro
 * écrit sur un plan ne doit jamais changer — la recherche accepte les deux
 * préfixes, et le numéro nu.
 */
export function projectReference(
  reference: string | null | undefined,
  metier: "etudes" | "travaux",
): string {
  if (!reference) return "";
  return `${metier === "etudes" ? "STR" : "GRP"}-${reference}`;
}

/** La date où la mission a été rendue au client, ou rien. */
export function deliveredAt(
  jalons: {
    plans_sent_at: string | null;
    report_sent_at: string | null;
    survey_report_sent_at: string | null;
  },
  mission: ProjectMission,
): string | null {
  switch (mission) {
    case "etude_structurelle":
      return jalons.plans_sent_at;
    case "rapport_attestation":
      return jalons.report_sent_at;
    case "sondage":
      return jalons.survey_report_sent_at;
  }
}

export type Deadline = {
  /** « Deadline interne dans 4 j », « Promis au client il y a 2 j ». */
  label: string;
  tone: Tone;
  /** Une date est dépassée : le dossier est en retard. */
  late: boolean;
};

const DAY = 86_400_000;

/** Jours jusqu'à la fin d'une journée `YYYY-MM-DD`, négatif si elle est passée. */
function daysLeft(now: number, day: string): number {
  const end = new Date(`${day.slice(0, 10)}T23:59:59`).getTime();
  return Math.floor((end - now) / DAY);
}

/**
 * Ce que disent les deux dates d'une affaire, tant qu'elle n'est pas livrée.
 *
 * **La date promise au client passe devant** dès qu'elle est dépassée : c'est
 * elle qui engage l'entreprise. Sinon, c'est la deadline interne qui parle,
 * puisqu'elle précède la promesse et que l'écart entre les deux est la marge
 * qu'on s'est donnée. Une affaire livrée ne dit plus rien : un retard rattrapé
 * n'est plus une alerte.
 */
export function deadlineOf(
  project: { promised_at?: string | null; internal_deadline_at?: string | null },
  delivered: boolean,
  now: number,
): Deadline | null {
  if (delivered) return null;
  const promised = project.promised_at ?? null;
  const internal = project.internal_deadline_at ?? null;

  if (promised && daysLeft(now, promised) < 0) {
    const late = -daysLeft(now, promised);
    return { label: `Promis au client il y a ${late} j`, tone: "danger", late: true };
  }
  const day = internal ?? promised;
  if (!day) return null;

  const who = internal ? "Deadline interne" : "Promis au client";
  const left = daysLeft(now, day);
  if (left < 0) return { label: `${who} dépassée de ${-left} j`, tone: "danger", late: true };
  if (left === 0) return { label: `${who} aujourd'hui`, tone: "warning", late: false };
  return {
    label: `${who} dans ${left} j`,
    tone: left <= 3 ? "warning" : "neutral",
    late: false,
  };
}
