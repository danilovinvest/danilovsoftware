/**
 * Ce que fait chaque bouton de « à faire maintenant ».
 *
 * C'était un `switch` de vingt-six branches au milieu du composant d'une
 * affaire. La plupart ne font que l'une de deux choses — dater un jalon, ou
 * ouvrir une boîte — et le disent mieux en table qu'en code : ajouter un geste,
 * c'est ajouter une ligne. Les quelques gestes qui écrivent ailleurs restent
 * dans le composant, qui seul connaît l'affaire et le routeur.
 *
 * Module pur, sans React ni réseau.
 */

import type { ActionKey } from "./cycle";
import type { Jalons } from "./jalons";
import type { InteractionKind } from "./types";

/**
 * Les boîtes qu'une affaire peut ouvrir. Une seule à la fois : c'étaient douze
 * états indépendants, dont rien n'empêchait deux d'être vrais ensemble.
 */
export type BlockDialog =
  | { kind: "relance" }
  | { kind: "outcome"; mode: "refuse" | "postpone" }
  | { kind: "log"; interaction: InteractionKind }
  | { kind: "plan" }
  | { kind: "materials" }
  | { kind: "settlement"; reglement: "acompte" | "solde" }
  | { kind: "complete" }
  | { kind: "issuer" }
  | { kind: "order" }
  | { kind: "delete" };

/**
 * Les gestes qui datent un jalon du jour même.
 *
 * La production du bureau d'études y est : chaque geste date son jalon, et le
 * livrable qu'il produit — la note de calcul, le dossier, le rapport.
 */
export const STAMP_ACTIONS: Partial<Record<ActionKey, keyof Jalons>> = {
  send_rib: "rib_sent_at",
  send_insurance: "insurance_sent_at",
  send_plans: "plans_sent_at",
  ask_review: "review_requested_at",
  record_review: "review_received_at",
  calc_done: "calc_done_at",
  final_ready: "final_ready_at",
  write_report: "report_written_at",
  send_report: "report_sent_at",
  survey_done: "survey_done_at",
  send_survey_report: "survey_report_sent_at",
};

/**
 * Les gestes qui demandent une saisie, et la boîte qui la recueille.
 *
 * - Un rendez-vous se planifie dans l'agenda : c'est là qu'on le voit, qu'il
 *   se déplace et qu'il entre en conflit.
 * - Encaisser demande de dire combien et quand : le client change parfois
 *   l'acompte, et c'est ce montant qu'on vérifie sur le relevé. Le solde
 *   s'encaisse de la même façon.
 * - Commander demande de dire **quoi** : basculer vers l'onglet
 *   « Après-signature », tout en bas de l'affaire, ne faisait rien de visible.
 */
export const DIALOG_ACTIONS: Partial<Record<ActionKey, BlockDialog>> = {
  interaction: { kind: "log", interaction: "appel" },
  plan_rdv: { kind: "plan" },
  relance: { kind: "relance" },
  refuse: { kind: "outcome", mode: "refuse" },
  postpone: { kind: "outcome", mode: "postpone" },
  deposit_paid: { kind: "settlement", reglement: "acompte" },
  balance_paid: { kind: "settlement", reglement: "solde" },
  order_materials: { kind: "materials" },
};
