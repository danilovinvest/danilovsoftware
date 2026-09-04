import { PLANNING_GRACE_DAYS } from "@/modules/customers";

/**
 * Ce qui se passe entre la signature et le premier coup de pelle.
 *
 * L'export de devis dont vit ce tableau de bord s'arrête à « gagné » : il ne
 * dit rien de l'acompte, du RIB, de l'assurance, de la date de chantier ni de
 * la commande de matériaux. Ces quatre-là n'ont pas encore de colonne en base —
 * mais ce sont exactement les quatre endroits où l'argent se bloque, et un
 * tableau de bord qui les ignore ne montre que la moitié du problème.
 *
 * L'état de chaque affaire signée est donc **dérivé**, pas tiré au sort : une
 * empreinte stable de sa référence décide où elle en est. Deux lectures du même
 * écran donnent le même résultat, et un rechargement ne redistribue pas les
 * alertes — ce qu'un `Math.random()` ferait, en rendant l'écran inutilisable.
 *
 * Le jour où l'API servira ces jalons, ce fichier disparaît.
 */

/** Les quatre attentes, dans l'ordre où on les traverse. */
export type AfterStage =
  | "acompte_a_facturer"
  | "acompte_attendu"
  | "sans_date"
  | "materiaux"
  | "pret";

export type AfterSignature = {
  stage: AfterStage;
  /** Jours passés dans cet état. */
  days: number;
  /** Vrai quand l'attente a dépassé le raisonnable. */
  alert: boolean;
};

/**
 * Une empreinte entière stable, tirée d'une chaîne.
 *
 * L'algorithme est celui de Dan Bernstein (djb2), choisi pour sa brièveté :
 * cinq lignes, aucune dépendance, et une répartition assez régulière pour que
 * les cinq états soient tous représentés sur quatre-vingts affaires signées.
 */
function fingerprint(key: string): number {
  let hash = 5381;
  for (let index = 0; index < key.length; index += 1) {
    hash = ((hash << 5) + hash + key.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Où en est une affaire signée, et depuis combien de temps.
 *
 * `days` est l'âge du devis : plus une signature est ancienne, plus une attente
 * qui dure dessus est anormale. C'est ce qui fait que les alertes se
 * concentrent sur les vieux dossiers, comme dans la réalité.
 */
export function afterSignature(reference: string, days: number): AfterSignature {
  const seed = fingerprint(reference);

  // Cinq états, pondérés pour ressembler à une entreprise qui tourne : la
  // plupart des chantiers démarrent, une minorité coince.
  const bucket = seed % 100;
  const stage: AfterStage =
    bucket < 12
      ? "acompte_a_facturer"
      : bucket < 28
        ? "acompte_attendu"
        : bucket < 44
          ? "sans_date"
          : bucket < 58
            ? "materiaux"
            : "pret";

  // L'attente ne peut pas être plus vieille que la signature elle-même.
  const waited = Math.max(1, Math.min(days, 3 + (seed % 70)));

  const alert =
    (stage === "acompte_a_facturer" && waited > 7) ||
    (stage === "acompte_attendu" && waited > 21) ||
    (stage === "sans_date" && waited > PLANNING_GRACE_DAYS) ||
    (stage === "materiaux" && waited > 30);

  return { stage, days: waited, alert };
}

export const AFTER_LABEL: Record<AfterStage, string> = {
  acompte_a_facturer: "Facture d'acompte à émettre",
  acompte_attendu: "Acompte en attente",
  sans_date: "Aucune date de chantier",
  materiaux: "Matériaux à commander",
  pret: "Prêt à démarrer",
};
