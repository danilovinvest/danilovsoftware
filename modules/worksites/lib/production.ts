import type { ProjectMission } from "@/modules/customers";

/**
 * Où en est la production d'une étude, et qui doit agir.
 *
 * L'écran Études suivait l'argent — acompte attendu, en production, rendue,
 * soldée — et « en production » était un seul tas : on ne voyait pas qu'une
 * étude attendait son calcul, une autre ses plans, une troisième son contrôle.
 * Les dix jalons de production existent depuis la migration 50 ; ce module en
 * tire le cran courant, **selon la mission**, parce qu'une attestation se
 * rédige et se valide là où une étude se calcule, se dessine et se contrôle.
 *
 * Quatre crans, communs aux trois missions, qui sont des **passages de main** —
 * ce que la frise de la fiche montre aussi :
 *
 * | cran        | étude structurelle        | rapport / attestation | sondage              |
 * |-------------|---------------------------|-----------------------|----------------------|
 * | `calcul`    | calcul pas terminé        | rapport pas rédigé    | sondage pas réalisé  |
 * | `plans`     | plans pas rendus au contrôle | —                  | rapport de sondage à envoyer |
 * | `controle`  | plans au contrôle         | rapport à valider     | —                    |
 * | `a_envoyer` | dossier définitif prêt    | rapport validé        | —                    |
 *
 * Une étape plus avancée prouve celles d'avant : un dossier prêt a été calculé
 * et contrôlé, même si personne n'a coché ces cases. Le cran se lit donc de la
 * fin vers le début.
 *
 * Module **pur**, comme `derive.ts`.
 */

export type ProductionStep = "calcul" | "plans" | "controle" | "a_envoyer";

export const PRODUCTION_ORDER: ProductionStep[] = ["calcul", "plans", "controle", "a_envoyer"];

/** Les jalons qu'un cran lit. Tous nuls tant que rien n'est fait. */
export interface ProductionMilestones {
  calc_done_at: string | null;
  plans_review_at: string | null;
  corrections_at: string | null;
  final_ready_at: string | null;
  plans_sent_at: string | null;
  report_written_at: string | null;
  report_validated_at: string | null;
  report_sent_at: string | null;
  survey_done_at: string | null;
  survey_report_sent_at: string | null;
}

/**
 * Le cran d'une étude en production. Nul quand la mission est rendue : elle
 * n'est plus en production.
 */
export function productionOf(
  jalons: ProductionMilestones,
  mission: ProjectMission,
): ProductionStep | null {
  switch (mission) {
    case "etude_structurelle":
      if (jalons.plans_sent_at) return null;
      if (jalons.final_ready_at) return "a_envoyer";
      if (jalons.plans_review_at || jalons.corrections_at) return "controle";
      if (jalons.calc_done_at) return "plans";
      return "calcul";
    case "rapport_attestation":
      if (jalons.report_sent_at) return null;
      if (jalons.report_validated_at) return "a_envoyer";
      if (jalons.report_written_at) return "controle";
      return "calcul";
    case "sondage":
      if (jalons.survey_report_sent_at) return null;
      if (jalons.survey_done_at) return "plans";
      return "calcul";
  }
}

/** Le rôle qui agit à un cran. */
export type ProductionRole = "engineer" | "drafter" | "manager";

/**
 * Qui agit à un cran : l'ingénieur calcule, rédige, sonde et contrôle ; le
 * dessinateur dessine les plans ; le responsable de l'affaire envoie. Le
 * rapport de sondage est rédigé par l'ingénieur, pas dessiné.
 */
export function actorOf(step: ProductionStep, mission: ProjectMission): ProductionRole {
  switch (step) {
    case "calcul":
    case "controle":
      return "engineer";
    case "plans":
      return mission === "etude_structurelle" ? "drafter" : "engineer";
    case "a_envoyer":
      return "manager";
  }
}

/** Ce que fait le cran, dans les mots de la mission. */
export function stepLabel(step: ProductionStep, mission: ProjectMission): string {
  switch (mission) {
    case "etude_structurelle":
      return {
        calcul: "Calcul",
        plans: "Plans à dessiner",
        controle: "Plans au contrôle",
        a_envoyer: "Dossier prêt à envoyer",
      }[step];
    case "rapport_attestation":
      return {
        calcul: "Rapport à rédiger",
        plans: "Rapport à rédiger",
        controle: "Rapport à valider",
        a_envoyer: "Rapport prêt à envoyer",
      }[step];
    case "sondage":
      return {
        calcul: "Sondage à réaliser",
        plans: "Rapport de sondage à envoyer",
        controle: "Rapport de sondage à envoyer",
        a_envoyer: "Rapport de sondage à envoyer",
      }[step];
  }
}
