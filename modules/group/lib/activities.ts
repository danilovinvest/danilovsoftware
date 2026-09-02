import { ENTITY_BY_ID } from "./entities";

/**
 * Les pôles d'activité du groupe.
 *
 * Deuxième dimension, et non un synonyme de la société. L'onglet finances du
 * classeur « CYCLE CHANTIER » aligne six colonnes qui ont chacune leur
 * expert-comptable et leur périodicité de TVA — donc six dossiers. Mais l'une
 * d'elles, « CLIM / EPDM », nomme un métier, pas une raison sociale.
 *
 * Une seule dimension obligerait à choisir, et chaque choix perd quelque
 * chose : par société, on ne sait plus ce que rapporte la clim face au gros
 * œuvre ; par métier, on perd le SIREN, le régime de TVA et la comptabilité,
 * donc la facturation devient fausse.
 *
 * Avec les deux, le rattachement est **réversible** : le jour où CLIM/EPDM
 * livre sa raison sociale, elle devient une entité et l'on déplace une ligne
 * ici — aucun devis, aucun chantier ne bouge.
 */

export type ActivityKind = "ingenierie" | "travaux" | "immobilier";

export type Activity = {
  id: string;
  name: string;
  /** Société qui facture cette activité. */
  entity_id: string;
  kind: ActivityKind;
  /** Comment s'appelle une affaire de ce métier. */
  noun: string;
  description: string;
  /** Renseigné quand le rattachement est une hypothèse à confirmer. */
  caveat?: string;
};

export const ACTIVITIES: Activity[] = [
  {
    id: "etudes",
    name: "Études de structure",
    entity_id: "ompt-structure",
    kind: "ingenierie",
    noun: "étude",
    description: "Béton armé, charpente, ossature, sondages et diagnostics",
  },
  {
    id: "gros-oeuvre",
    name: "Gros œuvre & structure",
    entity_id: "ompt-groupe",
    kind: "travaux",
    noun: "chantier",
    description: "Ouvertures, reprises en sous-œuvre, renforcements, planchers",
  },
  {
    id: "clim-epdm",
    name: "Climatisation & étanchéité EPDM",
    entity_id: "ompt-groupe",
    kind: "travaux",
    noun: "chantier",
    description: "Climatisation, ventilation, étanchéité de toiture-terrasse",
    caveat:
      "L'onglet finances lui donne son propre expert-comptable et une TVA " +
      "trimestrielle, là où OMPT GROUPE la déclare au mois : elle a donc son " +
      "dossier comptable. Rattachée ici en attendant sa raison sociale.",
  },
  {
    id: "travaux-nice",
    name: "Travaux — antenne de Nice",
    entity_id: "ompt-nice",
    kind: "travaux",
    noun: "chantier",
    description: "Gros œuvre et travaux spécialisés sur le secteur niçois",
  },
  {
    id: "transaction",
    name: "Transaction immobilière",
    entity_id: "avenue-de-grasse",
    kind: "immobilier",
    noun: "mandat",
    description: "Vente et commercialisation",
  },
  {
    id: "location",
    name: "Location des locaux",
    entity_id: "danilov-fonciere",
    kind: "immobilier",
    noun: "bail",
    description: "Détention et location des locaux du groupe",
  },
];

export const ACTIVITY_BY_ID = new Map(ACTIVITIES.map((a) => [a.id, a]));

export function activityName(id: string): string {
  return ACTIVITY_BY_ID.get(id)?.name ?? id;
}

/** Société qui facture une activité. */
export function entityOfActivity(id: string) {
  const activity = ACTIVITY_BY_ID.get(id);
  return activity ? ENTITY_BY_ID.get(activity.entity_id) : undefined;
}

export function activitiesOfEntity(entityId: string): Activity[] {
  return ACTIVITIES.filter((activity) => activity.entity_id === entityId);
}
