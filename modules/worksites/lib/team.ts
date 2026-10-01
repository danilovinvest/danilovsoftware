import { actorOf, stepLabel, type ProductionRole } from "./production";
import type { ReadWorksite } from "./types";

/**
 * Qui attend quoi au bureau d'études — la vue Équipe.
 *
 * Le cahier des charges demande une liste par ingénieur, une par dessinateur
 * et la charge de chacun. Les trois intervenants sont sur l'affaire depuis la
 * migration 47, et le cran de production dit qui doit agir (`actorOf`) : une
 * étude au calcul attend son ingénieur, aux plans son dessinateur, prête à
 * partir son responsable. Elle ne figure donc qu'**une fois**, chez la
 * personne dont dépend le pas suivant — la mettre aussi chez les deux autres
 * gonflerait trois charges pour un seul dossier.
 *
 * Une étude dont le rôle attendu n'est pas posé n'est à personne : elle va dans
 * « Sans intervenant », avec le rôle qui manque. C'est la liste à vider en
 * premier — une tâche automatique y tombe sur le responsable de la fiche,
 * à défaut sur personne.
 *
 * Module **pur**.
 */

export const ROLE_LABEL: Record<ProductionRole, string> = {
  engineer: "ingénieur",
  drafter: "dessinateur",
  manager: "responsable",
};

export interface TeamItem {
  read: ReadWorksite;
  role: ProductionRole;
  /** Ce que la personne doit faire, dans les mots de la mission. */
  todo: string;
}

export interface TeamMember {
  /** Nul pour la colonne « Sans intervenant ». */
  id: string | null;
  name: string;
  items: TeamItem[];
  /** Combien de ses dossiers ont dépassé un délai. */
  late: number;
}

function personOf(read: ReadWorksite, role: ProductionRole): string | null {
  const w = read.worksite;
  switch (role) {
    case "engineer":
      return w.engineer_id;
    case "drafter":
      return w.drafter_id;
    case "manager":
      return w.manager_id;
  }
}

/**
 * La charge de chacun, triée de la plus lourde à la plus légère, la colonne
 * « Sans intervenant » en tête quand elle n'est pas vide. Une personne inconnue
 * de l'annuaire (compte désactivé) garde son dossier, sous « Compte inconnu ».
 */
export function teamLoad(
  reads: ReadWorksite[],
  names: ReadonlyMap<string, string>,
): TeamMember[] {
  const byPerson = new Map<string, TeamMember>();
  const orphans: TeamMember = { id: null, name: "Sans intervenant", items: [], late: 0 };

  for (const read of reads) {
    if (read.production === null || read.worksite.outcome !== "") continue;
    const role = actorOf(read.production, read.mission);
    const item: TeamItem = { read, role, todo: stepLabel(read.production, read.mission) };
    const late = read.deadline?.late ? 1 : 0;
    const person = personOf(read, role);
    if (person === null) {
      orphans.items.push(item);
      orphans.late += late;
      continue;
    }
    const member = byPerson.get(person) ?? {
      id: person,
      name: names.get(person) ?? "Compte inconnu",
      items: [],
      late: 0,
    };
    member.items.push(item);
    member.late += late;
    byPerson.set(person, member);
  }

  const urgentFirst = (a: TeamItem, b: TeamItem) =>
    Number(b.read.deadline?.late ?? false) - Number(a.read.deadline?.late ?? false) ||
    a.read.worksite.customer_name.localeCompare(b.read.worksite.customer_name, "fr");
  const members = [...byPerson.values()]
    .map((m) => ({ ...m, items: [...m.items].sort(urgentFirst) }))
    .sort((a, b) => b.items.length - a.items.length || a.name.localeCompare(b.name, "fr"));
  if (orphans.items.length > 0) {
    members.unshift({ ...orphans, items: [...orphans.items].sort(urgentFirst) });
  }
  return members;
}
