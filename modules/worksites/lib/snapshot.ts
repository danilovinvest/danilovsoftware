import { ACTIVITY_BY_ID } from "@/modules/group";
import type { Metric } from "@/shared/ui/metric-cards";
import { SEED_WORKSITES, type SeedWorksite } from "./seed";
import type {
  Alert,
  Cost,
  Payment,
  StatusBucket,
  Worksite,
  WorksiteSnapshot,
  WorksiteStatus,
} from "./types";
import { STATUS_ORDER } from "./labels";

/**
 * Fabrique de l'écran chantiers.
 *
 * Le principe qui gouverne tout le fichier : **le statut d'un chantier ne se
 * saisit pas, il se déduit**. Des dates et des jalons — signé, démarré,
 * terminé, PV signé, solde encaissé. C'est la même règle que `is_overdue` sur
 * les tâches : l'horloge d'un poste ne décide pas de ce qui est en retard, et
 * personne n'a à penser à faire glisser une carte.
 *
 * Conséquence directe pour l'interface : le tableau n'est pas déplaçable. On
 * renseigne une date, la carte change de colonne.
 */

const DAY = 86_400_000;

/** Les décalages du jeu de démonstration : positifs dans le passé. */
function iso(now: number, daysAgo: number | undefined): string | null {
  if (daysAgo === undefined) return null;
  return new Date(now - daysAgo * DAY).toISOString();
}

function daysSince(now: number, value: string | null): number {
  if (value === null) return 0;
  return Math.round((now - new Date(value).getTime()) / DAY);
}

function payment(
  now: number,
  label: string,
  seed: SeedWorksite["deposit"],
): Payment | null {
  if (!seed) return null;
  return {
    label,
    amount_ttc: seed.ttc,
    invoiced_at: iso(now, seed.invoiced),
    due_at: iso(now, seed.due),
    paid_at: iso(now, seed.paid),
    reminded_at: iso(now, seed.reminded),
  };
}

/**
 * Un chantier de travaux se réceptionne, une étude se rend.
 *
 * Le PV et l'avis client ne s'appliquent qu'aux travaux : les exiger sur une
 * étude ferait apparaître des jalons manquants qui ne manquent pas.
 */
function needsPv(activityId: string): boolean {
  return ACTIVITY_BY_ID.get(activityId)?.kind === "travaux";
}

function statusOf(
  seed: SeedWorksite,
  closed: boolean,
  now: number,
): WorksiteStatus {
  if (closed) return "cloture";
  if (seed.completed !== undefined) return "reception";
  if (seed.blocked !== undefined) return "en_attente";
  if (seed.starts === undefined) return "a_planifier";
  const start = now - seed.starts * DAY;
  return start <= now ? "en_cours" : "planifie";
}

function materialize(now: number): Worksite[] {
  return SEED_WORKSITES.map((seed) => {
    const activity = ACTIVITY_BY_ID.get(seed.activity);

    const costs: Cost[] = (seed.costs ?? []).map((cost, index) => ({
      id: `${seed.id}-c${index + 1}`,
      kind: cost.kind,
      label: cost.label,
      supplier: cost.supplier,
      amount_ht: cost.ht,
      paid_at: iso(now, cost.paid),
    }));
    const costTotal = costs.reduce((total, cost) => total + cost.amount_ht, 0);

    const deposit = payment(now, "Acompte", seed.deposit);
    const balance = payment(now, "Solde", seed.balance);

    const pvSigned = iso(now, seed.pvSigned);
    const completed = iso(now, seed.completed);

    // Terminé ≠ clôturé : il faut le PV signé (sur des travaux) et le solde
    // encaissé. C'est la chaîne que décrit le classeur, et l'endroit exact où
    // la trésorerie se bloque.
    const closed =
      completed !== null &&
      (!needsPv(seed.activity) || pvSigned !== null) &&
      (balance === null || balance.paid_at !== null);

    const endsAt = iso(now, seed.ends);
    const lateDays =
      completed === null && endsAt !== null ? Math.max(0, daysSince(now, endsAt)) : 0;

    return {
      id: seed.id,
      reference: seed.ref,
      label: seed.label,
      customer_id: seed.customerId,
      customer_name: seed.customer,
      internal: seed.internal ?? false,
      city: seed.city,
      address: seed.address,
      owner_name: seed.owner,
      activity_id: seed.activity,
      entity_id: activity?.entity_id ?? "",
      status: statusOf(seed, closed, now),
      blocked_reason: seed.blocked ?? null,
      study_status: seed.study ?? null,
      signed_at: iso(now, seed.signed) ?? new Date(now).toISOString(),
      starts_at: iso(now, seed.starts),
      ends_at: endsAt,
      completed_at: completed,
      days_late: lateDays,
      amount_ht: seed.ht,
      costs,
      cost_total: costTotal,
      margin: seed.ht - costTotal,
      margin_rate: seed.ht === 0 ? 0 : Math.round(((seed.ht - costTotal) / seed.ht) * 100),
      deposit,
      balance,
      pv_sent_at: iso(now, seed.pvSent),
      pv_signed_at: pvSigned,
      review_requested_at: iso(now, seed.reviewAsked),
      review_received_at: iso(now, seed.reviewGot),
      quotes: seed.quotes.map((quote) => ({
        reference: quote.ref,
        label: quote.label,
        activity_id: quote.activity,
        amount_ht: quote.ht,
        vat_rate: quote.vat,
        signed_at: iso(now, quote.signed),
      })),
    } satisfies Worksite;
  });
}

function monthBucket(now: Date, value: string): number {
  const date = new Date(value);
  const distance =
    (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
  return 11 - distance;
}

export function buildWorksiteSnapshot(
  entityId: string | null,
  activityId: string | null,
  at: Date = new Date(),
): WorksiteSnapshot {
  const now = at.getTime();
  const all = materialize(now);

  const scoped = all.filter((worksite) => {
    if (activityId !== null) return worksite.activity_id === activityId;
    if (entityId !== null) return worksite.entity_id === entityId;
    return true;
  });

  const open = scoped.filter((w) => w.status !== "cloture");
  // Le chiffre commercial exclut ce que le groupe se facture à lui-même : dans
  // l'export réel, 55 059 € d'autoliquidation sont aujourd'hui comptés comme
  // du chiffre client, ce qui fausse tout.
  const external = open.filter((w) => !w.internal);

  const withCosts = scoped.filter((w) => w.cost_total > 0);
  const marginRate =
    withCosts.length === 0
      ? 0
      : Math.round(
          (withCosts.reduce((t, w) => t + w.margin, 0) /
            withCosts.reduce((t, w) => t + w.amount_ht, 0)) *
            100,
        );

  const lateList = scoped.filter((w) => w.days_late > 0);
  const unpaidBalance = scoped.filter(
    (w) => w.balance !== null && w.balance.paid_at === null,
  );

  const series = (pick: (w: Worksite) => number) => {
    const points = Array.from({ length: 12 }, () => 0);
    for (const worksite of scoped) {
      const bucket = monthBucket(at, worksite.signed_at);
      if (bucket >= 0 && bucket < 12) points[bucket] += pick(worksite);
    }
    return points;
  };

  const metrics: Metric[] = [
    {
      key: "running",
      label: "En exécution",
      hint: "Montant HT des chantiers non clôturés, hors facturation interne au groupe",
      value: Math.round(external.reduce((t, w) => t + w.amount_ht, 0)),
      previous: null,
      note: `${external.length} chantiers ouverts`,
      format: "amount",
      trend: series((w) => w.amount_ht),
      trend_label: "Montant signé par mois, 12 mois",
    },
    {
      key: "margin",
      label: "Marge moyenne",
      hint: "Sur les chantiers dont des coûts sont saisis — sous-traitance et matériaux",
      value: marginRate,
      previous: null,
      note: `${withCosts.length} chantiers chiffrés sur ${scoped.length}`,
      format: "percent",
      trend: series((w) => w.margin),
      trend_label: "Marge par mois de signature, 12 mois",
    },
    {
      key: "late",
      label: "En retard",
      hint: "Chantiers dont la date de fin prévue est dépassée et qui ne sont pas terminés",
      value: lateList.length,
      previous: null,
      note:
        lateList.length === 0
          ? "Aucun dépassement"
          : `jusqu'à ${Math.max(...lateList.map((w) => w.days_late))} jours`,
      format: "count",
      trend: series(() => 1),
      trend_label: "Chantiers signés par mois, 12 mois",
    },
    {
      key: "balance",
      label: "Solde à encaisser",
      hint: "Soldes non réglés, facturés ou non",
      value: Math.round(
        unpaidBalance.reduce((t, w) => t + (w.balance?.amount_ttc ?? 0), 0),
      ),
      previous: null,
      note: `${unpaidBalance.length} chantiers concernés`,
      format: "amount",
      trend: series((w) =>
        w.balance !== null && w.balance.paid_at === null ? w.balance.amount_ttc : 0,
      ),
      trend_label: "Solde en attente par mois de signature, 12 mois",
    },
  ];

  const board: StatusBucket[] = STATUS_ORDER.map((status) => {
    const bucket = scoped.filter((w) => w.status === status);
    return {
      status,
      count: bucket.length,
      amount: Math.round(bucket.reduce((t, w) => t + w.amount_ht, 0)),
    };
  });

  const alert = (w: Worksite, reason: string, days: number, amount: number): Alert => ({
    worksite_id: w.id,
    label: w.label,
    customer_name: w.customer_name,
    reason,
    amount,
    days,
  });

  const late = lateList
    .map((w) =>
      alert(
        w,
        `${w.days_late} jours au-delà de la fin prévue${w.blocked_reason ? ", chantier bloqué" : ""}`,
        w.days_late,
        w.amount_ht,
      ),
    )
    .sort((a, b) => b.days - a.days);

  const pvPending = scoped
    .filter((w) => w.completed_at !== null && needsPv(w.activity_id) && w.pv_signed_at === null)
    .map((w) => {
      const days = daysSince(now, w.completed_at);
      return alert(
        w,
        w.pv_sent_at === null
          ? `Travaux terminés depuis ${days} jours, PV non envoyé`
          : `PV envoyé il y a ${daysSince(now, w.pv_sent_at)} jours, toujours pas signé`,
        days,
        w.amount_ht,
      );
    })
    .sort((a, b) => b.days - a.days);

  // L'argent qui dort : les travaux sont finis, le PV est signé, et la facture
  // de solde n'est pas partie.
  const balanceToInvoice = scoped
    .filter(
      (w) =>
        w.completed_at !== null &&
        (!needsPv(w.activity_id) || w.pv_signed_at !== null) &&
        w.balance !== null &&
        w.balance.invoiced_at === null,
    )
    .map((w) =>
      alert(
        w,
        `Réception acquise depuis ${daysSince(now, w.pv_signed_at ?? w.completed_at)} jours, solde non facturé`,
        daysSince(now, w.pv_signed_at ?? w.completed_at),
        w.balance?.amount_ttc ?? 0,
      ),
    )
    .sort((a, b) => b.amount - a.amount);

  const reviewToRequest = scoped
    .filter(
      (w) =>
        w.status === "cloture" && needsPv(w.activity_id) && w.review_requested_at === null,
    )
    .map((w) =>
      alert(
        w,
        `Clôturé depuis ${daysSince(now, w.completed_at)} jours, avis client non demandé`,
        daysSince(now, w.completed_at),
        w.amount_ht,
      ),
    )
    .sort((a, b) => a.days - b.days);

  return {
    generated_at: at.toISOString(),
    entity_id: entityId,
    activity_id: activityId,
    metrics,
    worksites: scoped
      .slice()
      .sort(
        (a, b) =>
          STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
          b.days_late - a.days_late ||
          b.amount_ht - a.amount_ht,
      ),
    board,
    late,
    pv_pending: pvPending,
    balance_to_invoice: balanceToInvoice,
    review_to_request: reviewToRequest,
  };
}
