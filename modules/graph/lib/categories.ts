import type { Hue } from "@/modules/shell";
import type { GraphNode } from "./types";

/**
 * Les catégories de la toile : ce que la couleur d'un nœud dit de lui.
 *
 * Elles sont **exclusives** — un nœud n'a qu'une couleur — et l'ordre est la
 * règle, première correspondance gagnante : un apporteur d'affaires l'est
 * d'abord, quel que soit son type, parce que c'est ce qu'on vient chercher sur
 * un graphe de relations ; un syndic — ou son gestionnaire — est un syndic
 * avant d'être un prescripteur ; une copropriété avant un client final ; un
 * organisme (contrôleur, mairie, huissier) n'est jamais un client. Le reste suit la
 * relation **effective**, celle que le serveur déduit du type quand personne ne
 * l'a choisie (`relation_effective`), et un client final se coupe en deux —
 * client ou prospect — parce que c'est la moitié de la base.
 *
 * Les teintes sont celles des modules (`--h-<teinte>-9`), jamais une valeur
 * littérale : la toile les relit à l'exécution (`theme-colors.ts`).
 */
export type FicheCategory =
  | "apporteur"
  | "syndic"
  | "copropriete"
  | "prescripteur"
  | "fournisseur"
  | "sous_traitant"
  | "organisme"
  | "client"
  | "prospect";

/** Un interlocuteur commun à plusieurs fiches, dessiné en étoile. */
export type GraphCategory = FicheCategory | "interlocuteur";

export const CATEGORY_ORDER: GraphCategory[] = [
  "apporteur",
  "syndic",
  "copropriete",
  "prescripteur",
  "fournisseur",
  "sous_traitant",
  "organisme",
  "client",
  "prospect",
  "interlocuteur",
];

export const CATEGORY_META: Record<GraphCategory, { label: string; hue: Hue; hint: string }> = {
  apporteur: {
    label: "Apporteurs d'affaires",
    hue: "orange",
    hint: "A apporté une affaire ou recommandé une fiche — prime sur le type.",
  },
  syndic: {
    label: "Syndics et gestionnaires",
    hue: "violet",
    hint: "Gèrent des copropriétés, eux ou leurs gestionnaires d'immeubles.",
  },
  copropriete: { label: "Copropriétés", hue: "jade", hint: "Un immeuble, souvent géré par un syndic." },
  prescripteur: {
    label: "Prescripteurs",
    hue: "cyan",
    hint: "Architectes, ingénieurs, maîtres d'œuvre, agences immobilières, partenaires techniques.",
  },
  fournisseur: { label: "Fournisseurs", hue: "amber", hint: "Ils nous livrent." },
  sous_traitant: { label: "Sous-traitants", hue: "pink", hint: "Ils exécutent pour nous." },
  organisme: {
    label: "Organismes",
    hue: "crimson",
    hint: "Contrôle, administration, justice : ils interviennent sans nous payer.",
  },
  client: { label: "Clients", hue: "indigo", hint: "Client final, une pièce le prouve." },
  prospect: { label: "Prospects et autres", hue: "slate", hint: "Client final sans pièce qui le prouve." },
  interlocuteur: {
    label: "Interlocuteurs communs",
    hue: "grass",
    hint: "Une personne présente sur plusieurs fiches, au même numéro ou à la même adresse.",
  },
};

/** La catégorie d'une fiche. Voir l'ordre ci-dessus. */
export function categoryOfNode(
  node: Pick<GraphNode, "is_referrer" | "kind" | "relation_effective" | "is_client">,
): FicheCategory {
  if (node.is_referrer) return "apporteur";
  if (node.kind === "syndic" || node.kind === "gestionnaire") return "syndic";
  if (node.kind === "copropriete") return "copropriete";
  switch (node.relation_effective) {
    case "prescripteur":
    case "partenaire_technique":
      return "prescripteur";
    case "fournisseur":
      return "fournisseur";
    case "sous_traitant":
      return "sous_traitant";
    case "intervenant":
      return "organisme";
    default:
      return node.is_client ? "client" : "prospect";
  }
}
