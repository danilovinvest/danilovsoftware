import { formatAmount, formatDate, plural } from "@/shared/lib/format";
import { missingFields, relationOf, formatSiret } from "./classification";
import {
  CUSTOMER_KIND,
  CUSTOMER_RELATION,
  CUSTOMER_STATUS,
  PROJECT_STAGE,
  QUOTE_STATUS,
  type Tone,
} from "./labels";
import type {
  Contact,
  Customer,
  CustomerDetail,
  CustomerKind,
  CustomerRelation,
  CustomerRelations,
  Project,
  Quote,
  QuotePayment,
} from "./types";

/**
 * La fiche en graphe : tout ce qui gravite autour d'elle, sur un seul plan.
 *
 * Module pur — ni React ni réseau — sur le patron de `cycle.ts`. La toile ne
 * fait que dessiner ce qu'il rend, et les tests figent ce qu'il déduit. Les
 * positions sont calculées ici plutôt que par un moteur de disposition : quatre
 * colonnes suffisent (relations, fiche, affaires, pièces, paiements), et une
 * disposition qui bouge d'une ouverture à l'autre ferait chercher les nœuds.
 */

/** Les couches qu'on affiche ou masque. Le cœur — la fiche et ses affaires — reste. */
export type GraphLayer = "coeur" | "relations" | "finances" | "activite";

/** Ce que la couleur d'un nœud dit : qui il est pour nous. */
export type GraphFamily =
  | "client"
  | "prescripteur"
  | "partenaire"
  | "fournisseur"
  | "personne"
  | "affaire"
  | "piece"
  | "paiement"
  | "activite";

/** Une ligne du panneau. `null` veut dire « à renseigner », et se voit. */
export type GraphRow = { label: string; value: string | null };

export type GraphNode = {
  id: string;
  layer: GraphLayer;
  family: GraphFamily;
  label: string;
  sub: string;
  /** Centre du nœud, en unités de la toile. */
  x: number;
  y: number;
  root?: boolean;
  tag?: { text: string; tone: Tone };
  /** La ligne sous le titre du panneau : « Syndic · prescripteur · actif ». */
  kindLine: string;
  rows: GraphRow[];
  note?: string;
  /** Où l'ouvrir dans le CRM. */
  href?: string;
  /** L'affaire que ce nœud représente, pour y poser son apporteur. */
  projectId?: string;
};

/** Trait plein, tirets « apporté par », pointillés « aussi sur », lien d'argent. */
export type EdgeStyle = "direct" | "apport" | "transverse" | "finance";

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  style: EdgeStyle;
  label?: string;
};

export type CustomerGraph = { nodes: GraphNode[]; edges: GraphEdge[] };

const STEP = 76;
const COL = { far: -660, near: -340, root: 0, affaire: 340, piece: 640, paiement: 920 };

const FAMILY_BY_RELATION: Record<CustomerRelation, GraphFamily> = {
  client_final: "client",
  prescripteur: "prescripteur",
  partenaire_technique: "partenaire",
  fournisseur: "fournisseur",
  sous_traitant: "partenaire",
};

export function familyOf(customer: Pick<Customer, "kind" | "relation">): GraphFamily {
  return FAMILY_BY_RELATION[relationOf(customer).value];
}

const ficheHref = (id: string) => `/customers/${id}`;
const affaireHref = (customerId: string, projectId: string, onglet?: string) =>
  `/customers/${customerId}?affaire=${projectId}${onglet ? `&onglet=${onglet}` : ""}`;

/** Une facture se reconnaît à sa référence, comme partout dans le CRM. */
export const isInvoice = (quote: Quote) => quote.reference.trim().toUpperCase().startsWith("FA");

const sum = (values: Array<string | null>) =>
  values.reduce((total, v) => total + (v ? Number(v) || 0 : 0), 0);

/** Les lignes d'une fiche complète : coordonnées, puis ce qui manque. */
function ficheRows(customer: Customer): GraphRow[] {
  const address = [customer.address_line, customer.postal_code, customer.city]
    .filter(Boolean)
    .join(", ");
  const rows: GraphRow[] = [];
  if (address) rows.push({ label: "Adresse", value: address });
  if (customer.phone) rows.push({ label: "Téléphone", value: customer.phone });
  if (customer.email) rows.push({ label: "E-mail", value: customer.email });
  const missing = missingFields(customer);
  rows.push({
    label: "SIRET",
    value: customer.siret ? formatSiret(customer.siret) : missing.includes("SIRET") ? null : "—",
  });
  rows.push({
    label: "Raison sociale",
    value: customer.company_name || (missing.includes("Raison sociale") ? null : "—"),
  });
  return rows;
}

function kindLine(customer: Pick<Customer, "kind" | "relation">, status?: string): string {
  const relation = relationOf(customer);
  return [
    CUSTOMER_KIND[customer.kind].label,
    CUSTOMER_RELATION[relation.value].label.toLowerCase() + (relation.deduced ? " (déduit)" : ""),
    status,
  ]
    .filter(Boolean)
    .join(" · ");
}

function contactNode(id: string, contact: Contact, at: { x: number; y: number }, of: string): GraphNode {
  const rows: GraphRow[] = [];
  if (contact.role_label) rows.push({ label: "Rôle", value: contact.role_label });
  if (contact.phone) rows.push({ label: "Téléphone", value: contact.phone });
  if (contact.email) rows.push({ label: "E-mail", value: contact.email });
  if (contact.company_name) rows.push({ label: "Employeur", value: contact.company_name });
  return {
    id,
    layer: "relations",
    family: "personne",
    label: contact.full_name,
    sub: contact.role_label || (contact.is_primary ? "interlocuteur principal" : "interlocuteur"),
    ...at,
    kindLine: `Interlocuteur · ${of}`,
    rows,
    note: contact.notes || undefined,
  };
}

function linkedNode(
  id: string,
  linked: {
    id: string;
    name: string;
    kind: CustomerKind;
    relation: CustomerRelation | null;
    status: string;
    city: string;
  },
  at: { x: number; y: number },
  sub: string,
): GraphNode {
  const customer = { kind: linked.kind, relation: linked.relation };
  return {
    id,
    layer: "relations",
    family: familyOf(customer),
    label: linked.name,
    sub,
    ...at,
    kindLine: kindLine(customer),
    rows: [{ label: "Ville", value: linked.city || "—" }],
    href: ficheHref(linked.id),
  };
}

/** Empile des nœuds autour d'un centre, un pas de `STEP` entre chacun. */
const spread = (count: number, center: number) => (i: number) => center + (i - (count - 1) / 2) * STEP;

export function buildGraph(detail: CustomerDetail, relations: CustomerRelations | null): CustomerGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const edge = (source: string, target: string, style: EdgeStyle = "direct", label?: string) =>
    edges.push({ id: `${source}->${target}`, source, target, style, label });

  const status = detail.is_client ? "client" : CUSTOMER_STATUS[detail.status].label.toLowerCase();
  nodes.push({
    id: "root",
    layer: "coeur",
    family: familyOf(detail),
    root: true,
    label: detail.display_name,
    sub: [CUSTOMER_KIND[detail.kind].label.toLowerCase(), detail.reference].filter(Boolean).join(" · "),
    x: COL.root,
    y: 0,
    tag: detail.is_client
      ? { text: "client", tone: "success" }
      : { text: CUSTOMER_STATUS[detail.status].label.toLowerCase(), tone: CUSTOMER_STATUS[detail.status].tone },
    kindLine: kindLine(detail, status),
    rows: ficheRows(detail),
    note: detail.notes || undefined,
  });

  // --- Relations, à gauche ------------------------------------------------
  const manager = relations?.manager ?? null;
  if (manager) {
    const my = -2 * STEP;
    nodes.push({
      id: "manager",
      layer: "relations",
      family: familyOf(manager),
      label: manager.display_name,
      sub: [CUSTOMER_KIND[manager.kind].label.toLowerCase(), manager.city].filter(Boolean).join(" · "),
      x: COL.near,
      y: my,
      tag: { text: CUSTOMER_RELATION[relationOf(manager).value].label.toLowerCase(), tone: "neutral" },
      kindLine: kindLine(manager),
      rows: ficheRows(manager),
      href: ficheHref(manager.id),
    });
    edge("root", "manager", "direct", "géré par");
    const at = spread(manager.contacts.length, my);
    manager.contacts.forEach((contact, i) => {
      const id = `manager-contact:${contact.id}`;
      nodes.push(contactNode(id, contact, { x: COL.far, y: at(i) }, manager.display_name));
      edge("manager", id);
    });
    relations?.siblings.forEach((sibling, i) => {
      const id = `fiche:${sibling.id}`;
      nodes.push(linkedNode(id, sibling, { x: COL.near, y: my - (i + 1) * STEP }, "même gestionnaire"));
      edge("manager", id, "direct", i === 0 ? "gère aussi" : undefined);
    });
  }

  // La colonne du bas : interlocuteurs de la fiche, puis ce qu'elle a apporté.
  let below = 2 * STEP;
  const nextBelow = () => {
    const y = below;
    below += STEP;
    return y;
  };
  detail.contacts.forEach((contact) => {
    const id = `contact:${contact.id}`;
    nodes.push(contactNode(id, contact, { x: COL.near, y: nextBelow() }, detail.display_name));
    edge("root", id);
  });
  if (detail.referrer) {
    const id =
      detail.referrer.kind === "fiche" ? `fiche:${detail.referrer.customer_id}` : `parrain:${detail.referrer.id}`;
    if (!nodes.some((n) => n.id === id) && !(manager && detail.referrer.customer_id === manager.id)) {
      nodes.push({
        id,
        layer: "relations",
        family: "prescripteur",
        label: detail.referrer.name,
        sub: detail.referrer.parent_name ? `de ${detail.referrer.parent_name}` : "parrain",
        x: COL.near,
        y: nextBelow(),
        kindLine: "Parrain · a recommandé cette fiche",
        rows: [],
        href: ficheHref(detail.referrer.customer_id),
      });
    }
    edge(manager && detail.referrer.customer_id === manager.id ? "manager" : id, "root", "apport", "recommandé par");
  }
  for (const [list, sub] of [
    [relations?.managed ?? [], "géré par cette fiche"],
    [relations?.referred ?? [], "recommandé par cette fiche"],
  ] as const) {
    list.forEach((linked) => {
      const id = `fiche:${linked.id}`;
      if (nodes.some((n) => n.id === id)) return;
      nodes.push(linkedNode(id, linked, { x: COL.far, y: nextBelow() }, sub));
      edge("root", id);
    });
  }
  relations?.referred_projects.forEach((project) => {
    const id = `apportee:${project.id}`;
    nodes.push({
      id,
      layer: "relations",
      family: "affaire",
      label: project.label,
      sub: `chez ${project.customer_name}`,
      x: COL.far,
      y: nextBelow(),
      tag: { text: PROJECT_STAGE[project.stage].label.toLowerCase(), tone: PROJECT_STAGE[project.stage].tone },
      kindLine: "Affaire apportée par cette fiche",
      rows: [{ label: "Client", value: project.customer_name }],
      href: affaireHref(project.customer_id, project.id),
    });
    edge("root", id, "apport", "a apporté");
  });

  // --- Affaires, pièces et paiements, à droite ----------------------------
  placeProjects(detail, relations, nodes, edge);

  // --- Activité, en bas ---------------------------------------------------
  placeActivity(detail, nodes, edge);

  return { nodes, edges };
}

type EdgeFn = (source: string, target: string, style?: EdgeStyle, label?: string) => void;

function blockRows(project: Project, pieces: Quote[], payments: QuotePayment[]): number {
  const pieceRows = pieces.reduce(
    (n, q) => n + Math.max(1, payments.filter((p) => p.quote_id === q.id).length),
    0,
  );
  return Math.max(1 + project.subcontractors.length, pieceRows, 1);
}

function placeProjects(
  detail: CustomerDetail,
  relations: CustomerRelations | null,
  nodes: GraphNode[],
  edge: EdgeFn,
) {
  const projects = detail.projects.filter((p) => !p.archived_at);
  const piecesOf = (p: Project) =>
    detail.quotes
      .filter((q) => q.project_id === p.id)
      .sort((a, b) => Number(isInvoice(a)) - Number(isInvoice(b)) || a.reference.localeCompare(b.reference));
  const heights = projects.map((p) => blockRows(p, piecesOf(p), detail.payments));
  let cursor = -((heights.reduce((a, b) => a + b, 0) - 1) * STEP) / 2;

  projects.forEach((project, index) => {
    const pieces = piecesOf(project);
    const rows = heights[index];
    const top = cursor;
    cursor += rows * STEP;
    const id = `affaire:${project.id}`;
    const stage = PROJECT_STAGE[project.stage];
    const referrer = relations?.project_referrers.find((r) => r.project_id === project.id);
    const projectRows: GraphRow[] = [
      { label: "Montant", value: Number(project.total_amount_ttc) ? `${formatAmount(project.total_amount_ttc)} TTC` : "—" },
      { label: "Apporté par", value: referrer?.customer_name ?? "—" },
    ];
    const site = [project.site_address, project.site_postal_code, project.site_city].filter(Boolean).join(", ");
    if (site) projectRows.unshift({ label: "Adresse", value: site });
    if (project.started_at) projectRows.push({ label: "Démarrage", value: formatDate(project.started_at) });
    if (project.finished_at) projectRows.push({ label: "Fin", value: formatDate(project.finished_at) });
    nodes.push({
      id,
      layer: "coeur",
      family: "affaire",
      label: project.reference || project.label,
      sub: project.reference ? project.label : stage.label.toLowerCase(),
      x: COL.affaire,
      y: top,
      tag: { text: stage.label.toLowerCase(), tone: stage.tone },
      kindLine: "Affaire",
      rows: projectRows,
      href: affaireHref(detail.id, project.id),
      projectId: project.id,
    });
    edge("root", id);

    if (referrer) {
      const source =
        relations?.manager && referrer.customer_id === relations.manager.id ? "manager" : `fiche:${referrer.customer_id}`;
      if (!nodes.some((n) => n.id === source)) {
        nodes.push(
          linkedNode(
            source,
            {
              id: referrer.customer_id,
              name: referrer.customer_name,
              kind: referrer.customer_kind,
              relation: referrer.customer_relation,
              status: "",
              city: "",
            },
            { x: COL.near, y: top - STEP },
            "apporteur",
          ),
        );
      }
      edge(source, id, "apport", "apporté par");
    }

    project.subcontractors.forEach((sub, i) => {
      const subId = `sous-traitant:${project.id}:${sub.subcontractor_id}`;
      nodes.push({
        id: subId,
        layer: "relations",
        family: "partenaire",
        label: sub.name,
        sub: sub.amount ? `sous-traitant · ${formatAmount(sub.amount)}` : "sous-traitant",
        x: COL.affaire,
        y: top + (i + 1) * STEP,
        kindLine: "Sous-traitant de l'affaire",
        rows: [{ label: "Montant", value: sub.amount ? formatAmount(sub.amount) : "non chiffré" }],
      });
      edge(id, subId, "transverse", i === 0 ? "sous-traite" : undefined);
    });

    let pieceY = top;
    pieces.forEach((quote) => {
      const pays = detail.payments.filter((p) => p.quote_id === quote.id);
      const pieceId = `piece:${quote.id}`;
      const y = pieceY + ((Math.max(1, pays.length) - 1) * STEP) / 2;
      nodes.push(pieceNode(pieceId, quote, pays, { x: COL.piece, y }, detail.id));
      edge(id, pieceId);
      pays.forEach((pay, i) => {
        const payId = `paiement:${pay.id}`;
        nodes.push({
          id: payId,
          layer: "finances",
          family: "paiement",
          label: formatAmount(pay.amount),
          sub: formatDate(pay.paid_at),
          x: COL.paiement,
          y: pieceY + i * STEP,
          kindLine: `Paiement · ${pay.kind}`,
          rows: [
            { label: "Reçu le", value: formatDate(pay.paid_at) },
            { label: "Référence", value: pay.reference || "—" },
            { label: "Affecté", value: quote.reference || quote.label },
          ],
          note: pay.note || undefined,
        });
        edge(pieceId, payId, "finance");
      });
      pieceY += Math.max(1, pays.length) * STEP;
    });
  });
}

function pieceNode(
  id: string,
  quote: Quote,
  payments: QuotePayment[],
  at: { x: number; y: number },
  customerId: string,
): GraphNode {
  const invoice = isInvoice(quote);
  const paid = sum(payments.map((p) => p.amount));
  const ttc = quote.amount_ttc ? Number(quote.amount_ttc) : null;
  const tag = invoice
    ? ttc !== null && paid >= ttc - 0.005
      ? { text: "payée", tone: "success" as Tone }
      : paid > 0
        ? { text: "partielle", tone: "warning" as Tone }
        : { text: "à encaisser", tone: "warning" as Tone }
    : { text: QUOTE_STATUS[quote.status].label.toLowerCase(), tone: QUOTE_STATUS[quote.status].tone };
  const rows: GraphRow[] = [
    { label: "Émis le", value: formatDate(quote.issued_at) },
    {
      label: "Montant",
      value: [quote.amount_ht && `${formatAmount(quote.amount_ht)} HT`, quote.amount_ttc && `${formatAmount(quote.amount_ttc)} TTC`]
        .filter(Boolean)
        .join(" · ") || quote.amount_note || "—",
    },
  ];
  if (invoice) {
    rows.push({ label: "Réglé", value: payments.length ? formatAmount(String(paid)) : "—" });
    if (ttc !== null) rows.push({ label: "Reste dû", value: formatAmount(String(Math.max(0, ttc - paid))) });
  }
  return {
    id,
    layer: "finances",
    family: "piece",
    label: quote.reference || quote.label,
    sub: [invoice ? "facture" : "devis", quote.amount_ttc && `${formatAmount(quote.amount_ttc)} TTC`]
      .filter(Boolean)
      .join(" · "),
    ...at,
    tag,
    kindLine: invoice ? "Facture" : "Devis",
    rows,
    note: quote.comment || undefined,
    href: affaireHref(customerId, quote.project_id, "devis"),
  };
}

function placeActivity(detail: CustomerDetail, nodes: GraphNode[], edge: EdgeFn) {
  const bottom = Math.max(...nodes.map((n) => n.y)) + STEP * 1.6;
  let x = COL.root;

  if (detail.interactions_total > 0) {
    const dates = detail.interactions.map((i) => i.occurred_at).sort();
    const relances = detail.interactions.filter((i) => i.kind === "relance").length;
    const rows: GraphRow[] = [{ label: "Dernier", value: formatDate(dates.at(-1)) }];
    // Le premier n'est connu que si toute l'histoire a été servie.
    if (detail.interactions.length >= detail.interactions_total) {
      rows.unshift({ label: "Premier", value: formatDate(dates[0]) });
    }
    if (relances) rows.push({ label: "Relances", value: String(relances) });
    nodes.push({
      id: "echanges",
      layer: "activite",
      family: "activite",
      label: plural(detail.interactions_total, "échange"),
      sub: dates.length ? `jusqu'au ${formatDate(dates.at(-1))}` : "historique",
      x,
      y: bottom,
      kindLine: "Historique",
      rows,
      href: `${ficheHref(detail.id)}?vue=echanges`,
    });
    edge("root", "echanges");
    x += 280;
  }

  const files = detail.quotes.filter((q) => q.drive_url).length;
  const proofs = detail.step_proofs.length;
  const folders = detail.projects.filter((p) => p.drive_path).length;
  if (files + proofs + folders > 0) {
    nodes.push({
      id: "documents",
      layer: "activite",
      family: "activite",
      label: plural(files + proofs, "document"),
      sub: "OneDrive · preuves",
      x,
      y: bottom,
      kindLine: "Documents liés",
      rows: [
        { label: "Pièces OneDrive", value: String(files) },
        { label: "Preuves jointes", value: String(proofs) },
        { label: "Dossiers d'affaire", value: String(folders) },
      ],
      href: `${ficheHref(detail.id)}?vue=documents`,
    });
    edge("root", "documents");
    x += 280;
  }

  detail.projects
    .filter((p) => !p.archived_at && p.next_task)
    .forEach((project) => {
      const task = project.next_task!;
      const id = `tache:${task.id}`;
      nodes.push({
        id,
        layer: "activite",
        family: "activite",
        label: task.title,
        sub: task.due_at ? `échéance ${formatDate(task.due_at)}` : "sans échéance",
        x,
        y: bottom,
        tag: task.is_overdue ? { text: "en retard", tone: "danger" } : { text: "à faire", tone: "warning" },
        kindLine: "Prochaine action",
        rows: [
          { label: "Pour", value: task.assignee_name || "personne" },
          { label: "Échéance", value: formatDate(task.due_at) },
          { label: "Priorité", value: task.priority },
        ],
        href: `/tasks?tache=${task.id}`,
      });
      edge(`affaire:${project.id}`, id);
      x += 280;
    });
}
