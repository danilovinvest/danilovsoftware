/**
 * Les sociétés du groupe.
 *
 * Ces fiches ne sont **pas** inventées : elles viennent du registre national
 * des entreprises, via l'API publique `recherche-entreprises.api.gouv.fr`
 * (données ouvertes INSEE / INPI), consultée le 1er septembre 2026. Raison
 * sociale, SIREN, SIRET du siège, forme juridique, code NAF, adresse et date
 * d'immatriculation sont donc exacts et vérifiables — le lien `source` de
 * chaque fiche mène à l'annuaire officiel.
 *
 * Le numéro de TVA intracommunautaire n'est pas servi par cette API pour
 * toutes les sociétés : il est reconstitué par la clé française
 * `(12 + 3 × (SIREN mod 97)) mod 97`, vérifiée contre celui qu'elle donne
 * pour OMPT STRUCTURE (FR78 932 871 429).
 *
 * En revanche, **la répartition du capital et les flux entre sociétés ne sont
 * pas publics**. `ownership` et tout ce que le module facture entre entités
 * relèvent d'une hypothèse de démonstration, signalée comme telle à l'écran.
 * Ne pas les prendre pour la réalité du montage.
 */

export type EntityRole = "holding" | "exploitation" | "immobilier";

export type Entity = {
  id: string;
  name: string;
  /** Enseigne commerciale, quand elle diffère de la raison sociale. */
  trade_name: string;
  siren: string;
  siret: string;
  vat: string;
  legal_form: string;
  naf: string;
  naf_label: string;
  address: string;
  /** Date d'immatriculation. */
  created_at: string;
  role: EntityRole;
  /** Ce que la société fait, en une ligne. */
  activity: string;
  /** Capital social, quand il est publié. */
  capital: number | null;
  /** Société mère présumée — hypothèse, la détention n'est pas publique. */
  parent_id: string | null;
  /** Quote-part présumée, en pourcentage. Hypothèse également. */
  ownership: number | null;
  source: string;
};

export const ENTITIES: Entity[] = [
  {
    id: "danilov-invest",
    name: "DANILOV INVEST",
    trade_name: "",
    siren: "844880039",
    siret: "84488003900020",
    vat: "FR59844880039",
    legal_form: "SARL",
    naf: "71.12B",
    naf_label: "Ingénierie, études techniques",
    address: "25 avenue de Grasse, 06400 Cannes",
    created_at: "2018-12-21",
    role: "holding",
    activity: "Holding animatrice — participations et direction du groupe",
    capital: 50000,
    parent_id: null,
    ownership: null,
    source: "https://annuaire-entreprises.data.gouv.fr/entreprise/844880039",
  },
  {
    id: "ompt-structure",
    name: "OMPT STRUCTURE",
    trade_name: "",
    siren: "932871429",
    siret: "93287142900019",
    vat: "FR78932871429",
    legal_form: "SAS",
    naf: "71.12B",
    naf_label: "Ingénierie, études techniques",
    address: "25 avenue de Grasse, 06400 Cannes",
    created_at: "2024-09-11",
    role: "exploitation",
    activity: "Bureau d'études structure — béton armé, charpente, ossature",
    capital: null,
    parent_id: "danilov-invest",
    ownership: 100,
    source: "https://annuaire-entreprises.data.gouv.fr/entreprise/932871429",
  },
  {
    id: "ompt-groupe",
    name: "OMPT GROUPE",
    trade_name: "OMPT · CLIM POUR VOUS",
    siren: "951507730",
    siret: "95150773000012",
    vat: "FR24951507730",
    legal_form: "SARL",
    naf: "43.99C",
    naf_label: "Travaux de maçonnerie générale et gros œuvre",
    address: "25 avenue de Grasse, 06400 Cannes",
    created_at: "2023-04-12",
    role: "exploitation",
    activity: "Travaux — gros œuvre, reprises en sous-œuvre, climatisation",
    capital: null,
    parent_id: "danilov-invest",
    ownership: 100,
    source: "https://annuaire-entreprises.data.gouv.fr/entreprise/951507730",
  },
  {
    id: "avenue-de-grasse",
    name: "AVENUE DE GRASSE",
    trade_name: "",
    siren: "941045460",
    siret: "94104546000016",
    vat: "FR86941045460",
    legal_form: "SAS",
    naf: "68.10Z",
    naf_label: "Activités des agences immobilières",
    address: "25 avenue de Grasse, 06400 Cannes",
    created_at: "2025-02-18",
    role: "immobilier",
    activity: "Agence immobilière — transaction et commercialisation",
    capital: null,
    parent_id: "danilov-invest",
    ownership: 100,
    source: "https://annuaire-entreprises.data.gouv.fr/entreprise/941045460",
  },
  {
    id: "ompt-nice",
    name: "OMPT NICE",
    trade_name: "",
    siren: "107866642",
    siret: "10786664200013",
    vat: "FR81107866642",
    legal_form: "SARL",
    naf: "43.99C",
    naf_label: "Travaux de maçonnerie générale et gros œuvre",
    address: "Immeuble Nouvel'R, 143 boulevard René Cassin, 06200 Nice",
    created_at: "2026-07-20",
    role: "exploitation",
    // Le classeur « CYCLE CHANTIER » la compte parmi les dossiers du groupe,
    // avec sa CIBTP et sa prévoyance PRO BTP — signe d'ouvriers salariés. Ses
    // quatre gérants au registre ne sont pas ceux des autres sociétés : le lien
    // capitalistique n'est pas public, d'où l'absence de quote-part.
    activity: "Travaux — antenne de Nice",
    capital: null,
    parent_id: "danilov-invest",
    ownership: null,
    source: "https://annuaire-entreprises.data.gouv.fr/entreprise/107866642",
  },
  {
    id: "danilov-fonciere",
    name: "DANILOV FONCIÈRE",
    trade_name: "",
    siren: "893840355",
    siret: "89384035500026",
    vat: "FR18893840355",
    legal_form: "Société civile",
    naf: "68.20B",
    naf_label: "Location de terrains et d'autres biens immobiliers",
    address: "25 avenue de Grasse, 06400 Cannes",
    created_at: "2021-02-09",
    role: "immobilier",
    // Le registre mentionne DANILOV INVEST parmi les associés de la société
    // civile : c'est le seul lien capitalistique publiquement confirmé.
    activity: "Société civile immobilière — détention et location des locaux",
    capital: null,
    parent_id: "danilov-invest",
    ownership: null,
    source: "https://annuaire-entreprises.data.gouv.fr/entreprise/893840355",
  },
];

export const ENTITY_BY_ID = new Map(ENTITIES.map((entity) => [entity.id, entity]));

export function entityName(id: string): string {
  return ENTITY_BY_ID.get(id)?.name ?? id;
}

/**
 * Deux sociétés du groupe figurent encore au registre mais sont hors
 * périmètre : OMPT IMMO (908 348 915) est en liquidation, OMPT FONCIÈRE
 * (891 946 295) est radiée. Elles sont citées pour que la structure affichée
 * ne paraisse pas incomplète à qui consulte le registre.
 */
export const DORMANT_ENTITIES = [
  { name: "OMPT IMMO", siren: "908348915", state: "En liquidation" },
  { name: "OMPT FONCIÈRE", siren: "891946295", state: "Radiée" },
];
