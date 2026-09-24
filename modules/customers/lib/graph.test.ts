import { describe, expect, test } from "bun:test";
import { missingFields, relationOf, formatSiret } from "./classification";
import { buildGraph } from "./graph";
import type {
  Contact,
  Customer,
  CustomerDetail,
  CustomerRelations,
  Project,
  Quote,
  QuotePayment,
} from "./types";

/*
  La fiche SDC Meynadier-Faure telle que la maquette la décrit au 24/09/2026 :
  une copropriété gérée par le Cabinet Central Gestion, qui a apporté son unique
  affaire, un devis, deux factures, trois virements.
*/

const customer = (over: Partial<Customer> = {}): Customer => ({
  id: "copro",
  reference: "CLI-2026-0166",
  display_name: "SDC Meynadier-Faure",
  kind: "copropriete",
  status: "client",
  is_client: true,
  client_override: null,
  client_override_at: null,
  client_override_by_name: "",
  issuer: "ompt-groupe",
  issuer_override: null,
  issuer_override_at: null,
  issuer_override_by_name: "",
  source: "recommandation",
  company_name: "",
  email: "",
  phone: "",
  address_line: "33 rue Félix Faure",
  postal_code: "06400",
  city: "Cannes",
  country: "France",
  requested_at: null,
  notes: "",
  owner_id: null,
  owner_name: "",
  created_at: "2025-09-10T09:00:00Z",
  updated_at: "2026-01-28T09:00:00Z",
  review: { verified_at: null, verified_by_name: "", completed_at: null, completed_by_name: "" },
  relation: null,
  siret: "",
  ...over,
});

const contact = (id: string, full_name: string, over: Partial<Contact> = {}): Contact => ({
  id,
  customer_id: "copro",
  full_name,
  role_label: "",
  company_name: "",
  email: "",
  phone: "",
  is_primary: false,
  emails: [],
  phones: [],
  notes: "",
  created_at: "2025-09-10T09:00:00Z",
  updated_at: "2025-09-10T09:00:00Z",
  ...over,
});

const project: Project = {
  id: "aff",
  customer_id: "copro",
  label: "Mise en sécurité incendie",
  stage: "realise",
  outcome: null,
  outcome_note: "",
  source_status: "",
  scope: null,
  site_address: "33 rue Félix Faure",
  site_postal_code: "06400",
  site_city: "Cannes",
  notes: "",
  started_at: "2025-10-02",
  finished_at: null,
  closed_at: null,
  drive_path: "3. OMPT GROUPE/2025/09-10-2025_Meynadier",
  manager_id: null,
  manager_name: "",
  engineer_id: null,
  engineer_name: "",
  drafter_id: null,
  drafter_name: "",
  reference: "GRP-2026-0196",
  mission: null,
  issuer: null,
  next_task: null,
  subcontractors: [],
  subcontracting_total: null,
  archived_at: null,
  promised_at: null,
  internal_deadline_at: null,
  quote_count: 3,
  total_amount_ttc: "5720.00",
  invoiced_amount_ttc: "5720.00",
  collected_amount_ttc: "2860.00",
  settlements_without_amount: 0,
  last_reminder_at: null,
  created_at: "2025-09-10T09:00:00Z",
  updated_at: "2026-01-28T09:00:00Z",
};

const quote = (id: string, reference: string, ttc: string, over: Partial<Quote> = {}): Quote => ({
  id,
  project_id: "aff",
  project_label: project.label,
  customer_id: "copro",
  reference,
  piece: reference.startsWith("FA") ? "facture" : "devis",
  invoice_kind: null,
  source_quote_id: null,
  due_at: null,
  kind: "travaux",
  label: "",
  status: "realise",
  issued_at: "2025-09-26",
  amount_ht: null,
  amount_ttc: ttc,
  vat_rate: "10",
  amount_note: "",
  amount_source: "manuel",
  amount_read_at: null,
  amount_evidence: "",
  amount_read_error: "",
  amount_pdf_ht: null,
  amount_pdf_evidence: "",
  issuer: "ompt-groupe",
  deposit_status: "non_applicable",
  deposit_invoiced_at: null,
  deposit_paid_at: null,
  deposit_amount: null,
  balance_status: "non_applicable",
  balance_amount: null,
  balance_paid_at: null,
  comment: "",
  drive_url: "https://onedrive.live.com/x",
  drive_name: `${reference}.pdf`,
  created_at: "2025-09-26T09:00:00Z",
  updated_at: "2025-09-26T09:00:00Z",
  ...over,
});

const payment = (id: string, quote_id: string, amount: string, paid_at: string): QuotePayment => ({
  id,
  quote_id,
  kind: "acompte",
  paid_at,
  amount,
  reference: "",
  note: "",
  created_at: paid_at,
  created_by_name: "",
});

const detail: CustomerDetail = {
  ...customer(),
  referrer: null,
  contacts: [contact("vidal", "Me Vidal", { role_label: "contact sur place", phone: "06 86 42 18 43" })],
  projects: [project],
  quotes: [
    quote("de", "DE2025-0552", "5720.00", { status: "accepte" }),
    quote("fa16", "FA2025-0416", "2860.00"),
    quote("fa21", "FA2025-0421", "2860.00"),
  ],
  interactions: [],
  interactions_total: 0,
  milestones: [],
  payments: [
    payment("p1", "fa16", "1300.00", "2025-10-14"),
    payment("p2", "fa16", "1500.00", "2025-11-07"),
    payment("p3", "fa16", "60.00", "2026-01-28"),
    payment("p4", "fa21", "2860.00", "2026-01-28"),
  ],
  step_proofs: [],
};

const relations: CustomerRelations = {
  manager: {
    ...customer({
      id: "cabinet",
      display_name: "Cabinet Central Gestion",
      kind: "syndic",
      city: "Nice",
      phone: "04 93 04 08 70",
    }),
    contacts: [
      contact("eske", "Maud Eskenazi", { customer_id: "cabinet", role_label: "gestionnaire" }),
      contact("hano", "Eliot Hanoune", { customer_id: "cabinet", role_label: "resp. copropriétés Nice" }),
    ],
  },
  siblings: [
    {
      id: "magda",
      name: "SDC Villa Magda",
      kind: "copropriete",
      relation: null,
      status: "prospect",
      city: "Cannes",
      is_client: false,
    },
  ],
  managed: [],
  referred: [],
  referred_projects: [],
  project_referrers: [
    {
      project_id: "aff",
      customer_id: "cabinet",
      customer_name: "Cabinet Central Gestion",
      customer_kind: "syndic",
      // Tranché à la main sur sa propre fiche : le nœud doit prendre cette
      // relation, pas celle que son type ferait deviner.
      customer_relation: "partenaire_technique",
    },
  ],
};

describe("relationOf", () => {
  test("déduit la relation du type tant que personne ne tranche, et le dit", () => {
    expect(relationOf({ kind: "syndic", relation: null })).toEqual({ value: "prescripteur", deduced: true });
    expect(relationOf({ kind: "copropriete", relation: null })).toEqual({ value: "client_final", deduced: true });
    expect(relationOf({ kind: "ingenieur", relation: null })).toEqual({
      value: "partenaire_technique",
      deduced: true,
    });
  });

  test("un choix humain l'emporte sur le type", () => {
    expect(relationOf({ kind: "syndic", relation: "client_final" })).toEqual({
      value: "client_final",
      deduced: false,
    });
  });
});

describe("missingFields", () => {
  test("une copropriété sans SIRET ni raison sociale les réclame", () => {
    expect(missingFields({ kind: "copropriete", siret: "", company_name: "" })).toEqual([
      "SIRET",
      "Raison sociale",
    ]);
  });

  test("un particulier ne réclame rien", () => {
    expect(missingFields({ kind: "particulier", siret: "", company_name: "" })).toEqual([]);
  });

  test("le SIRET s'affiche par groupes", () => {
    expect(formatSiret("12345678900012")).toBe("123 456 789 00012");
  });
});

describe("buildGraph", () => {
  const graph = buildGraph(detail, relations);
  const node = (id: string) => graph.nodes.find((n) => n.id === id);
  const edge = (source: string, target: string) =>
    graph.edges.find((e) => e.source === source && e.target === target);

  test("la fiche est au centre, et dit ce qui lui manque", () => {
    const root = node("root");
    expect(root?.root).toBe(true);
    expect(root?.x).toBe(0);
    expect(root?.y).toBe(0);
    expect(root?.rows.filter((r) => r.value === null).map((r) => r.label)).toEqual([
      "SIRET",
      "Raison sociale",
    ]);
    expect(root?.kindLine).toContain("client final (déduit)");
  });

  test("le syndic, ses interlocuteurs et son autre immeuble", () => {
    expect(node("manager")?.label).toBe("Cabinet Central Gestion");
    expect(node("manager")?.family).toBe("prescripteur");
    expect(edge("root", "manager")?.label).toBe("géré par");
    expect(edge("manager", "manager-contact:eske")).toBeDefined();
    expect(edge("manager", "manager-contact:hano")).toBeDefined();
    expect(edge("manager", "fiche:magda")).toBeDefined();
    expect(node("fiche:magda")?.href).toBe("/customers/magda");
  });

  test("l'affaire est apportée par le syndic, par un seul nœud syndic", () => {
    expect(edge("manager", "affaire:aff")?.style).toBe("apport");
    expect(graph.nodes.filter((n) => n.label === "Cabinet Central Gestion")).toHaveLength(1);
    expect(node("affaire:aff")?.rows.find((r) => r.label === "Apporté par")?.value).toBe(
      "Cabinet Central Gestion",
    );
  });

  test("le devis vient avant les factures, et chaque virement va sous sa facture", () => {
    const pieces = graph.nodes.filter((n) => n.family === "piece").sort((a, b) => a.y - b.y);
    expect(pieces.map((p) => p.label)).toEqual(["DE2025-0552", "FA2025-0416", "FA2025-0421"]);
    expect(edge("piece:fa16", "paiement:p1")?.style).toBe("finance");
    expect(edge("piece:fa16", "paiement:p3")).toBeDefined();
    expect(edge("piece:fa21", "paiement:p4")).toBeDefined();
  });

  test("une facture réglée en trois virements se dit payée", () => {
    expect(node("piece:fa16")?.tag).toEqual({ text: "payée", tone: "success" });
    expect(node("piece:fa16")?.rows.find((r) => r.label === "Reste dû")?.value).toMatch(/^0/);
    expect(node("piece:de")?.tag?.text).toBe("accepté");
  });

  test("aucun nœud ne se superpose à un autre", () => {
    const seen = new Set<string>();
    for (const n of graph.nodes) {
      const key = `${n.x}:${n.y}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  test("chaque lien relie deux nœuds qui existent", () => {
    const ids = new Set(graph.nodes.map((n) => n.id));
    for (const e of graph.edges) {
      expect(ids.has(e.source)).toBe(true);
      expect(ids.has(e.target)).toBe(true);
    }
  });

  test("sans second cercle, la fiche se dessine quand même", () => {
    const alone = buildGraph(detail, null);
    expect(alone.nodes.some((n) => n.id === "manager")).toBe(false);
    expect(alone.nodes.some((n) => n.id === "affaire:aff")).toBe(true);
  });

  test("une affaire archivée ne se dessine pas", () => {
    const archived = buildGraph({ ...detail, projects: [{ ...project, archived_at: "2026-02-01T00:00:00Z" }] }, null);
    expect(archived.nodes.some((n) => n.id === "affaire:aff")).toBe(false);
  });
});
