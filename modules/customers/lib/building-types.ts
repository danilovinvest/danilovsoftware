/**
 * Les types de l'espace copropriété (migration 110), miroirs de l'API.
 */

export type UnitKind = "logement" | "commerce" | "bureau" | "parties_communes" | "autre";
export type OccupantRole = "proprietaire" | "locataire" | "exploitant" | "autre";
/** `concerne` : on y intervient. `impacte` : un voisin touché. `signataire` : il signe le PV. */
export type UnitProjectRole = "concerne" | "impacte" | "signataire";
export type BuildingDocumentKind =
  | "arrete_peril"
  | "mise_en_securite"
  | "rapport_bet"
  | "controle"
  | "diagnostic"
  | "autre";

export type UnitProject = {
  project_id: string;
  role: UnitProjectRole;
  label: string;
  reference: string;
};

/** Un lot de l'immeuble et son occupant. */
export type BuildingUnit = {
  id: string;
  label: string;
  kind: UnitKind;
  floor: string;
  occupant_name: string;
  occupant_role: OccupantRole | "";
  occupant_phone: string;
  occupant_email: string;
  occupant_customer_id: string | null;
  occupant_customer_name: string;
  note: string;
  /** Les affaires du lot, dans le périmètre du compte. */
  projects: UnitProject[];
};

export type UnitPayload = Omit<BuildingUnit, "id" | "occupant_customer_name" | "projects"> & {
  /** La liste entière des affaires du lot. */
  projects: Array<{ project_id: string; role: UnitProjectRole }>;
};

/** Une pièce du dossier réglementaire. */
export type BuildingDocument = {
  id: string;
  kind: BuildingDocumentKind;
  title: string;
  issued_at: string | null;
  /** Le jour où un arrêté a été levé. */
  lifted_at: string | null;
  authority: string;
  reference: string;
  document_url: string;
  project_id: string | null;
  project_label: string;
  note: string;
};

export type BuildingDocumentPayload = Omit<BuildingDocument, "id" | "project_label">;

/** Ce que l'onglet « Immeuble » montre. */
export type Building = {
  units: BuildingUnit[];
  documents: BuildingDocument[];
  /** Les affaires de la fiche hors du périmètre du compte : un nombre, rien d'autre. */
  hidden_projects: number;
};
