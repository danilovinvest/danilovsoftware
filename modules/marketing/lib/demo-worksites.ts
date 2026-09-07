import { ACTIVITY_BY_ID } from "@/modules/group";
import { SEED_WORKSITES, type SeedWorksite } from "./demo-seed";

/**
 * Le chantier de démonstration, tel que le marketing en a encore besoin.
 *
 * Ce type décrivait l'écran chantiers avant qu'il ne lise les vraies affaires
 * signées. Il reste ici parce que le marketing part d'un chantier **livré** :
 * durée, technique, avis client — trois choses que les données réelles ne
 * portent pas. Le jour où elles les porteront, ce fichier disparaîtra et
 * `modules/marketing` lira `modules/worksites` comme le reste du CRM.
 *
 * La forme vient du classeur « CYCLE CHANTIER ». Montants, coûts et jalons
 * sont inventés.
 */

/**
 * Où en est l'exécution.
 *
 * Cet axe est distinct de l'étape commerciale (`project_stage`). La vente et la
 * production n'avancent pas au même rythme : un devis signé peut rester six
 * semaines en attente de sondages sans que la vente recule d'un pas. C'est la
 * même leçon qu'en éclatant la colonne « Statut » du premier classeur.
 *
 * Le statut n'est **pas saisi** : il se déduit des dates et des jalons. Une
 * carte ne se déplace donc pas à la main — on renseigne une date, et elle
 * change de colonne toute seule.
 */
export type WorksiteStatus =
  | "a_planifier"
  | "planifie"
  | "en_cours"
  | "en_attente"
  | "reception"
  | "cloture";

/** Ce qui bloque, quand ça bloque. Repris des statuts d'étude du classeur. */
export type BlockedReason =
  | "elements"
  | "sondages"
  | "tiers"
  | "client"
  | "meteo";

/** État d'une étude, propre à l'ingénierie et indépendant de l'exécution. */
export type StudyStatus =
  | "en_cours"
  | "en_attente_elements"
  | "en_attente_sondages"
  | "termine";

export type CostKind = "sous_traitance" | "materiaux" | "autre";

/**
 * Une ligne de coût.
 *
 * Le classeur a une colonne « sous-traitant » et une colonne « coût
 * matériaux », parce qu'un tableur ne sait pas faire autrement. Une table de
 * lignes couvre les deux avec un seul concept — et accepte plusieurs
 * sous-traitants sur un même chantier, ce que la feuille ne permet pas.
 */
export type Cost = {
  id: string;
  kind: CostKind;
  label: string;
  /** Texte libre : aucun sous-traitant n'apparaît dans les données actuelles,
      une table de fournisseurs serait un objet à gérer pour rien. */
  supplier: string;
  amount_ht: number;
  paid_at: string | null;
};

/** Un règlement attendu : acompte ou solde. */
export type Payment = {
  label: string;
  amount_ttc: number;
  invoiced_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  reminded_at: string | null;
};

/** Un devis de l'affaire, avec l'activité — donc la société — qui l'émet. */
export type WorksiteQuote = {
  reference: string;
  label: string;
  activity_id: string;
  amount_ht: number;
  vat_rate: number;
  signed_at: string | null;
};

export type DemoWorksite = {
  id: string;
  reference: string;
  label: string;
  customer_id: string;
  customer_name: string;
  /** Vrai quand le client est une société du groupe : sort des statistiques
      commerciales et alimente les flux internes. */
  internal: boolean;
  city: string;
  address: string;
  owner_name: string;

  /** Activité pilote — celle qui exécute. Les devis peuvent en viser d'autres. */
  activity_id: string;
  entity_id: string;

  status: WorksiteStatus;
  blocked_reason: BlockedReason | null;
  study_status: StudyStatus | null;

  signed_at: string;
  starts_at: string | null;
  ends_at: string | null;
  /** Fin réelle. Nulle tant que les travaux ne sont pas terminés. */
  completed_at: string | null;
  /** Jours de retard sur la fin prévue. Calculé par le serveur. */
  days_late: number;
  /**
   * Jours écoulés depuis la signature.
   *
   * Calculé ici et non dans la carte : c'est la même raison que `days_late` —
   * l'ancienneté se lit sur l'instant de l'instantané, pas sur une horloge
   * relue à chaque rendu.
   */
  days_since_signature: number;

  amount_ht: number;
  costs: Cost[];
  /** Somme des coûts engagés. */
  cost_total: number;
  margin: number;
  margin_rate: number;

  deposit: Payment | null;
  balance: Payment | null;

  /** Jalons : une date renseignée vaut « fait », nulle vaut « à faire ». */
  pv_sent_at: string | null;
  pv_signed_at: string | null;
  review_requested_at: string | null;
  review_received_at: string | null;

  quotes: WorksiteQuote[];
};

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

function materialize(now: number): DemoWorksite[] {
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
      // Le décalage du seed est déjà un nombre de jours : le relire d'une date
      // qu'on vient de fabriquer ferait un aller-retour pour rien.
      days_since_signature: Math.max(0, seed.signed),
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
    } satisfies DemoWorksite;
  });
}

/**
 * Les chantiers livrés — matière première du module marketing.
 *
 * Un chantier terminé est une réalisation : ce qui a été fait, où, pour qui,
 * avec quelle technique et en combien de temps. Le marketing n'a rien à
 * ressaisir, il n'a qu'à rédiger.
 */
export function finishedWorksites(at: Date = new Date()): DemoWorksite[] {
  return materialize(at.getTime())
    .filter((worksite) => worksite.completed_at !== null)
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
}
