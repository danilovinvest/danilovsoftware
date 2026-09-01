import { ENTITIES } from "./entities";
import { SEED_INVOICES, SEED_VAT_REGIME, type SeedInvoice } from "./seed";
import type {
  AgedBucket,
  BillingSnapshot,
  EntityRevenue,
  IntraFlow,
  Invoice,
  InvoiceStatus,
  Metric,
  Period,
  VatRow,
} from "./types";

/**
 * Fabrique de l'écran de facturation.
 *
 * Comme pour le tableau de bord, tout est dérivé d'une seule source, ce qui
 * garantit que les panneaux s'accordent : la balance âgée, les flux internes
 * et la consolidation sont trois lectures des mêmes factures, pas trois jeux
 * de chiffres indépendants.
 */

const DAY = 86_400_000;
const WINDOW: Record<Period, number> = { "30j": 30, "90j": 90, "12m": 365 };

function iso(now: number, daysAgo: number): string {
  return new Date(now - daysAgo * DAY).toISOString();
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Statut d'une facture.
 *
 * « en retard » se déduit de l'échéance, il ne se saisit pas : une facture
 * émise le devient d'elle-même le lendemain de sa date limite. Le stocker
 * ferait dépendre la vérité d'un traitement nocturne, et une facture réglée le
 * matin resterait rouge jusqu'au soir.
 */
function statusOf(seed: SeedInvoice, ttc: number, overdue: boolean): InvoiceStatus {
  if (seed.credit) return "avoir";
  if (seed.draft) return "brouillon";
  if (seed.paid >= ttc - 0.01) return "reglee";
  // Le retard prime sur le règlement partiel : une facture échue à moitié
  // payée est en retard, et c'est ce que l'on veut voir. Le montant encore dû
  // est porté par la colonne « reste dû », il n'a pas besoin d'un statut.
  if (overdue) return "retard";
  if (seed.paid > 0) return "partielle";
  return "emise";
}

function materialize(now: number): Invoice[] {
  return SEED_INVOICES.map((seed) => {
    const vat = round((seed.ht * seed.vat) / 100);
    const ttc = round(seed.ht + vat);
    const dueDays = seed.issued - seed.terms;
    const overdue = !seed.draft && !seed.credit && dueDays > 0;

    return {
      id: seed.number,
      number: seed.number,
      entity_id: seed.entity,
      customer_name: seed.customer,
      customer_entity_id: seed.customerEntity ?? null,
      label: seed.label,
      kind: seed.kind,
      issued_at: iso(now, seed.issued),
      due_at: iso(now, dueDays),
      amount_ht: seed.ht,
      vat_rate: seed.vat,
      amount_vat: vat,
      amount_ttc: ttc,
      paid_amount: seed.paid,
      status: statusOf(seed, ttc, overdue),
      days_late: overdue && seed.paid < ttc - 0.01 ? dueDays : 0,
    } satisfies Invoice;
  });
}

/** Une facture au brouillon n'existe pas encore : elle ne compte nulle part. */
function isIssued(invoice: Invoice): boolean {
  return invoice.status !== "brouillon";
}

/** Reste dû, avoirs compris — un avoir diminue la créance du client. */
function outstandingOf(invoice: Invoice): number {
  if (!isIssued(invoice)) return 0;
  return round(invoice.amount_ttc - invoice.paid_amount);
}

function daysAgo(now: number, isoDate: string): number {
  return Math.round((now - new Date(isoDate).getTime()) / DAY);
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
  period: Period,
  entityId: string | null,
  at: Date = new Date(),
): BillingSnapshot {
  const now = at.getTime();
  const window = WINDOW[period];
  const all = materialize(now);

  const scoped = entityId === null ? all : all.filter((i) => i.entity_id === entityId);

  // ---- Compteurs -----------------------------------------------------------

  const billedIn = (list: Invoice[], from: number, to: number) =>
    list
      .filter((invoice) => {
        if (!isIssued(invoice)) return false;
        const age = daysAgo(now, invoice.issued_at);
        return age > from && age <= to;
      })
      .reduce((total, invoice) => total + invoice.amount_ht, 0);

  const paidIn = (list: Invoice[], from: number, to: number) =>
    list
      .filter((invoice) => {
        if (!isIssued(invoice)) return false;
        const age = daysAgo(now, invoice.issued_at);
        return age > from && age <= to;
      })
      .reduce((total, invoice) => total + invoice.paid_amount, 0);

  const outstanding = scoped.reduce((total, i) => total + outstandingOf(i), 0);
  const overdueList = scoped.filter((invoice) => invoice.days_late > 0);
  const overdue = overdueList.reduce((total, i) => total + outstandingOf(i), 0);

  // Une série par compteur : quatre courbes identiques sous quatre légendes
  // différentes seraient un mensonge par superposition.
  const series = (pick: (invoice: Invoice) => number) => {
    const points = Array.from({ length: 12 }, () => 0);
    for (const invoice of scoped) {
      if (!isIssued(invoice)) continue;
      const bucket = monthBucket(at, new Date(invoice.issued_at));
      if (bucket >= 0 && bucket < 12) points[bucket] += pick(invoice);
    }
    return points;
  };

  const metrics: Metric[] = [
    {
      key: "billed",
      label: "Facturé HT",
      hint: `Factures émises sur ${window} jours, avoirs déduits`,
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
      hint: "Factures dont l'échéance est dépassée et le solde non réglé",
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
    const index =
      late <= 0 ? 0 : late <= 30 ? 1 : late <= 60 ? 2 : late <= 90 ? 3 : 4;
    buckets[index].amount = round(buckets[index].amount + due);
    buckets[index].count += 1;
  }

  // ---- Répartition par société, toujours sur le groupe entier --------------

  const revenue: EntityRevenue[] = ENTITIES.map((entity) => {
    const mine = all.filter(
      (invoice) => invoice.entity_id === entity.id && isIssued(invoice),
    );
    const inPeriod = mine.filter(
      (invoice) => daysAgo(now, invoice.issued_at) <= window,
    );
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
    const regime = SEED_VAT_REGIME[entity.id] ?? "trimestriel";
    const start = declarationStart(at, regime).getTime();
    const mine = all.filter(
      (invoice) =>
        invoice.entity_id === entity.id &&
        isIssued(invoice) &&
        new Date(invoice.issued_at).getTime() >= start,
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

  const flowMap = new Map<string, IntraFlow>();
  for (const invoice of all) {
    if (invoice.customer_entity_id === null || !isIssued(invoice)) continue;
    if (daysAgo(now, invoice.issued_at) > window) continue;

    const kind =
      invoice.kind === "loyer"
        ? "loyer"
        : invoice.kind === "honoraires"
          ? "honoraires"
          : "refacturation";
    const key = `${invoice.entity_id}>${invoice.customer_entity_id}:${kind}`;
    const existing = flowMap.get(key);
    if (existing) {
      existing.amount_ht = round(existing.amount_ht + invoice.amount_ht);
      existing.invoices += 1;
      continue;
    }
    flowMap.set(key, {
      id: key,
      from_entity_id: invoice.entity_id,
      to_entity_id: invoice.customer_entity_id,
      kind,
      label:
        kind === "loyer"
          ? "Loyers des locaux"
          : kind === "honoraires"
            ? "Honoraires de direction"
            : "Refacturation de prestations",
      amount_ht: invoice.amount_ht,
      invoices: 1,
    });
  }
  const flows = [...flowMap.values()].sort((a, b) => b.amount_ht - a.amount_ht);

  // ---- Consolidation -------------------------------------------------------
  //
  // Additionner les cinq chiffres d'affaires compte deux fois ce que le groupe
  // se facture à lui-même. Le chiffre consolidé retire ces flux — c'est le
  // seul des deux qui mesure ce que le groupe a vendu à l'extérieur.

  const totalBilled = round(revenue.reduce((total, row) => total + row.billed, 0));
  const totalIntra = round(revenue.reduce((total, row) => total + row.intra, 0));

  return {
    generated_at: at.toISOString(),
    period,
    entity_id: entityId,
    metrics,
    invoices: scoped
      .slice()
      .sort((a, b) => b.issued_at.localeCompare(a.issued_at)),
    aged: buckets,
    revenue,
    vat,
    flows,
    total_billed: totalBilled,
    consolidated: round(totalBilled - totalIntra),
  };
}
