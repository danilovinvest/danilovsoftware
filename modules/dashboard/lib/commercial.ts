import type { AwaitingQuotes, SalesSummary } from "@/modules/customers";
import type { Metric } from "@/shared/ui/metric-cards";

/**
 * Les compteurs commerciaux du tableau de bord, lus de la base (01/10).
 *
 * Ils se lisaient dans un export figé du 1er septembre. Les mois viennent du
 * serveur (`GET /v1/sales`), et la fenêtre courte est **les trois derniers mois
 * civils**, mois courant compris — le serveur compte par mois d'émission, et
 * une fenêtre glissante au jour près demanderait de recompter devis par devis.
 * Le montant en attente vient de la liste des devis sans réponse, fiches
 * archivées écartées comme sur son écran.
 *
 * Module **pur**.
 */

const SHORT = 3;

function amount(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function sum(values: number[]): number {
  return Math.round(values.reduce((a, b) => a + b, 0) * 100) / 100;
}

export function commercialMetrics(sales: SalesSummary, awaiting: AwaitingQuotes | null): Metric[] {
  const months = sales.months;
  const recent = months.slice(-SHORT);
  const before = months.slice(-SHORT * 2, -SHORT);
  const issued12 = sum(months.map((m) => m.issued));
  const signed12 = sum(months.map((m) => m.signed));
  const pending = awaiting?.items.filter((q) => !q.archived) ?? null;
  const pendingAmount =
    pending === null ? 0 : sum(pending.map((q) => amount(q.amount_ttc ?? q.amount_ht ?? "0")));

  return [
    {
      key: "signed",
      label: "Signé",
      hint: "Devis acceptés ou réalisés, émis sur les trois derniers mois civils (TTC, HT à défaut)",
      value: sum(recent.map((m) => amount(m.signed_amount))),
      previous: sum(before.map((m) => amount(m.signed_amount))),
      format: "amount",
      trend: months.map((m) => amount(m.signed_amount)),
      trend_label: "Signé par mois d'émission, 12 mois",
    },
    {
      key: "pending",
      label: "En attente de réponse",
      hint: "Devis envoyés, ni signés ni refusés, hors fiches archivées",
      value: pendingAmount,
      previous: null,
      note: pending === null ? "Non lu" : `${pending.length} devis`,
      format: "amount",
      trend: months.map((m) => m.pending),
      trend_label: "Devis encore en attente, par mois d'émission",
    },
    {
      key: "issued",
      label: "Devis émis",
      hint: "Devis émis sur les trois derniers mois civils",
      value: sum(recent.map((m) => m.issued)),
      previous: sum(before.map((m) => m.issued)),
      format: "count",
      trend: months.map((m) => m.issued),
      trend_label: "Devis émis par mois, 12 mois",
    },
    {
      key: "conversion",
      label: "Taux de signature",
      hint: "Devis signés sur devis émis, douze mois glissants",
      value: issued12 === 0 ? 0 : Math.round((signed12 / issued12) * 100),
      previous: null,
      note: `${signed12} signés sur ${issued12} devis`,
      format: "percent",
      trend: months.map((m) => m.signed),
      trend_label: "Devis signés par mois, 12 mois",
    },
  ];
}
