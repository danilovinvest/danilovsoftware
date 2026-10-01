import { ENTITIES } from "@/modules/group";
import { daysBetween } from "./live";
import { VAT_REGIME } from "./regimes";
import type {
  AgedBucket,
  BillingSnapshot,
  EntityRevenue,
  Invoice,
  Metric,
  Period,
  VatRow,
} from "./types";

/**
 * Fabrique de l'écran de facturation.
 *
 * Tout est dérivé d'une seule source — les factures de la base, converties par
 * `lib/live.ts` —, ce qui garantit que les panneaux s'accordent : la balance
 * âgée, la TVA et la répartition par société sont trois lectures des mêmes
 * factures, pas trois jeux de chiffres indépendants.
 *
 * Module **pur** : le jour vient du serveur (`today`, AAAA-MM-JJ), jamais de
 * l'horloge du poste.
 */

const WINDOW: Record<Period, number> = { "30j": 30, "90j": 90, "12m": 365 };

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Une pièce sans montant ne compte nulle part : on ignore ce qu'elle vaut. */
function counts(invoice: Invoice): boolean {
  return !invoice.unpriced;
}

/** Reste dû selon la règle du recouvrement. */
function outstandingOf(invoice: Invoice): number {
  return counts(invoice) ? invoice.remaining : 0;
}

/** Jours depuis l'émission ; une pièce sans date est hors de toute période. */
function ageOf(invoice: Invoice, today: string): number {
  return invoice.issued_at ? daysBetween(invoice.issued_at, today) : Number.POSITIVE_INFINITY;
}

/** Bornes de la période de déclaration de TVA en cours. */
function declarationStart(at: Date, regime: "mensuel" | "trimestriel"): Date {
  if (regime === "mensuel") return new Date(at.getFullYear(), at.getMonth(), 1);
  return new Date(at.getFullYear(), Math.floor(at.getMonth() / 3) * 3, 1);
}

/**
 * Échéance de dépôt. Le calendrier réel dépend du régime et du numéro de
 * département ; on retient le 24 du mois qui suit la période, ce qui est la
 * date la plus tardive du calendrier CA3.
 */
function declarationDue(at: Date, regime: "mensuel" | "trimestriel"): Date {
  const start = declarationStart(at, regime);
  const months = regime === "mensuel" ? 1 : 3;
  return new Date(start.getFullYear(), start.getMonth() + months, 24);
}

const monthLabel = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

/** « septembre 2026 » ou « T3 2026 », selon le régime. */
function declarationLabel(at: Date, regime: "mensuel" | "trimestriel"): string {
  const start = declarationStart(at, regime);
  if (regime === "mensuel") return monthLabel.format(start);
  return `T${Math.floor(start.getMonth() / 3) + 1} ${start.getFullYear()}`;
}

function monthBucket(now: Date, date: Date): number {
  const distance =
    (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
  return 11 - distance;
}

export function buildBillingSnapshot(
  all: Invoice[],
  period: Period,
  entityId: string | null,
  today: string,
): BillingSnapshot {
  const at = new Date(`${today.slice(0, 10)}T12:00:00`);
  const window = WINDOW[period];

  const scoped = entityId === null ? all : all.filter((i) => i.entity_id === entityId);

  // ---- Compteurs -----------------------------------------------------------

  const within = (list: Invoice[], from: number, to: number) =>
    list.filter((invoice) => {
      if (!counts(invoice)) return false;
      const age = ageOf(invoice, today);
      return age > from && age <= to;
    });
  const billedIn = (list: Invoice[], from: number, to: number) =>
    within(list, from, to).reduce((total, invoice) => total + invoice.amount_ht, 0);
  const paidIn = (list: Invoice[], from: number, to: number) =>
    within(list, from, to).reduce((total, invoice) => total + invoice.paid_amount, 0);

  const outstanding = scoped.reduce((total, i) => total + outstandingOf(i), 0);
  const overdueList = scoped.filter((invoice) => invoice.days_late > 0);
  const overdue = overdueList.reduce((total, i) => total + outstandingOf(i), 0);

  // Une série par compteur : quatre courbes identiques sous quatre légendes
  // différentes seraient un mensonge par superposition.
  const series = (pick: (invoice: Invoice) => number) => {
    const points = Array.from({ length: 12 }, () => 0);
    for (const invoice of scoped) {
      if (!counts(invoice) || !invoice.issued_at) continue;
      const bucket = monthBucket(at, new Date(`${invoice.issued_at.slice(0, 10)}T12:00:00`));
      if (bucket >= 0 && bucket < 12) points[bucket] += pick(invoice);
    }
    return points;
  };

  const metrics: Metric[] = [
    {
      key: "billed",
      label: "Facturé HT",
      hint: `Factures émises sur ${window} jours, avoirs déduits — une pièce sans date ni montant n'y entre pas`,
      value: round(billedIn(scoped, 0, window)),
      previous: round(billedIn(scoped, window, window * 2)),
      format: "amount",
      trend: series((invoice) => invoice.amount_ht),
      trend_label: "Facturé HT par mois, 12 mois",
    },
    {
      key: "collected",
      label: "Encaissé TTC",
      // Le CRM ne tient pas de journal de banque : il sait ce qui a été réglé
      // sur une facture, pas le jour où l'argent est arrivé. Le rattachement se
      // fait donc à la facture, pas à l'encaissement.
      hint: `Règlements reçus sur les factures des ${window} derniers jours`,
      value: round(paidIn(scoped, 0, window)),
      previous: round(paidIn(scoped, window, window * 2)),
      format: "amount",
      trend: series((invoice) => invoice.paid_amount),
      trend_label: "Encaissé TTC par mois de facture, 12 mois",
    },
    {
      key: "outstanding",
      label: "Reste à encaisser",
      hint: "Solde TTC de toutes les factures émises et non soldées, à ce jour",
      value: round(outstanding),
      previous: null,
      note: "Encours — se lit à l'instant t",
      format: "amount",
      trend: series(outstandingOf),
      trend_label: "Reste dû par mois d'émission, 12 mois",
    },
    {
      key: "overdue",
      label: "En retard",
      hint: "Factures dont l'échéance saisie est dépassée et le solde non réglé — sans échéance, une facture n'est jamais en retard",
      value: round(overdue),
      previous: null,
      note:
        overdueList.length === 0
          ? "Aucune facture en retard"
          : `${overdueList.length} facture${overdueList.length > 1 ? "s" : ""} concernée${
              overdueList.length > 1 ? "s" : ""
            }`,
      format: "amount",
      trend: series((invoice) => (invoice.days_late > 0 ? outstandingOf(invoice) : 0)),
      trend_label: "Impayés échus par mois d'émission, 12 mois",
    },
  ];

  // ---- Balance âgée --------------------------------------------------------

  const buckets: AgedBucket[] = [
    { key: "sans_echeance", label: "Sans échéance", amount: 0, count: 0 },
    { key: "a_echoir", label: "À échoir", amount: 0, count: 0 },
    { key: "0_30", label: "1 à 30 j", amount: 0, count: 0 },
    { key: "31_60", label: "31 à 60 j", amount: 0, count: 0 },
    { key: "61_90", label: "61 à 90 j", amount: 0, count: 0 },
    { key: "90_plus", label: "Plus de 90 j", amount: 0, count: 0 },
  ];

  for (const invoice of scoped) {
    const due = outstandingOf(invoice);
    if (due <= 0) continue;
    const late = invoice.days_late;
    const index = !invoice.due_at
      ? 0
      : late <= 0
        ? 1
        : late <= 30
          ? 2
          : late <= 60
            ? 3
            : late <= 90
              ? 4
              : 5;
    buckets[index].amount = round(buckets[index].amount + due);
    buckets[index].count += 1;
  }

  // ---- Répartition par société, toujours sur le groupe entier --------------

  const revenue: EntityRevenue[] = ENTITIES.map((entity) => {
    const mine = all.filter((invoice) => invoice.entity_id === entity.id && counts(invoice));
    const inPeriod = mine.filter((invoice) => ageOf(invoice, today) <= window);
    return {
      entity,
      billed: round(inPeriod.reduce((t, i) => t + i.amount_ht, 0)),
      intra: round(
        inPeriod
          .filter((invoice) => invoice.customer_entity_id !== null)
          .reduce((t, i) => t + i.amount_ht, 0),
      ),
      collected: round(inPeriod.reduce((t, i) => t + i.paid_amount, 0)),
      outstanding: round(mine.reduce((t, i) => t + outstandingOf(i), 0)),
      overdue: round(
        mine.filter((i) => i.days_late > 0).reduce((t, i) => t + outstandingOf(i), 0),
      ),
      invoices: inPeriod.length,
    };
  }).sort((a, b) => b.billed - a.billed);

  // ---- TVA collectée sur la période de déclaration en cours ---------------

  const vat: VatRow[] = ENTITIES.map((entity) => {
    const regime = VAT_REGIME[entity.id] ?? "trimestriel";
    const start = declarationStart(at, regime).getTime();
    const mine = all.filter(
      (invoice) =>
        invoice.entity_id === entity.id &&
        counts(invoice) &&
        invoice.issued_at !== null &&
        new Date(`${invoice.issued_at.slice(0, 10)}T12:00:00`).getTime() >= start,
    );
    return {
      entity_id: entity.id,
      collected: round(mine.reduce((t, i) => t + i.amount_vat, 0)),
      base: round(mine.reduce((t, i) => t + i.amount_ht, 0)),
      regime,
      period_label: declarationLabel(at, regime),
      next_declaration: declarationDue(at, regime).toISOString(),
    };
  });

  // ---- Flux internes -------------------------------------------------------
  //
  // Le CRM ne sait pas encore qu'un client est une société du groupe
  // (`customer_entity_id` reste nul) : aucun flux n'est inventé, et le panneau
  // le dit plutôt que d'afficher zéro.

  // ---- Consolidation -------------------------------------------------------
  //
  // Additionner les cinq chiffres d'affaires compte deux fois ce que le groupe
  // se facture à lui-même. Le chiffre consolidé retire ces flux — c'est le
  // seul des deux qui mesure ce que le groupe a vendu à l'extérieur.

  const totalBilled = round(revenue.reduce((total, row) => total + row.billed, 0));
  const totalIntra = round(revenue.reduce((total, row) => total + row.intra, 0));

  return {
    generated_at: today,
    period,
    entity_id: entityId,
    metrics,
    invoices: scoped
      .slice()
      .sort((a, b) => (b.issued_at ?? "").localeCompare(a.issued_at ?? "")),
    aged: buckets,
    revenue,
    vat,
    flows: [],
    unrecorded: unrecordedOf(scoped),
    total_billed: totalBilled,
    consolidated: round(totalBilled - totalIntra),
  };
}

/**
 * Le reste dû porté par des pièces marquées reçues sans aucun virement saisi.
 * Mesuré le 01/10 : 1,21 M€ des 1,30 M€ de reste dû de GROUPE. `reste_du` ne
 * déduit pas un acompte marqué reçu sur la facture elle-même, et l'écran le
 * dit au lieu de l'additionner en silence aux vrais impayés.
 */
function unrecordedOf(list: Invoice[]): { amount: number; count: number } {
  const hit = list.filter((i) => i.marked_received && i.payments === 0 && outstandingOf(i) > 0.01);
  return { amount: round(hit.reduce((t, i) => t + outstandingOf(i), 0)), count: hit.length };
}
