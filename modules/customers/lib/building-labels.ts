import type {
  BuildingDocument,
  BuildingDocumentKind,
  OccupantRole,
  UnitKind,
  UnitProjectRole,
} from "./building-types";

/**
 * Les libellés de l'espace copropriété (migration 110), et ce que l'écran en
 * déduit. Pur : ni React ni réseau.
 */

export const UNIT_KIND: Record<UnitKind, string> = {
  logement: "Logement",
  commerce: "Commerce",
  bureau: "Bureau",
  parties_communes: "Parties communes",
  autre: "Autre",
};

export const OCCUPANT_ROLE: Record<OccupantRole, string> = {
  proprietaire: "Propriétaire",
  locataire: "Locataire",
  exploitant: "Exploitant",
  autre: "Autre",
};

export const UNIT_PROJECT_ROLE: Record<UnitProjectRole, { label: string; hint: string }> = {
  concerne: { label: "Concerné", hint: "On intervient dans ce lot" },
  impacte: { label: "Impacté", hint: "Un voisin que les travaux touchent" },
  signataire: { label: "Signataire du PV", hint: "Son occupant signe la réception, sans être le payeur" },
};

export const DOCUMENT_KIND: Record<BuildingDocumentKind, string> = {
  arrete_peril: "Arrêté de péril",
  mise_en_securite: "Arrêté de mise en sécurité",
  rapport_bet: "Rapport de bureau d'études",
  controle: "Contrôle technique",
  diagnostic: "Diagnostic",
  autre: "Autre pièce",
};

const ORDERS: BuildingDocumentKind[] = ["arrete_peril", "mise_en_securite"];

/** Un arrêté qui frappe encore l'immeuble : pris, et pas levé. */
export function orderInForce(document: Pick<BuildingDocument, "kind" | "lifted_at">): boolean {
  return ORDERS.includes(document.kind) && document.lifted_at === null;
}

/** Seul un arrêté se lève : un rapport n'a pas de fin. */
export function canBeLifted(kind: BuildingDocumentKind): boolean {
  return ORDERS.includes(kind);
}

export type Intervention = {
  id: string;
  /** L'année où l'on est intervenu : le démarrage, à défaut la création. */
  year: number | null;
  at: string | null;
};

/**
 * Les interventions d'un immeuble, de la plus récente à la plus ancienne.
 *
 * Le jour retenu est celui du chantier quand il est connu, sinon celui où
 * l'affaire est née : une affaire reprise d'un dossier OneDrive n'a souvent
 * pas de date de démarrage, et la laisser sans année la ferait flotter en tête.
 */
export function interventions<P extends { id: string; started_at: string | null; created_at: string }>(
  projects: P[],
): Array<P & { at: string | null; year: number | null }> {
  return projects
    .map((project) => {
      const at = project.started_at ?? project.created_at ?? null;
      const year = at ? new Date(at).getFullYear() : null;
      return { ...project, at, year: year !== null && Number.isNaN(year) ? null : year };
    })
    .sort((a, b) => (b.at ?? "").localeCompare(a.at ?? ""));
}
