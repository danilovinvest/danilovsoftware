import { STAGE_ORDER } from "@/modules/customers";
import type { Metric } from "@/shared/ui/metric-cards";
import {
  EXPORT_DATE,
  EXPORT_FILE,
  SEED_CUSTOMERS,
  type SeedCustomer,
  type SeedProject,
} from "./seed";
import type {
  ActivityRow,
  DashboardSnapshot,
  DigestRow,
  Health,
  HotRow,
  Period,
  RelanceRow,
  StageBucket,
  TopClient,
  VatBucket,
} from "./types";

/**
 * Fabrique du tableau de bord à partir de l'export de devis.
 *
 * Tout ce que l'écran affiche est calculé ici, en un seul endroit et depuis une
 * seule source : les panneaux s'accordent donc entre eux par construction. Ces
 * règles sont écrites pour passer côté serveur — un score de priorité calculé
 * sur le poste de chacun n'est pas partageable, et il changerait selon
 * l'horloge du poste.
 */

const DAY = 86_400_000;
const WINDOW: Record<Period, number> = { "30j": 30, "90j": 90, "12m": 365 };

/**
 * Les trois âges d'un devis en attente.
 *
 * `FRESH` : le client vient de le recevoir, il le lit — relancer maintenant
 * n'apporte rien. `COLD` : au-delà de six mois sans réponse, un devis de
 * structure n'est plus une affaire en cours, c'est une archive. Entre les deux
 * se trouve la seule fenêtre où une relance change quelque chose, et c'est
 * elle que la liste de travail montre.
 */
const FRESH_DAYS = 21;
const COLD_DAYS = 180;

/** Gros dossier pour ce bureau d'études : l'enjeu sature à ce montant. */
const BIG_TICKET = 50_000;

function daysBetween(now: number, iso: string): number {
  return Math.max(0, Math.round((now - new Date(`${iso}T09:00:00`).getTime()) / DAY));
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Part d'enjeu d'un montant, entre 0 et 1. */
function stakeOf(amount: number): number {
  return Math.min(amount / BIG_TICKET, 1);
}

/** Un devis « en étude » est un devis parti chez le client, sans réponse. */
function isPending(project: SeedProject): boolean {
  return project.stage === "devis_envoye";
}

function isSigned(project: SeedProject): boolean {
  return project.stage === "gagne" || project.stage === "realise";
}

/**
 * Température : le client a le devis sous les yeux.
 *
 * Deux facteurs seulement, et c'est délibéré — l'export n'en donne pas
 * davantage. La fraîcheur décroît linéairement sur trois semaines, l'enjeu
 * sature à 50 000 €.
 */
function temperatureOf(days: number, amount: number): number {
  const freshness = 1 - Math.min(days / FRESH_DAYS, 1);
  return clamp(100 * (0.5 * freshness + 0.5 * stakeOf(amount)));
}

/**
 * Urgence de relance, sur la fenêtre utile seulement.
 *
 * Le score décroît avec l'âge au lieu de croître : passé trois semaines, plus
 * un devis attend, moins la relance a de chances d'aboutir. Classer par
 * ancienneté décroissante — le réflexe naturel — mettrait en tête les dossiers
 * les plus morts.
 */
function urgencyOf(days: number, amount: number): number {
  const span = COLD_DAYS - FRESH_DAYS;
  const window = 1 - Math.min((days - FRESH_DAYS) / span, 1);
  return clamp(100 * (0.45 * window + 0.55 * stakeOf(amount)));
}

function relanceReason(days: number, amount: number): string {
  if (days > 120) {
    return `Sans réponse depuis ${Math.round(days / 30)} mois — dernier moment pour statuer`;
  }
  if (amount >= BIG_TICKET) {
    return `Gros dossier resté ${days} jours sans réponse`;
  }
  return `Devis envoyé il y a ${days} jours, aucune réponse`;
}

function hotSignals(customer: SeedCustomer, days: number, amount: number): string[] {
  const signals: string[] = [];
  if (days <= 3) signals.push("Parti il y a moins de 3 jours");
  else if (days <= 7) signals.push("Parti cette semaine");
  if (amount >= BIG_TICKET) signals.push("Enjeu à six chiffres ou proche");
  else if (amount >= 20000) signals.push("Enjeu supérieur à 20 000 €");
  if (customer.status === "client") signals.push("Client qui a déjà signé");
  if (customer.projects.length > 2) {
    signals.push(`${customer.projects.length} devis sur cette fiche`);
  }
  return signals.slice(0, 3);
}

/** Taux de TVA dominant d'un devis : celui qui porte le plus gros montant. */
function dominantVat(vat: number[]): number {
  if (vat.length === 0) return 0;
  return Math.max(...vat);
}

const VAT_LABEL: Record<number, { label: string; hint: string }> = {
  10: { label: "10 %", hint: "Rénovation de logements achevés depuis plus de 2 ans" },
  20: { label: "20 %", hint: "Neuf, locaux professionnels, prestations intellectuelles" },
  0: { label: "0 %", hint: "Autoliquidation ou sous-traitance" },
};

function monthBucket(now: Date, date: Date): number {
  const distance =
    (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
  return 11 - distance;
}

export function buildSnapshot(period: Period, at: Date = new Date()): DashboardSnapshot {
  const now = at.getTime();
  const window = WINDOW[period];

  const quotes = SEED_CUSTOMERS.flatMap((customer) =>
    customer.projects.map((project) => ({
      customer,
      project,
      id: `${customer.id}-${project.quote.ref}`,
      days: daysBetween(now, project.quote.date),
      amount: project.quote.ht,
    })),
  );

  // ---- Compteurs -----------------------------------------------------------

  const inWindow = (days: number, from: number, to: number) => days > from && days <= to;

  const signedIn = (from: number, to: number) =>
    quotes
      .filter((q) => isSigned(q.project) && inWindow(q.days, from, to))
      .reduce((total, q) => total + q.amount, 0);

  const issuedIn = (from: number, to: number) =>
    quotes.filter((q) => inWindow(q.days, from, to)).length;

  const pending = quotes.filter((q) => isPending(q.project));
  const pendingAmount = pending.reduce((total, q) => total + q.amount, 0);

  const lastYear = quotes.filter((q) => q.days <= 365);
  const signedCount = lastYear.filter((q) => isSigned(q.project)).length;

  const series = (pick: (q: (typeof quotes)[number]) => number) => {
    const points = Array.from({ length: 12 }, () => 0);
    for (const quote of quotes) {
      const bucket = monthBucket(at, new Date(quote.project.quote.date));
      if (bucket >= 0 && bucket < 12) points[bucket] += pick(quote);
    }
    return points;
  };

  const metrics: Metric[] = [
    {
      key: "signed",
      label: "Signé HT",
      hint: `Devis acceptés ou facturés sur ${window} jours`,
      value: Math.round(signedIn(0, window)),
      previous: Math.round(signedIn(window, window * 2)),
      format: "amount",
      trend: series((q) => (isSigned(q.project) ? q.amount : 0)),
      trend_label: "Montant signé par mois, 12 mois",
    },
    {
      key: "pending",
      label: "En attente de réponse",
      hint:
        "Devis au statut « étude », toutes dates confondues. Les variantes d'un même chantier y comptent chacune pour elle-même : l'export ne les relie pas.",
      value: Math.round(pendingAmount),
      previous: null,
      note: `${pending.length} devis en attente`,
      format: "amount",
      trend: series((q) => (isPending(q.project) ? q.amount : 0)),
      trend_label: "Montant en attente par mois d'envoi, 12 mois",
    },
    {
      key: "issued",
      label: "Devis émis",
      hint: `Nombre de devis établis sur ${window} jours`,
      value: issuedIn(0, window),
      previous: issuedIn(window, window * 2),
      format: "count",
      trend: series(() => 1),
      trend_label: "Devis émis par mois, 12 mois",
    },
    {
      key: "conversion",
      label: "Taux de signature",
      hint: "Devis acceptés ou facturés sur l'ensemble des devis, 12 mois glissants",
      value:
        lastYear.length === 0 ? 0 : Math.round((signedCount / lastYear.length) * 100),
      previous: null,
      note: `${signedCount} signés sur ${lastYear.length} devis`,
      format: "percent",
      trend: series((q) => (isSigned(q.project) ? 1 : 0)),
      trend_label: "Devis signés par mois, 12 mois",
    },
  ];

  // ---- Listes de travail ---------------------------------------------------

  const hot: HotRow[] = quotes
    .filter((q) => isPending(q.project) && q.days <= FRESH_DAYS)
    .map((q) => ({
      project_id: q.id,
      customer_id: q.customer.id,
      customer_name: q.customer.name,
      named: q.customer.named,
      reference: q.project.quote.ref,
      label: q.project.label,
      amount: q.amount,
      issued_at: q.project.quote.date,
      days_since: q.days,
      temperature: temperatureOf(q.days, q.amount),
      signals: hotSignals(q.customer, q.days, q.amount),
    }))
    .sort((a, b) => b.temperature - a.temperature)
    .slice(0, 6);

  const relanceAll = quotes
    .filter((q) => isPending(q.project) && q.days > FRESH_DAYS && q.days <= COLD_DAYS)
    .map((q) => ({
      project_id: q.id,
      customer_id: q.customer.id,
      customer_name: q.customer.name,
      customer_kind: q.customer.kind,
      named: q.customer.named,
      reference: q.project.quote.ref,
      label: q.project.label,
      amount: q.amount,
      issued_at: q.project.quote.date,
      days_since: q.days,
      urgency: urgencyOf(q.days, q.amount),
      reason: relanceReason(q.days, q.amount),
    }))
    .sort((a, b) => b.urgency - a.urgency);

  const relances: RelanceRow[] = relanceAll.slice(0, 12);

  // ---- Répartition par étape ----------------------------------------------

  const pipeline: StageBucket[] = STAGE_ORDER.map((stage) => {
    const bucket = quotes.filter((q) => q.project.stage === stage);
    return {
      stage,
      count: bucket.length,
      amount: Math.round(bucket.reduce((total, q) => total + q.amount, 0)),
    };
  }).filter((bucket) => bucket.count > 0);

  // ---- Répartition par taux de TVA ----------------------------------------

  const vatMap = new Map<number, VatBucket>();
  for (const quote of quotes) {
    const rate = dominantVat(quote.project.quote.vat);
    const meta = VAT_LABEL[rate] ?? { label: `${rate} %`, hint: "" };
    const entry = vatMap.get(rate) ?? {
      rate,
      label: meta.label,
      hint: meta.hint,
      count: 0,
      amount: 0,
    };
    entry.count += 1;
    entry.amount += quote.amount;
    vatMap.set(rate, entry);
  }
  const vat = [...vatMap.values()]
    .map((bucket) => ({ ...bucket, amount: Math.round(bucket.amount) }))
    .sort((a, b) => b.amount - a.amount);

  // ---- Synthèse par fiche --------------------------------------------------

  const digest: DigestRow[] = SEED_CUSTOMERS.map((customer) => {
    const mine = quotes.filter((q) => q.customer.id === customer.id);

    const scored = mine.map((q) => ({
      quote: q,
      temperature:
        isPending(q.project) && q.days <= FRESH_DAYS
          ? temperatureOf(q.days, q.amount)
          : 0,
      urgency:
        isPending(q.project) && q.days > FRESH_DAYS && q.days <= COLD_DAYS
          ? urgencyOf(q.days, q.amount)
          : 0,
    }));

    const temperature = Math.max(0, ...scored.map((s) => s.temperature));
    const urgency = Math.max(0, ...scored.map((s) => s.urgency));

    // La ligne est « portée » par un devis : le plus chaud, sinon le plus
    // urgent, sinon le plus récent. C'est lui qui donne l'intitulé et l'étape,
    // sans quoi la fiche annoncerait une étape et un intitulé sans rapport.
    const driver =
      scored.find((s) => s.temperature === temperature && temperature > 0) ??
      scored.find((s) => s.urgency === urgency && urgency > 0) ??
      scored.reduce((best, s) => (s.quote.days < best.quote.days ? s : best), scored[0]);

    const pendingRows = mine.filter((q) => isPending(q.project));
    const days = Math.min(...mine.map((q) => q.days));

    let health: Health;
    if (temperature > 0) health = "chaud";
    else if (urgency > 0) health = "a_relancer";
    else if (pendingRows.length > 0) health = "dormant";
    else health = "gagne";

    return {
      customer_id: customer.id,
      name: customer.name,
      named: customer.named,
      kind: customer.kind,
      status: customer.status,
      health,
      quotes: mine.length,
      pending_quotes: pendingRows.length,
      amount_pending: Math.round(pendingRows.reduce((t, q) => t + q.amount, 0)),
      amount_signed: Math.round(
        mine.filter((q) => isSigned(q.project)).reduce((t, q) => t + q.amount, 0),
      ),
      last_quote_at: driver.quote.project.quote.date,
      days_since: days,
      focus: driver.quote.project.label,
      focus_reference: driver.quote.project.quote.ref,
      stage: driver.quote.project.stage,
      temperature,
      urgency,
    } satisfies DigestRow;
  }).sort(
    (a, b) =>
      b.temperature - a.temperature ||
      b.urgency - a.urgency ||
      b.amount_pending - a.amount_pending,
  );

  // ---- Clients les plus engagés -------------------------------------------

  const topClients: TopClient[] = digest
    .map((row) => ({
      customer_id: row.customer_id,
      name: row.name,
      named: row.named,
      kind: row.kind,
      status: row.status,
      quotes: row.quotes,
      signed: row.amount_signed,
      pending: row.amount_pending,
      days_since: row.days_since,
    }))
    .sort((a, b) => b.signed + b.pending - (a.signed + a.pending))
    .slice(0, 8);

  // ---- Devis récents -------------------------------------------------------

  const activity: ActivityRow[] = quotes
    .slice()
    .sort((a, b) => a.days - b.days)
    .slice(0, 12)
    .map((q) => ({
      id: q.id,
      reference: q.project.quote.ref,
      at: q.project.quote.date,
      customer_id: q.customer.id,
      customer_name: q.customer.name,
      label: q.project.label,
      stage: q.project.stage,
      source_status: q.project.quote.sourceStatus,
      amount: q.amount,
    }));

  return {
    generated_at: at.toISOString(),
    source_date: EXPORT_DATE,
    source_file: EXPORT_FILE,
    period,
    metrics,
    relances,
    relances_total: relanceAll.length,
    hot,
    pipeline,
    digest,
    vat,
    top_clients: topClients,
    activity,
  };
}
