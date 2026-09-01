import { STAGE_ORDER, isPaused } from "@/modules/customers";
import type { ProjectStage } from "@/modules/customers";
import {
  SEED_AGENDA,
  SEED_CUSTOMERS,
  SEED_OWNERS,
  SEED_TASKS,
  type SeedCustomer,
  type SeedProject,
} from "./seed";
import type {
  ActivityRow,
  AgendaEvent,
  CashRow,
  DashboardSnapshot,
  DigestRow,
  Health,
  HotRow,
  Metric,
  Period,
  RelanceRow,
  SourceBucket,
  StageBucket,
  WorkloadRow,
} from "./types";

/**
 * Fabrique du tableau de bord à partir du jeu de démonstration.
 *
 * Tout ce que cet écran affiche est calculé ici, en un seul endroit et à
 * partir d'une seule source. C'est ce qui rend les panneaux cohérents entre
 * eux — et c'est aussi le brouillon du futur endpoint : ces règles sont
 * destinées à passer côté serveur, pas à rester dans le navigateur. Un score
 * de priorité calculé sur le poste de chacun n'est pas partageable, et il
 * changerait selon l'heure du poste.
 */

const DAY = 86_400_000;

const WINDOW: Record<Period, number> = { "30j": 30, "90j": 90, "12m": 365 };

/**
 * Délai au-delà duquel une affaire immobile à cette étape doit être relancée.
 *
 * Ce n'est pas un seuil d'automatisme — le CRM n'en a pas, la relance reste un
 * clic humain. C'est le seuil qui décide de la place d'une affaire dans la
 * liste de travail du matin.
 */
const RELANCE_THRESHOLD: Record<ProjectStage, number | null> = {
  demande_recue: 2,
  qualification: 5,
  rdv_planifie: 5,
  etude_a_produire: 14,
  proposition_envoyee: 10,
  devis_envoye: 8,
  gagne: 30,
  realise: null,
};

/** Ce qu'il reste à faire à cette étape, formulé à l'impératif. */
const NEXT_ACTION: Record<ProjectStage, string> = {
  demande_recue: "Qualifier la demande",
  qualification: "Planifier la visite technique",
  rdv_planifie: "Confirmer le rendez-vous",
  etude_a_produire: "Produire et remettre l'étude",
  proposition_envoyee: "Relancer la proposition",
  devis_envoye: "Relancer le devis",
  gagne: "Lancer l'exécution",
  realise: "Facturer le solde",
};

/** Le dernier échange, tel qu'il apparaît dans le fil d'activité. */
const LAST_CONTACT: Record<ProjectStage, { kind: ActivityRow["kind"]; summary: string }> = {
  demande_recue: { kind: "email", summary: "Demande reçue" },
  qualification: { kind: "appel", summary: "Appel de qualification" },
  rdv_planifie: { kind: "rdv", summary: "Rendez-vous fixé sur site" },
  etude_a_produire: { kind: "note", summary: "Point d'avancement de l'étude" },
  proposition_envoyee: { kind: "email", summary: "Proposition transmise" },
  devis_envoye: { kind: "devis", summary: "Devis transmis" },
  gagne: { kind: "note", summary: "Affaire signée" },
  realise: { kind: "rapport", summary: "Rapport remis" },
};

/** Position de l'étape dans le pipeline, ramenée entre 0 et 1. */
function advancement(stage: ProjectStage): number {
  const index = STAGE_ORDER.indexOf(stage);
  return index < 0 ? 0 : index / (STAGE_ORDER.length - 1);
}

/** Une affaire close ne se relance pas ; une affaire suspendue, si — plus tard. */
function isClosed(project: SeedProject): boolean {
  return project.outcome !== null && !isPaused(project.outcome);
}

/**
 * Affaire encore en cours.
 *
 * « Réalisé » en est exclu : l'étude est remise, l'argent est signé, il n'y a
 * plus rien à piloter. La garder dans les affaires ouvertes gonflerait le
 * pipeline d'un montant qui n'est plus en jeu, et ferait dire à la synthèse
 * « relancer le devis » sur un dossier terminé.
 */
function isActive(project: SeedProject): boolean {
  return !isClosed(project) && project.stage !== "realise";
}

/** Étapes du pipeline : celles qu'il reste à franchir. */
const PIPELINE_STAGES = STAGE_ORDER.filter((stage) => stage !== "realise");

/**
 * Une intervention ne se planifie pas un dimanche. Les échéances tombant sur
 * un week-end glissent au lundi — sans quoi la démonstration afficherait des
 * réunions de chantier le samedi une semaine sur trois.
 */
function toWorkday(date: Date): Date {
  const day = date.getDay();
  if (day === 6) date.setDate(date.getDate() + 2);
  if (day === 0) date.setDate(date.getDate() + 1);
  return date;
}

/** Montant en jeu : la somme des devis vivants, ou 0 si rien n'est chiffré. */
function stake(project: SeedProject): number {
  return project.quotes
    .filter((quote) => quote.status !== "refuse" && quote.status !== "annule")
    .reduce((total, quote) => total + quote.amount, 0);
}

/**
 * Seuil effectif : une affaire suspendue (stand by, tiers attendu) laisse deux
 * fois plus de temps avant de remonter dans la liste. Sans cela, mettre une
 * affaire en attente ne servirait à rien — elle réapparaîtrait dès le
 * lendemain.
 */
function threshold(project: SeedProject): number | null {
  const base = RELANCE_THRESHOLD[project.stage];
  if (base === null) return null;
  return isPaused(project.outcome) ? base * 2 : base;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Urgence de relance, 0-100.
 *
 * Trois facteurs, dans cet ordre de poids : le retard *relatif* au seuil de
 * l'étape (huit jours sans réponse sur un devis pèsent plus que huit jours sur
 * une étude en cours), l'enjeu financier, et l'avancement — perdre une affaire
 * au stade du devis coûte le travail déjà fait.
 *
 * Deux corrections à la baisse : au-delà de trois relances sans réponse le
 * signal s'épuise, et une affaire suspendue attend quelque chose qui ne dépend
 * pas de nous.
 */
function urgencyOf(project: SeedProject): number {
  const limit = threshold(project);
  if (limit === null) return 0;

  const lateness = Math.min(project.lastContact / limit, 3) / 3;
  const money = Math.min(stake(project) / 25000, 1);

  let score = 100 * (0.55 * lateness + 0.28 * money + 0.17 * advancement(project.stage));
  if (project.reminders >= 3) score -= 12;
  if (isPaused(project.outcome)) score -= 20;
  return clamp(score);
}

/**
 * Température, 0-100 : à quel point l'affaire est près de basculer.
 *
 * Symétrique de l'urgence — l'avancement et l'enjeu pèsent pareil, mais c'est
 * la *fraîcheur* du dernier échange qui remplace le retard.
 */
function temperatureOf(project: SeedProject): number {
  const freshness = 1 - Math.min(project.lastContact / 21, 1);
  const money = Math.min(stake(project) / 25000, 1);
  return clamp(
    100 * (0.4 * advancement(project.stage) + 0.35 * freshness + 0.25 * money),
  );
}

/** Une affaire en retard n'est pas « chaude », quel que soit son montant. */
function isLate(project: SeedProject): boolean {
  const limit = threshold(project);
  return limit !== null && project.lastContact >= limit;
}

function isHotCandidate(project: SeedProject): boolean {
  if (isClosed(project) || isPaused(project.outcome)) return false;
  if (project.stage === "gagne" || project.stage === "realise") return false;
  return !isLate(project);
}

/** Pourquoi cette ligne est en tête, en une phrase lisible sans le score. */
function relanceReason(project: SeedProject): string {
  const late = project.lastContact;
  if (isPaused(project.outcome)) {
    return `Suspendue depuis ${late} jours — vérifier si le blocage est levé`;
  }
  if (project.reminders >= 3) {
    return `${project.reminders} relances sans réponse depuis ${late} jours`;
  }
  if (project.reminders > 0) {
    return `Relancé ${project.reminders} fois, silence depuis ${late} jours`;
  }
  if (project.stage === "demande_recue") {
    return `Demande reçue il y a ${late} jours, jamais qualifiée`;
  }
  return `Aucun échange depuis ${late} jours`;
}

function hotSignals(customer: SeedCustomer, project: SeedProject): string[] {
  const signals: string[] = [];
  const money = stake(project);

  if (project.lastContact <= 3) signals.push("Échange il y a moins de 3 jours");
  if (money >= 20000) signals.push("Enjeu à cinq chiffres");
  if (project.stage === "devis_envoye") signals.push("Devis chez le client");
  if (project.stage === "proposition_envoyee") signals.push("Proposition transmise");
  if (project.stage === "rdv_planifie") signals.push("Visite programmée");
  if (project.stage === "etude_a_produire") signals.push("Étude déjà commandée");
  if (customer.status === "client") signals.push("Client qui a déjà signé");
  if (customer.source === "recommandation") signals.push("Venu par recommandation");
  if (project.reminders === 0 && project.stage !== "demande_recue") {
    signals.push("Avance sans relance");
  }
  return signals.slice(0, 3);
}

function iso(now: number, daysAgo: number, hour = 10): string {
  const date = new Date(now - daysAgo * DAY);
  date.setHours(hour, daysAgo % 2 === 0 ? 15 : 40, 0, 0);
  return date.toISOString();
}

/** Index de bucket mensuel : 11 = mois courant, 0 = il y a onze mois. */
function monthBucket(now: Date, daysAgo: number): number {
  const date = new Date(now.getTime() - daysAgo * DAY);
  const distance =
    (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
  return 11 - distance;
}

function monthlySeries(
  now: Date,
  entries: Array<{ daysAgo: number; value: number }>,
): number[] {
  const series = Array.from({ length: 12 }, () => 0);
  for (const entry of entries) {
    const bucket = monthBucket(now, entry.daysAgo);
    if (bucket >= 0 && bucket < 12) series[bucket] += entry.value;
  }
  return series;
}

export function buildSnapshot(period: Period, at: Date = new Date()): DashboardSnapshot {
  const now = at.getTime();
  const window = WINDOW[period];

  const projects = SEED_CUSTOMERS.flatMap((customer) =>
    customer.projects.map((project, index) => ({
      customer,
      project,
      id: `${customer.id}-p${index + 1}`,
    })),
  );
  const open = projects.filter(({ project }) => isActive(project));
  const quotes = projects.flatMap(({ customer, project, id }) =>
    project.quotes.map((quote) => ({ customer, project, quote, projectId: id })),
  );

  // ---- Compteurs -----------------------------------------------------------

  const signedIn = (from: number, to: number) =>
    quotes
      .filter(
        ({ quote }) =>
          (quote.status === "accepte" || quote.status === "realise") &&
          quote.issued > from &&
          quote.issued <= to,
      )
      .reduce((total, { quote }) => total + quote.amount, 0);

  const requestsIn = (from: number, to: number) =>
    SEED_CUSTOMERS.filter((c) => c.requested > from && c.requested <= to).length;

  const pending = quotes
    .filter(({ quote }) => quote.status === "envoye")
    .reduce((total, { quote }) => total + quote.amount, 0);

  // Le taux de signature se lit sur douze mois glissants quelle que soit la
  // période : sur trente jours, deux affaires tranchées donneraient 0 % ou
  // 50 % — un chiffre exact et sans aucun sens.
  const decided = projects.filter(
    ({ project }) =>
      project.started <= 365 &&
      (project.stage === "gagne" || project.stage === "realise" || isClosed(project)),
  );
  const won = decided.filter(
    ({ project }) => project.stage === "gagne" || project.stage === "realise",
  ).length;

  const metrics: Metric[] = [
    {
      key: "signed",
      label: "Signé",
      hint: `Devis acceptés ou réalisés sur ${window} jours`,
      value: signedIn(0, window),
      previous: signedIn(window, window * 2),
      format: "amount",
      trend: monthlySeries(
        at,
        quotes
          .filter(
            ({ quote }) => quote.status === "accepte" || quote.status === "realise",
          )
          .map(({ quote }) => ({ daysAgo: quote.issued, value: quote.amount })),
      ),
      trend_label: "Montant signé par mois, 12 mois",
    },
    {
      key: "pending",
      label: "En attente de réponse",
      hint: "Devis envoyés que le client n'a pas encore tranchés, à ce jour",
      value: pending,
      previous: null,
      note: "Encours — se lit à l'instant t",
      format: "amount",
      trend: monthlySeries(
        at,
        quotes.map(({ quote }) => ({ daysAgo: quote.issued, value: quote.amount })),
      ),
      trend_label: "Montant des devis émis par mois, 12 mois",
    },
    {
      key: "inbound",
      label: "Nouvelles demandes",
      hint: `Fiches dont la demande est arrivée sur ${window} jours`,
      value: requestsIn(0, window),
      previous: requestsIn(window, window * 2),
      format: "count",
      trend: monthlySeries(
        at,
        SEED_CUSTOMERS.map((c) => ({ daysAgo: c.requested, value: 1 })),
      ),
      trend_label: "Demandes reçues par mois, 12 mois",
    },
    {
      key: "conversion",
      label: "Taux de signature",
      hint: "Affaires gagnées parmi les affaires tranchées, 12 mois glissants",
      value: decided.length === 0 ? 0 : Math.round((won / decided.length) * 100),
      previous: null,
      note: `${won} gagnées sur ${decided.length} affaires tranchées`,
      format: "percent",
      trend: monthlySeries(
        at,
        projects
          .filter(
            ({ project }) => project.stage === "gagne" || project.stage === "realise",
          )
          .map(({ project }) => ({ daysAgo: project.started, value: 1 })),
      ),
      trend_label: "Affaires gagnées par mois, 12 mois",
    },
  ];

  // ---- Listes de travail ---------------------------------------------------

  const relances: RelanceRow[] = open
    .filter(({ project }) => isLate(project))
    .map(({ customer, project, id }) => ({
      project_id: id,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_kind: customer.kind,
      label: project.label,
      city: project.city,
      stage: project.stage,
      outcome: project.outcome,
      amount: stake(project),
      last_contact_at: iso(now, project.lastContact),
      days_since: project.lastContact,
      threshold: threshold(project) ?? 0,
      reminders: project.reminders,
      owner_name: customer.owner,
      phone: customer.phone,
      urgency: urgencyOf(project),
      reason: relanceReason(project),
      next_action: isPaused(project.outcome)
        ? "Reprendre contact — affaire suspendue"
        : NEXT_ACTION[project.stage],
    }))
    .sort((a, b) => b.urgency - a.urgency);

  const hot: HotRow[] = open
    .filter(({ project }) => isHotCandidate(project))
    .map(({ customer, project, id }) => ({
      project_id: id,
      customer_id: customer.id,
      customer_name: customer.name,
      label: project.label,
      city: project.city,
      stage: project.stage,
      amount: stake(project),
      last_contact_at: iso(now, project.lastContact),
      days_since: project.lastContact,
      owner_name: customer.owner,
      temperature: temperatureOf(project),
      signals: hotSignals(customer, project),
      next_action: NEXT_ACTION[project.stage],
    }))
    .sort((a, b) => b.temperature - a.temperature)
    .slice(0, 6);

  // ---- Pipeline ------------------------------------------------------------

  const pipeline: StageBucket[] = PIPELINE_STAGES.map((stage) => {
    const bucket = open.filter(({ project }) => project.stage === stage);
    return {
      stage,
      count: bucket.length,
      amount: bucket.reduce((total, { project }) => total + stake(project), 0),
    };
  });

  // ---- Origine des demandes, sur douze mois --------------------------------

  const sourceMap = new Map<string, SourceBucket>();
  for (const customer of SEED_CUSTOMERS) {
    if (customer.requested > 365) continue;
    const entry = sourceMap.get(customer.source) ?? {
      source: customer.source,
      requests: 0,
      won: 0,
      amount: 0,
    };
    entry.requests += 1;
    const hasWon = customer.projects.some(
      (p) => p.stage === "gagne" || p.stage === "realise",
    );
    if (hasWon) entry.won += 1;
    entry.amount += customer.projects
      .flatMap((p) => p.quotes)
      .filter((q) => q.status === "accepte" || q.status === "realise")
      .reduce((total, q) => total + q.amount, 0);
    sourceMap.set(customer.source, entry);
  }
  const sources = [...sourceMap.values()].sort((a, b) => b.requests - a.requests);

  // ---- Encaissements et réponses attendues ---------------------------------

  const cash: CashRow[] = quotes
    .map(({ customer, project, quote }) => {
      let waiting: CashRow["waiting_for"] | null = null;
      if (quote.status === "envoye") waiting = "reponse";
      else if (quote.status === "accepte" && quote.deposit === "en_attente")
        waiting = "acompte";
      else if (
        (quote.status === "accepte" || quote.status === "realise") &&
        quote.balance === "en_attente"
      )
        waiting = "solde";
      if (waiting === null) return null;

      return {
        quote_id: quote.ref,
        reference: quote.ref,
        customer_name: customer.name,
        label: project.label,
        amount: quote.amount,
        issued_at: iso(now, quote.issued),
        days_since: quote.issued,
        status: quote.status,
        deposit: quote.deposit,
        balance: quote.balance,
        waiting_for: waiting,
      } satisfies CashRow;
    })
    .filter((row): row is CashRow => row !== null)
    .sort((a, b) => b.days_since - a.days_since);

  // ---- Fil d'activité ------------------------------------------------------

  const activity: ActivityRow[] = [
    ...projects.map(({ customer, project, id }) => {
      const late = isLate(project) && project.reminders > 0;
      const entry = LAST_CONTACT[project.stage];
      return {
        id: `${id}-contact`,
        kind: late ? ("relance" as const) : entry.kind,
        at: iso(now, project.lastContact, 11),
        customer_id: customer.id,
        customer_name: customer.name,
        summary: late
          ? `Relance sans réponse — ${project.label}`
          : `${entry.summary} — ${project.label}`,
        author_name: customer.owner,
      };
    }),
    ...quotes.map(({ customer, quote, projectId }) => ({
      id: `${projectId}-${quote.ref}`,
      kind: "devis" as const,
      at: iso(now, quote.issued, 16),
      customer_id: customer.id,
      customer_name: customer.name,
      summary: `Devis ${quote.ref} envoyé`,
      author_name: customer.owner,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 12);

  // ---- Synthèse par fiche --------------------------------------------------

  const digest: DigestRow[] = SEED_CUSTOMERS.map((customer) => {
    const all = customer.projects;
    const alive = all.filter((project) => isActive(project));

    const scored = alive.map((project) => ({
      project,
      urgency: isLate(project) ? urgencyOf(project) : 0,
      temperature: isHotCandidate(project) ? temperatureOf(project) : 0,
    }));

    const urgency = Math.max(0, ...scored.map((s) => s.urgency));
    const temperature = Math.max(0, ...scored.map((s) => s.temperature));
    const driver =
      scored.find((s) => s.urgency === urgency && urgency > 0) ??
      scored.find((s) => s.temperature === temperature && temperature > 0) ??
      scored[0];

    const lastContact = all.length
      ? Math.min(...all.map((project) => project.lastContact))
      : null;
    const amountWon = all
      .flatMap((project) => project.quotes)
      .filter((quote) => quote.status === "accepte" || quote.status === "realise")
      .reduce((total, quote) => total + quote.amount, 0);

    // Le signal le plus fort l'emporte, et « à relancer » passe avant « chaud » :
    // une fiche qui demande une action aujourd'hui ne doit pas être rangée
    // parmi celles qui vont bien.
    //
    // Le seuil est le même que celui du panneau des relances — une affaire
    // au-delà du délai de son étape — pour que les deux comptages s'accordent.
    let health: Health;
    if (urgency > 0) health = "a_relancer";
    else if (temperature >= 55) health = "chaud";
    else if (alive.length === 0 && amountWon > 0) health = "gagne";
    else if (alive.length === 0 || (lastContact ?? 0) > 60) health = "dormant";
    else health = "en_cours";

    const stage =
      alive.length === 0
        ? null
        : alive
            .map((project) => project.stage)
            .sort((a, b) => STAGE_ORDER.indexOf(b) - STAGE_ORDER.indexOf(a))[0];

    return {
      customer_id: customer.id,
      name: customer.name,
      kind: customer.kind,
      status: customer.status,
      city: customer.city,
      owner_name: customer.owner,
      health,
      open_projects: alive.length,
      amount_open: alive.reduce((total, project) => total + stake(project), 0),
      amount_won: amountWon,
      last_contact_at: lastContact === null ? null : iso(now, lastContact),
      days_since: lastContact,
      next_action: driver
        ? isPaused(driver.project.outcome)
          ? "Reprendre contact — affaire suspendue"
          : NEXT_ACTION[driver.project.stage]
        : "Aucune affaire ouverte",
      stage,
      temperature,
      urgency,
    } satisfies DigestRow;
  }).sort(
    (a, b) =>
      b.urgency - a.urgency || b.temperature - a.temperature || b.amount_open - a.amount_open,
  );

  // ---- Charge par collaborateur -------------------------------------------

  const workload: WorkloadRow[] = SEED_OWNERS.map((owner) => {
    const mine = open.filter(({ customer }) => customer.owner === owner);
    return {
      owner_name: owner,
      open_projects: mine.length,
      late_relances: mine.filter(({ project }) => isLate(project)).length,
      amount_open: mine.reduce((total, { project }) => total + stake(project), 0),
      open_tasks: SEED_TASKS[owner]?.open ?? 0,
      overdue_tasks: SEED_TASKS[owner]?.overdue ?? 0,
    };
  }).sort((a, b) => b.open_projects - a.open_projects);

  // ---- Agenda --------------------------------------------------------------

  const agenda: AgendaEvent[] = SEED_AGENDA.map((event) => {
    const date = toWorkday(new Date(now + event.inDays * DAY));
    date.setHours(event.hour, event.inDays % 2 === 0 ? 15 : 40, 0, 0);
    return {
      id: event.id,
      at: date.toISOString(),
      kind: event.kind,
      label: event.label,
      customer_name: event.customer,
      owner_name: event.owner,
    };
  }).sort((a, b) => a.at.localeCompare(b.at));

  return {
    generated_at: at.toISOString(),
    period,
    metrics,
    relances,
    hot,
    pipeline,
    agenda,
    digest,
    sources,
    cash,
    activity,
    workload,
  };
}
