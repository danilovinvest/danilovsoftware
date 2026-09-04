import type {
  Interaction,
  PaymentStatus,
  ProjectOutcome,
  ProjectStage,
  Quote,
} from "./types";
import { isPaused, PROJECT_OUTCOME, type Tone } from "./labels";
import type { Jalons } from "./jalons";

/**
 * Le cycle d'une affaire, de la demande au chantier.
 *
 * Une seule définition, quatre écrans : la fiche client, la liste des fiches,
 * le tableau de bord et les chantiers la consomment tous. Quatre lectures
 * séparées auraient divergé au premier changement de règle — et un client
 * n'aurait pas été « à relancer » au même moment selon l'écran regardé.
 *
 * Le module est **pur** : il ne connaît ni React, ni le réseau. Il prend ce que
 * l'API sert déjà — l'affaire, ses devis, ses échanges — plus les quatre jalons
 * qu'elle ne sait pas encore stocker, et rend une position.
 *
 * Rien n'est calculé sur `Date.now()` : l'instant est un argument. C'est ce qui
 * rend la lecture stable pendant un rendu et testable hors du navigateur.
 */

// ---------------------------------------------------------------------------
// Le vocabulaire
// ---------------------------------------------------------------------------

/**
 * Les huit crans du cycle, dans l'ordre.
 *
 * Ils viennent du cycle décrit par le dirigeant, pas de l'énumération
 * `project_stage` de la base : celle-ci s'arrête à « gagné » et ignore tout ce
 * qui suit la signature, là où l'argent se bloque vraiment.
 */
export type CycleStep =
  | "contact"
  | "rdv"
  | "devis"
  | "negociation"
  | "signe"
  | "acompte"
  | "chantier"
  | "materiaux";

export const CYCLE_ORDER: CycleStep[] = [
  "contact",
  "rdv",
  "devis",
  "negociation",
  "signe",
  "acompte",
  "chantier",
  "materiaux",
];

export const CYCLE_LABEL: Record<CycleStep, { label: string; hint: string }> = {
  contact: { label: "Contact", hint: "Appels, e-mails, premiers échanges" },
  rdv: { label: "RDV", hint: "Visite sur site — obligatoire avant tout devis" },
  devis: { label: "Devis", hint: "Chiffrage établi et transmis" },
  negociation: { label: "Négociation", hint: "En attente de la réponse du client" },
  signe: { label: "Signé", hint: "Devis accepté" },
  acompte: { label: "Acompte", hint: "Facture d'acompte, RIB, assurance, encaissement" },
  chantier: { label: "Date", hint: "Date de chantier réservée" },
  materiaux: { label: "Matériaux", hint: "Béton, acier et fournitures commandés" },
};

/**
 * L'état d'un cran.
 *
 * `skipped` n'est pas `blocked` : une affaire reportée reprendra, une affaire
 * refusée ne reprendra pas. Les confondre ferait disparaître de l'écran des
 * prospects qui reviennent — c'est précisément ce que le dirigeant refuse.
 */
export type StepState = "done" | "current" | "todo" | "blocked" | "skipped";

export type CyclePoint = {
  step: CycleStep;
  state: StepState;
  /** Quand le cran a été franchi. Nul tant qu'il ne l'est pas. */
  at: string | null;
  /** Jours d'attente sur le cran courant. Nul ailleurs. */
  waiting: number | null;
  /** Une phrase, pour l'infobulle et pour la lecture d'ensemble. */
  detail: string;
};

// ---------------------------------------------------------------------------
// Les seuils
// ---------------------------------------------------------------------------

/**
 * Trois semaines : en deçà, le client lit encore, relancer serait harceler.
 * Six mois : au-delà, ce n'est plus une affaire mais une archive.
 *
 * Ces deux nombres viennent du tableau de bord, qui les avait pour lui seul.
 * Les partager est tout l'intérêt : « à relancer » veut désormais dire la même
 * chose sur la fiche, dans la liste et sur le tableau de bord.
 */
export const FRESH_DAYS = 21;
export const COLD_DAYS = 180;

/** Un chantier signé qui n'a pas de date au bout de deux semaines inquiète. */
export const PLANNING_GRACE_DAYS = 15;

const DAY = 86_400_000;

/** Jours écoulés depuis une date, jamais négatif. */
export function daysSince(now: number, iso: string | null): number | null {
  if (!iso) return null;
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return null;
  return Math.max(0, Math.round((now - at) / DAY));
}

/** Jours restants avant une date, négatif si elle est passée. */
export function daysUntil(now: number, iso: string | null): number | null {
  if (!iso) return null;
  const at = new Date(iso).getTime();
  if (Number.isNaN(at)) return null;
  return Math.round((at - now) / DAY);
}

/**
 * La tonalité d'une attente.
 *
 * Elle ne dit pas la durée, elle dit s'il faut agir — et c'est la même échelle
 * partout, pour qu'un même nombre de jours ne soit pas orange ici et rouge là.
 */
export function waitingTone(days: number | null): Tone {
  if (days === null) return "neutral";
  if (days > COLD_DAYS) return "neutral"; // dormant : plus urgent, juste vieux
  if (days > FRESH_DAYS * 2) return "danger";
  if (days > FRESH_DAYS) return "warning";
  return "info";
}

// ---------------------------------------------------------------------------
// Lecture des devis
// ---------------------------------------------------------------------------

/** Le devis qui porte l'affaire : l'accepté s'il existe, sinon le dernier envoyé. */
export function leadQuote(quotes: Quote[]): Quote | null {
  const accepted = quotes.filter((q) => q.status === "accepte" || q.status === "realise");
  if (accepted.length > 0) return newest(accepted);
  const sent = quotes.filter((q) => q.status === "envoye");
  if (sent.length > 0) return newest(sent);
  return quotes.length > 0 ? newest(quotes) : null;
}

function newest(quotes: Quote[]): Quote {
  return quotes.reduce((best, quote) =>
    (quote.issued_at ?? quote.created_at) > (best.issued_at ?? best.created_at) ? quote : best,
  );
}

/**
 * Le sondage se rattache au RDV, pas au cycle.
 *
 * « Dans le RDV il peut y avoir un sondage pour le mur, mais pas toujours » :
 * c'est une option de la visite, pas une étape que toute affaire traverse. En
 * faire un cran laisserait un trou dans la frise de la majorité des affaires.
 */
export function hasSurvey(quotes: Quote[]): boolean {
  return quotes.some((quote) => quote.kind === "sondages");
}

/** Les révisions d'un devis, du plus ancien au plus récent. La négociation se lit là. */
export function revisions(quotes: Quote[]): Quote[] {
  return [...quotes].sort((a, b) =>
    (a.issued_at ?? a.created_at).localeCompare(b.issued_at ?? b.created_at),
  );
}

function amountOf(quote: Quote | null): number {
  if (!quote) return 0;
  const raw = quote.amount_ttc ?? quote.amount_ht;
  const value = raw ? Number.parseFloat(raw) : Number.NaN;
  return Number.isNaN(value) ? 0 : value;
}

// ---------------------------------------------------------------------------
// La lecture du cycle
// ---------------------------------------------------------------------------

/**
 * Le minimum pour lire un cycle.
 *
 * `Project` le satisfait, et `ProjectSummary` aussi — celui que sert la liste
 * des fiches, sans adresse ni notes. C'est voulu : la liste n'a ni devis ni
 * échanges sous la main, mais elle a l'étape et la dernière relance, donc de
 * quoi situer l'affaire. Elle en dira simplement moins, sans réclamer un
 * second aller-retour par ligne affichée.
 */
export type CycleInput = {
  id: string;
  stage: ProjectStage;
  outcome: ProjectOutcome | null;
  outcome_note: string;
  started_at: string | null;
  last_reminder_at: string | null;
  created_at?: string;
};

/**
 * readCycle : où en est cette affaire, cran par cran.
 *
 * L'ordre des règles compte, comme la cascade de statut des chantiers : le
 * premier cran non franchi devient le cran courant, et tous les suivants sont
 * à faire. Un cran franchi le reste — même sur une affaire refusée, parce que
 * l'histoire d'un prospect qui revient commence là où elle s'était arrêtée.
 *
 * Sans devis ni échange, la lecture se rabat sur l'étape enregistrée en base.
 * Elle reste juste, en moins précise : on sait qu'un devis est parti, pas
 * depuis combien de jours exactement.
 */
export function readCycle(
  project: CycleInput,
  quotes: Quote[],
  interactions: Interaction[],
  jalons: Jalons,
  now: number,
): CyclePoint[] {
  const mine = interactions.filter((i) => i.project_id === project.id);
  const lead = leadQuote(quotes);
  const sent = quotes.find((q) => q.status === "envoye") ?? null;
  const signed = quotes.find((q) => q.status === "accepte" || q.status === "realise") ?? null;

  const stage = project.stage;
  const rdv = lastInteraction(mine, "rdv");
  const firstContact = mine.length > 0 ? oldest(mine) : null;

  // --- Ce qui est franchi, et quand -------------------------------------
  /*
  Franchi et daté sont deux questions distinctes.

  Une ligne de liste n'a pas de `created_at`, et l'import Excel laisse des
  affaires sans date de démarrage. Lier les deux ferait croire qu'aucun contact
  n'a eu lieu sur une affaire dont le devis est pourtant parti — c'est ce que
  l'écran affichait. L'étape enregistrée décide donc de ce qui est franchi ; la
  date n'est qu'un ornement, absente quand on ne la connaît pas.
  */
  const anchor = earliest(project.created_at, project.started_at);
  const contactDone = mine.length > 0 || stage !== "demande_recue";
  const contactAt = earliest(firstContact?.occurred_at, contactDone ? anchor : undefined);

  const rdvDone =
    (rdv !== null && rdv.occurred_at <= new Date(now).toISOString()) ||
    afterStage(stage, "rdv_planifie");
  const rdvAt = rdv?.occurred_at ?? (rdvDone ? project.started_at : null);

  const devisAt = sent?.issued_at ?? signed?.issued_at ?? (lead?.issued_at ?? null);
  // « Devis envoyé » veut dire envoyé : le cran est franchi à cette étape, pas
  // à la suivante. Utiliser `afterStage` laisserait le devis « à faire » sur
  // toutes les affaires dont c'est justement l'étape courante.
  const devisDone = devisAt !== null || atOrAfterStage(stage, "devis_envoye") || signed !== null;

  const signeAt = signed?.issued_at ?? (stage === "gagne" || stage === "realise" ? project.started_at : null);
  const signeDone = signed !== null || stage === "gagne" || stage === "realise";

  const deposit: PaymentStatus = signed?.deposit_status ?? lead?.deposit_status ?? "non_applicable";
  const acompteDone = deposit === "recu";

  // --- Chaque cran, dans l'ordre -----------------------------------------
  const raw: Array<{ step: CycleStep; done: boolean; at: string | null; since: string | null }> = [
    { step: "contact", done: contactDone, at: contactAt, since: contactAt ?? anchor },
    { step: "rdv", done: rdvDone, at: rdvAt, since: rdvAt ?? contactAt ?? anchor },
    { step: "devis", done: devisDone, at: devisAt, since: devisAt ?? rdvAt ?? anchor },
    {
      step: "negociation",
      done: signeDone,
      at: signeAt,
      // L'attente de la négociation court depuis la dernière relance, pas
      // depuis l'envoi : relancer remet le compteur à zéro, sans quoi le
      // chiffre resterait rouge alors qu'on vient d'agir.
      since: project.last_reminder_at ?? devisAt ?? project.started_at ?? anchor,
    },
    { step: "signe", done: signeDone, at: signeAt, since: signeAt ?? devisAt },
    {
      step: "acompte",
      done: acompteDone,
      at: acompteDone ? jalons.deposit_paid_at : null,
      since: jalons.deposit_invoiced_at ?? signeAt,
    },
    {
      step: "chantier",
      done: jalons.worksite_date !== null,
      at: jalons.worksite_date,
      since: jalons.deposit_paid_at ?? jalons.deposit_invoiced_at,
    },
    {
      step: "materiaux",
      done: jalons.materials_ordered_at !== null,
      at: jalons.materials_ordered_at,
      since: jalons.worksite_date,
    },
  ];

  /*
  Les dates ne peuvent pas reculer.

  L'import du fichier de suivi laisse des affaires dont le devis porte une date
  antérieure au rendez-vous : les colonnes d'origine n'étaient pas tenues dans
  l'ordre. Afficher « RDV 18 juin » puis « Signé 12 juin » ferait douter de
  toute la frise. Une date qui recule est donc masquée — le cran reste franchi,
  on avoue seulement qu'on ne sait pas quand.
  */
  let floor: string | null = null;
  for (const entry of raw) {
    if (!entry.done || entry.at === null) continue;
    if (floor !== null && entry.at < floor) entry.at = null;
    else floor = entry.at;
  }

  const firstOpen = raw.findIndex((entry) => !entry.done);
  const paused = project.outcome !== null && isPaused(project.outcome);
  const closed = project.outcome !== null && !paused;

  return raw.map((entry, index) => {
    const isCurrent = index === firstOpen;
    let state: StepState;
    if (entry.done) state = "done";
    else if (isCurrent && closed) state = "blocked";
    else if (isCurrent && paused) state = "skipped";
    else if (isCurrent) state = "current";
    else state = "todo";

    const waiting = isCurrent && !entry.done ? daysSince(now, entry.since) : null;
    return {
      step: entry.step,
      state,
      at: entry.done ? entry.at : null,
      waiting,
      detail: describe(entry.step, state, entry.at, waiting, project.outcome),
    };
  });
}

function describe(
  step: CycleStep,
  state: StepState,
  at: string | null,
  waiting: number | null,
  outcome: ProjectOutcome | null,
): string {
  const name = CYCLE_LABEL[step].label;
  switch (state) {
    case "done":
      return at ? `${name} — ${formatDay(at)}` : `${name} — fait`;
    case "blocked":
      return outcome ? `Affaire close — ${PROJECT_OUTCOME[outcome].label.toLowerCase()}` : "Affaire close";
    case "skipped":
      return outcome ? `En pause — ${PROJECT_OUTCOME[outcome].label.toLowerCase()}` : "En pause";
    case "current":
      return waiting !== null && waiting > 0
        ? `${name} — en attente depuis ${waiting} j`
        : `${name} — en cours`;
    default:
      return `${name} — à venir`;
  }
}

/** « aujourd'hui », « hier », « il y a 12 j » — jamais « il y a 0 j ». */
function agoWords(days: number): string {
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  return `il y a ${days} j`;
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function lastInteraction(interactions: Interaction[], kind: string): Interaction | null {
  const matching = interactions.filter((i) => i.kind === kind);
  if (matching.length === 0) return null;
  return matching.reduce((best, i) => (i.occurred_at > best.occurred_at ? i : best));
}

function oldest(interactions: Interaction[]): Interaction {
  return interactions.reduce((best, i) => (i.occurred_at < best.occurred_at ? i : best));
}

/**
 * La plus ancienne des dates connues, ou rien.
 *
 * Le contact précède tout le reste : le dater d'après le premier échange
 * enregistré donnerait une frise où le rendez-vous a lieu avant le premier
 * appel, parce qu'une relance reprise d'un fichier de suivi peut être la seule
 * interaction en base.
 */
function earliest(...dates: Array<string | null | undefined>): string | null {
  const known = dates.filter((date): date is string => Boolean(date));
  return known.length > 0 ? known.reduce((a, b) => (a < b ? a : b)) : null;
}

const STAGE_RANK: ProjectStage[] = [
  "demande_recue",
  "qualification",
  "rdv_planifie",
  "etude_a_produire",
  "proposition_envoyee",
  "devis_envoye",
  "gagne",
  "realise",
];

/** L'étape est-elle strictement au-delà de la référence ? */
function afterStage(stage: ProjectStage, reference: ProjectStage): boolean {
  return STAGE_RANK.indexOf(stage) > STAGE_RANK.indexOf(reference);
}

/** L'étape a-t-elle atteint la référence, ou l'a-t-elle dépassée ? */
function atOrAfterStage(stage: ProjectStage, reference: ProjectStage): boolean {
  return STAGE_RANK.indexOf(stage) >= STAGE_RANK.indexOf(reference);
}

// ---------------------------------------------------------------------------
// Ce qu'il faut faire maintenant
// ---------------------------------------------------------------------------

/**
 * Les gestes que l'écran sait déclencher. L'affaire dit lequel proposer, le
 * composant sait l'exécuter — ainsi la règle métier reste ici, hors de React.
 */
export type ActionKey =
  | "interaction"
  | "plan_rdv"
  | "open_calendar"
  | "new_quote"
  | "relance"
  | "refuse"
  | "postpone"
  | "reopen"
  | "resume"
  | "deposit_invoiced"
  | "deposit_paid"
  | "send_rib"
  | "send_insurance"
  | "book_date"
  | "order_materials"
  | "open_worksite";

export type NextAction = {
  /** Le cran auquel l'action se rattache. */
  step: CycleStep;
  /** Ce qu'il se passe, en une phrase. */
  title: string;
  /** Pourquoi, ou depuis quand. Vide quand la phrase suffit. */
  detail: string;
  tone: Tone;
  /** Vrai quand l'attente a dépassé le raisonnable. */
  alert: boolean;
  /** Trois au plus : au-delà, l'écran ne dit plus quoi faire, il propose un menu. */
  actions: Array<{ key: ActionKey; label: string; primary?: boolean }>;
};

/**
 * nextAction : la seule chose à faire maintenant sur cette affaire.
 *
 * L'ordre des cas est celui du cycle, à deux exceptions près qui passent
 * devant : une affaire close ou en pause n'a qu'une action, reprendre. Les
 * proposer après les autres ferait apparaître « Relancer » sur une affaire
 * qu'on vient de perdre.
 */
export function nextAction(
  points: CyclePoint[],
  project: CycleInput,
  quotes: Quote[],
  jalons: Jalons,
  now: number,
): NextAction {
  const at = (step: CycleStep) => points.find((point) => point.step === step)!;
  const paused = project.outcome !== null && isPaused(project.outcome);
  const closed = project.outcome !== null && !paused;
  const note = project.outcome_note.trim();

  if (closed) {
    const reason = PROJECT_OUTCOME[project.outcome!].label.toLowerCase();
    return {
      step: at("negociation").step,
      title: "Affaire non aboutie",
      detail: note ? `${reason} — ${note}` : reason,
      tone: "neutral",
      alert: false,
      actions: [{ key: "reopen", label: "Rouvrir l'affaire", primary: true }],
    };
  }

  if (paused) {
    const wake = jalons.resume_at;
    const left = daysUntil(now, wake);
    return {
      step: "negociation",
      title: "Affaire reportée",
      detail: wake
        ? `${note || PROJECT_OUTCOME[project.outcome!].label} — à revoir ${
            left !== null && left <= 0 ? "maintenant" : `dans ${left} j`
          }`
        : note || PROJECT_OUTCOME[project.outcome!].label,
      tone: left !== null && left <= 0 ? "warning" : "neutral",
      alert: left !== null && left <= 0,
      actions: [{ key: "resume", label: "Reprendre", primary: true }],
    };
  }

  const contact = at("contact");
  if (contact.state !== "done") {
    return {
      step: "contact",
      title: "Premier contact à prendre",
      detail: "Aucun échange n'est encore enregistré sur cette affaire.",
      tone: "info",
      alert: false,
      actions: [{ key: "interaction", label: "Enregistrer un échange", primary: true }],
    };
  }

  const rdv = at("rdv");
  if (rdv.state !== "done") {
    if (project.stage === "rdv_planifie") {
      return {
        step: "rdv",
        title: "Rendez-vous planifié",
        detail: "La visite est au calendrier. Le devis vient après.",
        tone: "info",
        alert: false,
        actions: [
          { key: "open_calendar", label: "Voir dans l'agenda", primary: true },
          { key: "interaction", label: "Noter la visite" },
        ],
      };
    }
    return {
      step: "rdv",
      title: "Rendez-vous à planifier",
      detail: "La visite sur site est obligatoire avant d'établir un devis.",
      tone: "warning",
      alert: (rdv.waiting ?? 0) > FRESH_DAYS,
      actions: [{ key: "plan_rdv", label: "Planifier le RDV", primary: true }],
    };
  }

  const devis = at("devis");
  if (devis.state !== "done") {
    return {
      step: "devis",
      title: "Devis à établir",
      detail: hasSurvey(quotes)
        ? "La visite est faite, le sondage aussi. Reste à chiffrer."
        : "La visite est faite. Reste à chiffrer et à transmettre.",
      tone: "warning",
      alert: (devis.waiting ?? 0) > FRESH_DAYS,
      actions: [{ key: "new_quote", label: "Nouveau devis", primary: true }],
    };
  }

  const nego = at("negociation");
  if (nego.state !== "done") {
    const days = nego.waiting ?? 0;
    const relaunched = project.last_reminder_at !== null;
    return {
      step: "negociation",
      title: days > FRESH_DAYS ? `${days} jours sans réponse` : "En attente de réponse",
      detail: relaunched
        ? `Relancé ${agoWords(days)}.${revisions(quotes).length > 1 ? " Devis révisé." : ""}`
        : `Devis envoyé ${agoWords(days)}, jamais relancé.`,
      tone: waitingTone(days),
      alert: days > FRESH_DAYS,
      actions: [
        { key: "relance", label: "Relancer par e-mail", primary: true },
        { key: "refuse", label: "Refusé" },
        { key: "postpone", label: "Reporté" },
      ],
    };
  }

  // --- Après la signature : là où l'argent se bloque ----------------------
  const acompte = at("acompte");
  if (acompte.state !== "done") {
    if (jalons.deposit_invoiced_at === null) {
      return {
        step: "acompte",
        title: "Facture d'acompte à émettre",
        detail: "Le devis est signé. L'acompte, le RIB et l'assurance partent ensemble.",
        tone: "info",
        alert: (acompte.waiting ?? 0) > FRESH_DAYS,
        actions: [{ key: "deposit_invoiced", label: "Acompte facturé", primary: true }],
      };
    }
    if (jalons.rib_sent_at === null || jalons.insurance_sent_at === null) {
      const missing =
        jalons.rib_sent_at === null && jalons.insurance_sent_at === null
          ? "Le RIB et l'attestation d'assurance restent à envoyer."
          : jalons.rib_sent_at === null
            ? "Le RIB reste à envoyer."
            : "L'attestation d'assurance reste à envoyer.";
      return {
        step: "acompte",
        title: "Pièces à envoyer au client",
        detail: missing,
        tone: "warning",
        alert: false,
        actions: [
          ...(jalons.rib_sent_at === null
            ? [{ key: "send_rib" as ActionKey, label: "RIB envoyé", primary: true }]
            : []),
          ...(jalons.insurance_sent_at === null
            ? [{ key: "send_insurance" as ActionKey, label: "Assurance envoyée" }]
            : []),
        ],
      };
    }
    const days = acompte.waiting ?? 0;
    return {
      step: "acompte",
      title: `Acompte en attente depuis ${days} j`,
      detail: "Rien ne se commande avant l'encaissement.",
      tone: waitingTone(days),
      alert: days > FRESH_DAYS,
      actions: [{ key: "deposit_paid", label: "Acompte encaissé", primary: true }],
    };
  }

  const chantier = at("chantier");
  if (chantier.state !== "done") {
    const days = chantier.waiting ?? 0;
    return {
      step: "chantier",
      title: "Aucune date de chantier",
      detail: `Acompte encaissé depuis ${days} j. Le chantier attend sa date.`,
      tone: days > PLANNING_GRACE_DAYS ? "danger" : "warning",
      alert: days > PLANNING_GRACE_DAYS,
      actions: [{ key: "book_date", label: "Réserver une date", primary: true }],
    };
  }

  const materiaux = at("materiaux");
  if (materiaux.state !== "done") {
    const left = daysUntil(now, jalons.worksite_date);
    return {
      step: "materiaux",
      title: "Matériaux à commander",
      detail:
        left !== null && left >= 0
          ? `Chantier dans ${left} j. Béton, acier et fournitures.`
          : "Le chantier a commencé. Béton, acier et fournitures.",
      tone: left !== null && left <= 7 ? "danger" : "warning",
      alert: left !== null && left <= 7,
      actions: [{ key: "order_materials", label: "Matériaux commandés", primary: true }],
    };
  }

  return {
    step: "materiaux",
    title: "Prêt à démarrer",
    detail: jalons.worksite_date
      ? `Chantier le ${formatDay(jalons.worksite_date)}, matériaux commandés.`
      : "Tout est en place.",
    tone: "success",
    alert: false,
    actions: [{ key: "open_worksite", label: "Ouvrir le chantier", primary: true }],
  };
}

// ---------------------------------------------------------------------------
// Lecture au niveau de la fiche
// ---------------------------------------------------------------------------

/**
 * L'affaire qui mérite l'attention.
 *
 * Une fiche porte plusieurs affaires et une liste n'a qu'une ligne : il faut
 * choisir. On prend celle qui alerte, sinon celle qui attend depuis le plus
 * longtemps, sinon la plus chère. Une affaire close ne gagne jamais — elle ne
 * demande rien.
 */
export function leadProject<T extends CycleInput>(
  reads: Array<{ project: T; action: NextAction; quotes: Quote[] }>,
): { project: T; action: NextAction; quotes: Quote[] } | null {
  if (reads.length === 0) return null;
  const live = reads.filter((read) => read.action.actions[0]?.key !== "reopen");
  const pool = live.length > 0 ? live : reads;
  return pool.reduce((best, read) => {
    if (read.action.alert !== best.action.alert) return read.action.alert ? read : best;
    const mine = amountOf(leadQuote(read.quotes));
    const theirs = amountOf(leadQuote(best.quotes));
    return mine > theirs ? read : best;
  });
}

/** Les filtres de cycle de la liste des fiches. */
export type CycleFilter =
  | "tous"
  | "a_relancer"
  | "sans_rdv"
  | "devis_en_attente"
  | "acompte_en_attente"
  | "sans_date";

export const CYCLE_FILTERS: Array<{ key: CycleFilter; label: string }> = [
  { key: "tous", label: "Toutes" },
  { key: "a_relancer", label: "À relancer" },
  { key: "sans_rdv", label: "Sans RDV" },
  { key: "devis_en_attente", label: "Devis en attente" },
  { key: "acompte_en_attente", label: "Acompte en attente" },
  { key: "sans_date", label: "Sans date de chantier" },
];

export function matchesFilter(action: NextAction, filter: CycleFilter): boolean {
  switch (filter) {
    case "tous":
      return true;
    case "a_relancer":
      return action.step === "negociation" && action.alert;
    case "sans_rdv":
      return action.step === "rdv" && action.actions[0]?.key === "plan_rdv";
    case "devis_en_attente":
      return action.step === "negociation" || action.step === "devis";
    case "acompte_en_attente":
      return action.step === "acompte";
    case "sans_date":
      return action.step === "chantier";
  }
}
