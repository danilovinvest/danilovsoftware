import type {
  Interaction,
  PaymentStatus,
  ProjectMission,
  ProjectOutcome,
  ProjectStage,
  Quote,
} from "./types";
import { isPaused, PROJECT_OUTCOME, type Tone } from "./labels";
import { EMPTY_MARKS, type Jalons, type StepMarks } from "./jalons";
import { deadlineOf, missionOf } from "./mission";

/**
 * Le cycle d'une affaire, de la demande au chantier.
 *
 * Une seule définition, quatre écrans : la fiche client, la liste des fiches,
 * le tableau de bord et les chantiers la consomment tous. Quatre lectures
 * séparées auraient divergé au premier changement de règle — et un client
 * n'aurait pas été « à relancer » au même moment selon l'écran regardé.
 *
 * Le module est **pur** : il ne connaît ni React, ni le réseau. Il prend ce que
 * l'API sert déjà — l'affaire, ses devis, ses échanges, ses jalons — et rend
 * une position.
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
  // Propre aux études : le rapport de visite, remis avant de chiffrer.
  | "rapport"
  | "devis"
  | "negociation"
  | "signe"
  | "acompte"
  // Propres aux travaux.
  | "chantier"
  | "materiaux"
  // Propre aux études : les plans d'exécution envoyés au client.
  | "plans"
  // Propres à l'étude structurelle : la production, entre l'acompte et l'envoi.
  | "calcul"
  | "dossier"
  // Propres au rapport ou à l'attestation.
  | "redaction"
  | "envoi"
  // Propres au sondage.
  | "sondage"
  | "rapport_sondage"
  // Communs aux deux.
  | "solde"
  | "avis";

/**
 * Les deux métiers du groupe, et leurs deux cycles.
 *
 * **OMPT STRUCTURE rend un document, OMPT GROUPE livre un chantier**, et cela
 * change la moitié du cycle. Là où les travaux réservent une date et commandent
 * du béton, l'étude remet un rapport de visite avant de chiffrer, puis prépare
 * et envoie des plans d'exécution.
 *
 * Le début est commun — on parle au client, on va voir, on chiffre, on
 * négocie, on signe, on encaisse un acompte. La fin ne l'est pas.
 *
 * Les deux se terminent par le **solde** puis l'**avis client** : « à la fin
 * de chaque prestation il faut les avis, et d'abord la preuve que les sous sont
 * payés ». Le CRM tient cette règle seul — l'avis ne se demande qu'une fois le
 * solde encaissé.
 */
export type Metier = "etudes" | "travaux";

const TRAVAUX_ORDRE: CycleStep[] = [
  "contact", "rdv", "devis", "negociation", "signe",
  "acompte", "chantier", "materiaux", "solde", "avis",
];

/*
  Le bureau d'études a trois parcours, un par mission.

  Ils partagent le début — on parle, on visite, on chiffre, on signe — et
  divergent sur ce qu'on produit. L'étude structurelle calcule, dessine, valide
  et envoie un dossier. Le rapport ou l'attestation se paie généralement en une
  fois **avant** d'être rédigé, d'où le solde avant la rédaction et l'absence
  d'acompte. Le sondage se fait sur site puis se rend en rapport.

  La production détaillée — calcul commencé, plans à valider, corrections — vit
  dans les jalons, pas dans la frise : une frise à vingt crans ne se lit plus.
  Chaque cran ajouté ici est un moment où le dossier change de mains.
*/
const ETUDES_ORDRE: Record<ProjectMission, CycleStep[]> = {
  etude_structurelle: [
    "contact", "rdv", "rapport", "devis", "negociation", "signe",
    "acompte", "calcul", "dossier", "plans", "solde", "avis",
  ],
  rapport_attestation: [
    "contact", "rdv", "rapport", "devis", "negociation", "signe",
    "solde", "redaction", "envoi", "avis",
  ],
  sondage: [
    "contact", "rdv", "devis", "negociation", "signe",
    "acompte", "sondage", "rapport_sondage", "solde", "avis",
  ],
};

/*
Le parcours d'une affaire, et le sondage qui s'y glisse.

**Un sondage accompagne souvent une étude**, et la mission ne le dit pas : la
déduction fait gagner l'étude sur le sondage, à juste titre — c'est l'étude
qu'on livre. Mais le sondage se fait quand même, et aucun cran ne le portait.
Mesuré le 17/09 : sur les sept affaires qui ont un devis de sondage, **trois**
tombent sur une autre mission (`etude+sondages`, `attestation+sondages`), donc
trois affaires où l'on sonde sans que la frise le montre.

Le cran s'insère donc **après l'acompte** — ou après la signature pour
l'attestation, qui n'a pas d'acompte — et dans les deux cas **avant la
facture** : on sonde pour savoir quoi calculer, et on solde après avoir rendu.
C'est ce que le dirigeant a demandé, et l'ordre de la mission « sondage » le
faisait déjà : il n'y avait qu'à l'étendre aux deux autres.

Le drapeau vient des **devis**, pas de la mission : c'est le seul endroit qui
sache qu'un sondage est vendu sur cette affaire-là.
*/
export function cycleOrder(
  metier: Metier,
  mission: ProjectMission = "etude_structurelle",
  avecSondage = false,
): CycleStep[] {
  if (metier === "travaux") return TRAVAUX_ORDRE;

  const ordre = ETUDES_ORDRE[mission];
  // La mission « sondage » le porte déjà, au bon endroit.
  if (!avecSondage || mission === "sondage") return ordre;

  // Après l'acompte quand il existe, après la signature sinon : les deux
  // laissent le sondage avant le solde, qui est la facture.
  const ancre = ordre.includes("acompte")
    ? ordre.indexOf("acompte")
    : ordre.indexOf("signe");
  if (ancre < 0) return ordre;

  return [
    ...ordre.slice(0, ancre + 1),
    "sondage",
    "rapport_sondage",
    ...ordre.slice(ancre + 1),
  ];
}

/** Conservé pour ce qui n'a pas besoin de distinguer : la frise des travaux. */
export const CYCLE_ORDER: CycleStep[] = TRAVAUX_ORDRE;

export const CYCLE_LABEL: Record<CycleStep, { label: string; hint: string }> = {
  contact: { label: "Contact", hint: "Appels, e-mails, premiers échanges" },
  rdv: { label: "RDV", hint: "Visite sur site — obligatoire avant tout devis" },
  rapport: { label: "Rapport", hint: "Rapport de visite remis au client" },
  devis: { label: "Devis", hint: "Chiffrage établi et transmis" },
  negociation: { label: "Négociation", hint: "En attente de la réponse du client" },
  signe: { label: "Signé", hint: "Devis accepté" },
  acompte: { label: "Acompte", hint: "Facture d'acompte, RIB, assurance, encaissement" },
  chantier: { label: "Date", hint: "Date de chantier réservée" },
  materiaux: { label: "Matériaux", hint: "Béton, acier et fournitures commandés" },
  plans: { label: "Envoi", hint: "Dossier définitif et plans d'exécution envoyés au client" },
  calcul: { label: "Calcul", hint: "Note de calcul faite par l'ingénieur" },
  dossier: { label: "Dossier", hint: "Plans dessinés, relus et validés : le dossier définitif" },
  redaction: { label: "Rédaction", hint: "Rapport ou attestation rédigé" },
  envoi: { label: "Envoi", hint: "Rapport ou attestation envoyé au client" },
  sondage: { label: "Sondage", hint: "Sondage réalisé sur site" },
  rapport_sondage: { label: "Rapport", hint: "Rapport de sondage envoyé au client" },
  solde: { label: "Solde", hint: "Facture de solde encaissée" },
  avis: { label: "Avis", hint: "Avis client recueilli — après encaissement" },
};

/**
 * Le métier d'une affaire, lu de ses devis.
 *
 * Il suit **le plus avancé des deux** : une affaire qui porte un devis de
 * travaux va vers un chantier, même si une étude l'a précédée. C'est aussi la
 * lecture la plus utile — c'est la suite qui intéresse, pas l'origine.
 *
 * Sans devis, on suppose des travaux : c'est le cas de la grande majorité des
 * affaires reprises, et le cycle des travaux est le plus complet des deux.
 */
export function metierOf(quotes: Quote[]): Metier {
  if (quotes.some((quote) => quote.issuer === "ompt-groupe")) return "travaux";
  if (quotes.some((quote) => quote.issuer === "ompt-structure")) return "etudes";
  return "travaux";
}

/**
 * Le métier d'une affaire : sa société choisie d'abord, ses devis sinon.
 *
 * Une affaire basculée de GROUPE vers STRUCTURE doit suivre le cycle d'une étude
 * même si ses devis n'ont pas suivi : c'est le choix de l'entreprise.
 */
export function projectMetier(project: { issuer?: string | null }, quotes: Quote[]): Metier {
  if (project.issuer === "ompt-structure") return "etudes";
  if (project.issuer === "ompt-groupe") return "travaux";
  return metierOf(quotes);
}

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
  /**
   * Le cran est-il franchi par autre chose que ce qu'il sait écrire ?
   *
   * Un rendez-vous consigné franchit « RDV », un devis accepté franchit
   * « Signé » : décocher la marque n'y changerait rien, et l'écran doit le
   * dire au lieu d'offrir un bouton qui ne retire rien. N'a de sens que sur un
   * cran franchi.
   */
  byFact: boolean;
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
  /** Choisie par l'entreprise ; absente ou nulle, elle se déduit des devis. */
  mission?: ProjectMission | null;
  /** La société choisie par l'entreprise ; absente ou nulle, elle se lit sur les devis. */
  issuer?: string | null;
  /** Les deux délais, qui font d'un dossier en production un dossier en retard. */
  promised_at?: string | null;
  internal_deadline_at?: string | null;
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
  /*
    Le métier, quand l'appelant le sait mieux que les devis.

    La liste des fiches ne transporte pas les devis — elle situe, la fiche
    détaille — et déduirait donc « travaux » pour tout le monde. Le périmètre
    choisi dans la barre latérale est alors le meilleur indice disponible : en
    mode STRUCTURE, ce sont des études qu'on regarde.
  */
  metierForce?: Metier,
  /*
    Les crans cochés à la main.

    Facultatifs, et vides par défaut : la liste des fiches et le tableau de
    bord lisent une frise sans les avoir chargés, et une frise sans marque
    reste juste — simplement déduite, comme avant. Seule la fiche, qui les
    reçoit avec les jalons, les passe.
  */
  marks: StepMarks = EMPTY_MARKS,
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
  /*
    Le fait et la marque se comptent séparément.

    Pas par goût de la nuance : l'écran doit savoir si retirer la marque
    changerait quelque chose. Un cran franchi par un devis reste franchi quand
    on décoche sa marque, et proposer « Retirer » y serait un bouton qui ne
    retire rien — deux vues de la même affaire se contrediraient au clic
    suivant.
  */
  const contactFait = mine.length > 0 || stage !== "demande_recue";
  const contactDone = contactFait || marks.contact_at !== null;
  const contactAt = earliest(
    firstContact?.occurred_at,
    marks.contact_at ?? undefined,
    contactDone ? anchor : undefined,
  );

  const rdvFait =
    (rdv !== null && rdv.occurred_at <= new Date(now).toISOString()) ||
    afterStage(stage, "rdv_planifie");
  const rdvDone = rdvFait || marks.rdv_at !== null;
  const rdvAt = rdv?.occurred_at ?? marks.rdv_at ?? (rdvDone ? project.started_at : null);

  const devisFactAt = sent?.issued_at ?? signed?.issued_at ?? (lead?.issued_at ?? null);
  // « Devis envoyé » veut dire envoyé : le cran est franchi à cette étape, pas
  // à la suivante. Utiliser `afterStage` laisserait le devis « à faire » sur
  // toutes les affaires dont c'est justement l'étape courante.
  const devisFait =
    devisFactAt !== null || atOrAfterStage(stage, "devis_envoye") || signed !== null;
  const devisDone = devisFait || marks.quote_sent_at !== null;
  const devisAt = devisFactAt ?? marks.quote_sent_at;

  /*
    « Négociation » et « Signé » se cochent séparément.

    Le fait franchit les deux d'un coup — on ne signe pas sans avoir négocié, et
    un devis accepté prouve les deux. Une **marque** ne franchit que son cran :
    cocher « Signé » ne coche pas « Négociation », sans quoi la frise
    redeviendrait ordonnée et l'on ne pourrait plus laisser un cran gris
    derrière un cran vert. C'est exactement ce qui était demandé.
  */
  const signeFactAt =
    signed?.issued_at ?? (stage === "gagne" || stage === "realise" ? project.started_at : null);
  const signeFait = signed !== null || stage === "gagne" || stage === "realise";
  const signeDone = signeFait || marks.signed_at !== null;
  const signeAt = signeFactAt ?? marks.signed_at;
  const negoDone = signeFait || marks.negotiation_at !== null;
  const negoAt = signeFactAt ?? marks.negotiation_at;

  const deposit: PaymentStatus = signed?.deposit_status ?? lead?.deposit_status ?? "non_applicable";
  const acompteDone = deposit === "recu";

  const balance: PaymentStatus = signed?.balance_status ?? lead?.balance_status ?? "non_applicable";
  const soldeDone = balance === "recu";

  const metier = metierForce ?? projectMetier(project, quotes);

  /*
    Le rapport de visite, propre aux études.

    Il se lit d'un échange de type « rapport », et se déduit à défaut du devis :
    on ne chiffre pas une étude sans avoir visité et rendu son compte rendu.
    Sans cette déduction, toutes les affaires reprises afficheraient un cran
    manquant au milieu d'une frise par ailleurs complète.
  */
  const rapport = lastInteraction(mine, "rapport");
  // Le jalon compte autant que l'échange : c'est lui que pose la fiche, et que
  // pose un événement de rendez-vous depuis l'agenda.
  const rapportAt = rapport?.occurred_at ?? jalons.visit_report_sent_at;
  // Ce qui le franchit **sans** son jalon : l'échange qui le consigne, ou le
  // devis, puisqu'on ne chiffre pas une étude sans avoir visité.
  const rapportFait = rapport !== null || devisDone;

  // --- Chaque cran --------------------------------------------------------
  /*
    Tous les crans se décrivent, puis le parcours choisit.

    Le métier et la mission disent lesquels s'affichent et dans quel ordre
    (`cycleOrder`) ; décrire un cran qui ne s'affichera pas ne coûte rien, et
    garde une seule définition par cran quel que soit le parcours.
  */
  type Entry = {
    step: CycleStep;
    done: boolean;
    /** Franchi par autre chose que ce que le cran sait écrire. */
    fact: boolean;
    at: string | null;
    since: string | null;
  };
  const mission = metier === "etudes" ? missionOf(project, quotes) : undefined;
  const depuisAcompte = jalons.deposit_paid_at ?? jalons.deposit_invoiced_at;
  // Ce qui a été rendu au client, quelle que soit la mission : le solde se
  // réclame après lui.
  const livreAt =
    jalons.plans_sent_at ??
    jalons.report_sent_at ??
    jalons.survey_report_sent_at ??
    jalons.materials_ordered_at;

  /*
    Une étape plus avancée prouve celles d'avant.

    Un dossier envoyé a été calculé et validé, un rapport envoyé a été rédigé :
    les laisser gris derrière un cran vert ferait croire à un trou dans la
    production. Ce sont des faits, pas des marques — le panneau du cran le dit,
    au lieu d'offrir un « Retirer » qui ne retirerait rien.
  */
  const dossierFait = jalons.plans_sent_at !== null;
  const calculFait = jalons.final_ready_at !== null || dossierFait;
  const redactionFait = jalons.report_sent_at !== null;
  const sondageFait = jalons.survey_report_sent_at !== null;

  const entries: Record<CycleStep, Omit<Entry, "step">> = {
    contact: { done: contactDone, fact: contactFait, at: contactAt, since: contactAt ?? anchor },
    rdv: { done: rdvDone, fact: rdvFait, at: rdvAt, since: rdvAt ?? contactAt ?? anchor },
    rapport: {
      done: rapportAt !== null || devisDone,
      fact: rapportFait,
      at: rapportAt,
      since: rdvAt ?? contactAt ?? anchor,
    },
    devis: { done: devisDone, fact: devisFait, at: devisAt, since: devisAt ?? rdvAt ?? anchor },
    negociation: {
      done: negoDone,
      fact: signeFait,
      at: negoAt,
      // L'attente de la négociation court depuis la dernière relance, pas
      // depuis l'envoi : relancer remet le compteur à zéro, sans quoi le
      // chiffre resterait rouge alors qu'on vient d'agir.
      since: project.last_reminder_at ?? devisAt ?? project.started_at ?? anchor,
    },
    signe: { done: signeDone, fact: signeFait, at: signeAt, since: signeAt ?? devisAt },
    acompte: {
      done: acompteDone,
      // L'acompte, la date de chantier, les jalons, le solde, l'avis : leur
      // cran écrit dans ce qui les porte. Ce qui les franchit est donc
      // exactement ce que le cran sait retirer.
      fact: false,
      at: acompteDone ? jalons.deposit_paid_at : null,
      since: jalons.deposit_invoiced_at ?? signeAt,
    },
    chantier: {
      done: jalons.worksite_date !== null,
      fact: false,
      at: jalons.worksite_date,
      since: depuisAcompte,
    },
    materiaux: {
      done: jalons.materials_ordered_at !== null,
      fact: false,
      at: jalons.materials_ordered_at,
      since: jalons.worksite_date,
    },
    calcul: {
      done: jalons.calc_done_at !== null || calculFait,
      fact: calculFait,
      at: jalons.calc_done_at,
      since: jalons.calc_started_at ?? depuisAcompte,
    },
    dossier: {
      done: jalons.final_ready_at !== null || dossierFait,
      fact: dossierFait,
      at: jalons.final_ready_at,
      since: jalons.plans_review_at ?? jalons.plans_started_at ?? jalons.calc_done_at ?? depuisAcompte,
    },
    plans: {
      done: jalons.plans_sent_at !== null,
      fact: false,
      at: jalons.plans_sent_at,
      since: jalons.final_ready_at ?? depuisAcompte,
    },
    redaction: {
      done: jalons.report_written_at !== null || redactionFait,
      fact: redactionFait,
      at: jalons.report_written_at,
      since: signeAt,
    },
    envoi: {
      done: jalons.report_sent_at !== null,
      fact: false,
      at: jalons.report_sent_at,
      since: jalons.report_validated_at ?? jalons.report_written_at ?? signeAt,
    },
    sondage: {
      done: jalons.survey_done_at !== null || sondageFait,
      fact: sondageFait,
      at: jalons.survey_done_at,
      since: depuisAcompte,
    },
    rapport_sondage: {
      done: jalons.survey_report_sent_at !== null,
      fact: false,
      at: jalons.survey_report_sent_at,
      since: jalons.survey_done_at ?? depuisAcompte,
    },
    // Un rapport se paie avant d'être rédigé : son solde n'attend aucune
    // livraison, il attend depuis la signature.
    solde:
      mission === "rapport_attestation"
        ? { done: soldeDone, fact: false, at: null, since: signeAt }
        : {
            done: soldeDone,
            fact: false,
            at: soldeDone ? livreAt : null,
            since: livreAt ?? jalons.worksite_date,
          },
    avis: {
      done: jalons.review_received_at !== null,
      fact: false,
      at: jalons.review_received_at,
      since: jalons.review_requested_at,
    },
  };

  /*
    Un sondage est vendu sur cette affaire : la frise doit le montrer.

    `hasSurvey` existait déjà et disait exactement cela — je l'avais réécrit à
    la main avant de m'en apercevoir. Le type est `sondages`, au pluriel, quand
    la *mission* est `sondage` au singulier : les deux se lisent à un caractère
    près, et c'est une raison de plus de n'avoir qu'un seul endroit qui compare.
  */
  const raw: Entry[] = cycleOrder(metier, mission, hasSurvey(quotes)).map((step) => ({
    step,
    ...entries[step],
  }));

  /*
  Les dates ne peuvent pas reculer.

  L'import du fichier de suivi laisse des affaires dont le devis porte une date
  antérieure au rendez-vous : les colonnes d'origine n'étaient pas tenues dans
  l'ordre. Afficher « RDV 18 juin » puis « Signé 12 juin » ferait douter de
  toute la frise. Une date qui recule est donc masquée — le cran reste franchi,
  on avoue seulement qu'on ne sait pas quand.
  */
  /*
    Et cette règle est retirée, à la demande du dirigeant.

    Masquer une date qui recule protégeait la lecture de la frise ; le prix
    était qu'un **rendez-vous réellement tenu disparaissait**. Le cas est
    fréquent et n'a rien d'une incohérence d'import : on marque « premier
    contact » aujourd'hui, en rattrapant une affaire ancienne, et le RDV de juin
    passe alors sous le plancher. « Il faut remettre la date des RDV même s'ils
    sont passés » — et c'est juste : une date qu'on a est plus utile qu'une
    frise parfaitement ordonnée. Deux dates qui se croisent disent quelque chose
    de vrai sur la saisie ; les cacher ne le corrige pas, ça le dissimule.
  */

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
      byFact: entry.done && entry.fact,
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
// Cocher un cran à la main
// ---------------------------------------------------------------------------

/**
 * Ce qu'écrit le clic sur un cran de la frise.
 *
 * Un cran franchi n'est pas une case dans une table de crans : c'est une
 * conséquence. Cliquer « Date de chantier » écrit `started_at` de l'affaire —
 * la colonne que l'écran Chantiers lit déjà — et cliquer « Acompte » change le
 * statut du devis, qui porte le règlement. Tenir une seconde vérité par cran
 * ferait diverger la frise de tous les autres écrans au premier oubli.
 *
 * Ne reçoivent une **marque** que les cinq crans dont personne ne tient la
 * date. Voir `StepMarks`.
 */
/**
 * Les jalons qu'un cran de la frise peut poser.
 *
 * Quatre sur les onze de la table : les autres — RIB, assurance, PV, avis
 * demandé — sont des étapes *dans* un cran, pas des crans. Ils se posent dans
 * l'onglet « Après-signature », qui les montre tous.
 */
type JalonColumn =
  | "visit_report_sent_at"
  | "materials_ordered_at"
  | "plans_sent_at"
  | "review_received_at"
  | "calc_done_at"
  | "final_ready_at"
  | "report_written_at"
  | "report_sent_at"
  | "survey_done_at"
  | "survey_report_sent_at";

/** Ce que le clic fait, dit à l'utilisateur avant qu'il clique. */
type StepNote = { note: string };

export type StepWrite = StepNote &
  (
    | { target: "mark"; field: keyof StepMarks }
    | { target: "jalon"; field: JalonColumn }
    | { target: "worksite_date" }
    /*
      Les matériaux se distinguent des autres jalons : le cran ne pose pas
      seulement une date, il enregistre **ce qui a été commandé**. Une date
      seule ne dit pas ce qu'on attend à la livraison.
    */
    | { target: "materials"; field: "materials_ordered_at" }
    | { target: "quote"; field: "deposit" | "balance" }
  );

const WRITE: Record<CycleStep, StepWrite> = {
  contact: {
    target: "mark",
    field: "contact_at",
    note: "Un échange enregistré franchit ce cran tout seul.",
  },
  rdv: {
    target: "mark",
    field: "rdv_at",
    note: "Un rendez-vous noté dans l'agenda franchit ce cran tout seul.",
  },
  rapport: {
    target: "jalon",
    field: "visit_report_sent_at",
    note: "Écrit « rapport de visite remis » dans les jalons de l'affaire.",
  },
  devis: {
    target: "mark",
    field: "quote_sent_at",
    note: "Un devis au dossier franchit ce cran tout seul.",
  },
  negociation: {
    target: "mark",
    field: "negotiation_at",
    note: "Un devis accepté franchit ce cran tout seul.",
  },
  signe: {
    target: "mark",
    field: "signed_at",
    note: "Un devis accepté franchit ce cran tout seul.",
  },
  acompte: {
    target: "quote",
    field: "deposit",
    note: "L'acompte vit sur le devis : c'est son statut qui change.",
  },
  chantier: {
    target: "worksite_date",
    note: "Écrit la date de démarrage de l'affaire, celle que lit l'écran Chantiers.",
  },
  materiaux: {
    target: "materials",
    field: "materials_ordered_at",
    note: "Écrit la commande et sa date dans les jalons de l'affaire.",
  },
  plans: {
    target: "jalon",
    field: "plans_sent_at",
    note: "Écrit « dossier envoyé » dans les jalons de l'affaire.",
  },
  calcul: {
    target: "jalon",
    field: "calc_done_at",
    note: "Écrit « calcul terminé » — la date de la note de calcul — dans les jalons.",
  },
  dossier: {
    target: "jalon",
    field: "final_ready_at",
    note: "Écrit « dossier définitif » dans les jalons de l'affaire.",
  },
  redaction: {
    target: "jalon",
    field: "report_written_at",
    note: "Écrit « rapport rédigé » dans les jalons de l'affaire.",
  },
  envoi: {
    target: "jalon",
    field: "report_sent_at",
    note: "Écrit « rapport envoyé » dans les jalons de l'affaire.",
  },
  sondage: {
    target: "jalon",
    field: "survey_done_at",
    note: "Écrit « sondage réalisé » dans les jalons de l'affaire.",
  },
  rapport_sondage: {
    target: "jalon",
    field: "survey_report_sent_at",
    note: "Écrit « rapport de sondage envoyé » dans les jalons de l'affaire.",
  },
  solde: {
    target: "quote",
    field: "balance",
    note: "Le solde vit sur le devis : c'est son statut qui change.",
  },
  avis: {
    target: "jalon",
    field: "review_received_at",
    note: "Écrit « avis reçu » dans les jalons de l'affaire.",
  },
};

export function stepWrite(step: CycleStep): StepWrite {
  return WRITE[step];
}

/**
 * La date que le clic retirerait, ou rien.
 *
 * Elle répond à une question que l'écran doit poser avant d'afficher un
 * bouton : ce cran est-il franchi **par ce qu'on peut retirer ici**, ou par un
 * fait qui vit ailleurs ? Un cran vert sans date retirable est franchi par un
 * devis ou un échange, et proposer « Retirer » mentirait — le clic n'aurait
 * aucun effet visible.
 */
export function stepMarkedAt(
  step: CycleStep,
  jalons: Jalons,
  marks: StepMarks,
): string | null {
  const write = WRITE[step];
  switch (write.target) {
    case "mark":
      return marks[write.field];
    case "jalon":
      return jalons[write.field];
    case "materials":
      return jalons[write.field];
    case "worksite_date":
      return jalons.worksite_date;
    case "quote":
      return write.field === "deposit" ? jalons.deposit_paid_at : jalons.balance_paid_at;
  }
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
  | "open_worksite"
  | "send_plans"
  | "invoice_balance"
  | "ask_review"
  | "record_review"
  | "calc_done"
  | "final_ready"
  | "write_report"
  | "send_report"
  | "survey_done"
  | "send_survey_report";

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
  /*
    Un cran postérieur déjà franchi rend les précédents caducs.

    « Facture d'acompte à émettre alors que les autres étapes sont déjà
    faites » : mesuré sur la SCI La Baleine, dont le devis était `realise` sans
    qu'aucune marque ne porte le devis ni la signature. Chaque branche testait
    son cran **sans jamais regarder plus loin**, si bien que l'écran réclamait
    de l'argent déjà encaissé dès qu'une marque manquait en amont.

    La correction vit dans `at`, et non dans chaque branche : tout cran situé
    avant le dernier franchi est **rendu comme franchi**, donc les branches
    d'avant se taisent d'elles-mêmes et la prochaine action est la première
    vraie. Une seule ligne de vérité plutôt que dix tests à tenir d'accord — un
    garde-fou recopié est un garde-fou qu'on oublie.

    La frise, elle, ne change pas : elle continue de montrer le trou en gris,
    parce qu'il est réel et qu'on doit pouvoir le combler.
  */
  const dernierFranchi = points.reduce(
    (last, point, index) => (point.state === "done" ? index : last),
    -1,
  );
  const at = (step: CycleStep) => {
    const index = points.findIndex((point) => point.step === step);
    const point = points[index]!;
    return index < dernierFranchi ? { ...point, state: "done" as StepState } : point;
  };
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

  /*
    La signature, qui ne suit plus mécaniquement la négociation.

    Tant que les deux crans se franchissaient ensemble, tester la négociation
    suffisait. Depuis qu'une marque ne franchit que son cran, on peut cocher
    « Négociation » sans cocher « Signé » — et sans cette branche, l'écran
    proposait « Facture d'acompte à émettre » sur une affaire que la frise
    montre, juste au-dessus, comme non signée. Proposer d'encaisser avant de
    savoir si le client a dit oui est la pire des trois erreurs possibles.
  */
  const signe = at("signe");
  if (signe.state !== "done") {
    const days = signe.waiting ?? 0;
    return {
      step: "signe",
      title: "En attente de signature",
      detail:
        "La négociation est faite ; rien ne dit encore que le devis est accepté.",
      tone: waitingTone(days),
      alert: days > FRESH_DAYS,
      actions: [
        { key: "relance", label: "Relancer par e-mail", primary: true },
        { key: "refuse", label: "Refusé" },
        { key: "postpone", label: "Reporté" },
      ],
    };
  }

  const has = (step: CycleStep) => points.some((point) => point.step === step);

  /*
    Le rapport ou l'attestation, avant l'acompte.

    Il n'a pas d'acompte : il se paie en une fois, puis se rédige. Le laisser
    tomber dans la branche suivante proposerait « Facture d'acompte à émettre »
    sur une attestation, ce qui ferait douter de tout le reste de l'écran.
  */
  if (has("redaction")) {
    const solde = at("solde");
    if (solde.state !== "done") {
      const days = solde.waiting ?? 0;
      return {
        step: "solde",
        title: "Paiement de la commande attendu",
        detail: "Un rapport ou une attestation se règle en une fois, avant la rédaction.",
        tone: waitingTone(days),
        alert: days > FRESH_DAYS,
        actions: [{ key: "invoice_balance", label: "Paiement reçu", primary: true }],
      };
    }
    const redaction = at("redaction");
    if (redaction.state !== "done") {
      return enProduction(redaction, project, now, "Rapport à rédiger", "La commande est payée.", {
        key: "write_report",
        label: "Rapport rédigé",
      });
    }
    const envoi = at("envoi");
    if (envoi.state !== "done") {
      return enProduction(
        envoi,
        project,
        now,
        "Rapport à envoyer",
        jalons.report_validated_at ? "Validé, reste à l'envoyer." : "À relire et valider avant l'envoi.",
        { key: "send_report", label: "Rapport envoyé" },
      );
    }
    return soldeEtAvis(at, jalons, "envoi");
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

  /*
    À partir d'ici, les deux métiers divergent.

    Le bureau d'études prépare et envoie des plans ; l'entreprise de travaux
    réserve une date et commande du béton. Les proposer à l'un ce qui appartient
    à l'autre serait pire qu'inutile — « commander les matériaux » sur une étude
    ferait douter de tout le reste de l'écran.
  */
  /*
    La production d'une étude structurelle.

    Elle avait un seul cran, « plans envoyés », et l'écran sautait donc de
    l'acompte au solde sans rien dire du calcul ni du dessin — là où le temps
    passe, et où le client rappelle pour savoir où en est son dossier. La
    branche se choisit sur la frise elle-même : c'est la mission qui a décidé
    des crans, et la relire ici ferait deux déductions à tenir d'accord.
  */
  if (has("calcul")) {
    const calcul = at("calcul");
    if (calcul.state !== "done") {
      return enProduction(
        calcul,
        project,
        now,
        "Calcul à réaliser",
        jalons.calc_started_at
          ? "Le calcul est en cours chez l'ingénieur."
          : "L'acompte est encaissé : l'ingénieur peut commencer.",
        { key: "calc_done", label: "Calcul terminé" },
      );
    }
    const dossier = at("dossier");
    if (dossier.state !== "done") {
      return enProduction(
        dossier,
        project,
        now,
        jalons.corrections_at
          ? "Corrections en cours"
          : jalons.plans_review_at
            ? "Plans à valider"
            : "Plans à dessiner",
        jalons.plans_review_at
          ? "Le dessinateur a rendu, l'ingénieur relit."
          : "La note de calcul est faite, le dossier passe au dessin.",
        { key: "final_ready", label: "Dossier définitif" },
      );
    }
    const plans = at("plans");
    if (plans.state !== "done") {
      return enProduction(plans, project, now, "Dossier à envoyer au client", "Le dossier définitif est prêt.", {
        key: "send_plans",
        label: "Dossier envoyé",
      });
    }
    return soldeEtAvis(at, jalons, "plans");
  }

  if (has("sondage")) {
    const sondage = at("sondage");
    if (sondage.state !== "done") {
      return enProduction(sondage, project, now, "Sondage à réaliser", "L'acompte est encaissé.", {
        key: "survey_done",
        label: "Sondage réalisé",
      });
    }
    const rapport = at("rapport_sondage");
    if (rapport.state !== "done") {
      return enProduction(rapport, project, now, "Rapport de sondage à envoyer", "Le sondage est fait.", {
        key: "send_survey_report",
        label: "Rapport envoyé",
      });
    }
    return soldeEtAvis(at, jalons, "rapport_sondage");
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

  return soldeEtAvis(at, jalons, "materiaux");
}

/**
 * Une étape de production : ce qu'il faut faire, et le temps qu'il reste.
 *
 * Sans délai, l'attente depuis l'étape précédente décide de la couleur, comme
 * pour la date de chantier. Avec un délai, c'est lui qui parle : un dossier
 * commencé hier mais dû demain est plus urgent qu'un dossier ouvert depuis trois
 * semaines et dû dans un mois.
 */
function enProduction(
  point: CyclePoint,
  project: CycleInput,
  now: number,
  title: string,
  detail: string,
  action: { key: ActionKey; label: string },
): NextAction {
  const days = point.waiting ?? 0;
  const echeance = deadlineOf(project, false, now);
  const pressant = echeance !== null && echeance.tone !== "neutral";
  const long = days > PLANNING_GRACE_DAYS;
  return {
    step: point.step,
    title,
    detail: echeance ? `${detail} ${echeance.label}.` : detail,
    tone: echeance?.late || (!echeance && long) ? "danger" : "warning",
    alert: pressant || (!echeance && long),
    actions: [{ ...action, primary: true }],
  };
}

/** La phrase de fin, selon ce qui a été livré. */
const FIN_DE_COURSE: Partial<Record<CycleStep, string>> = {
  plans: "Dossier envoyé, solde encaissé, avis recueilli.",
  envoi: "Rapport envoyé, commande payée, avis recueilli.",
  rapport_sondage: "Rapport de sondage envoyé, solde encaissé, avis recueilli.",
  materiaux: "Chantier livré, solde encaissé, avis recueilli.",
};

/**
 * La fin de course, commune aux deux métiers : le solde, puis l'avis.
 *
 * **L'avis ne se demande qu'une fois l'argent rentré.** C'est la règle du
 * dirigeant, et le CRM peut la tenir seul puisqu'il connaît le statut du solde.
 * Réclamer un avis à un client qui n'a pas fini de payer est le meilleur moyen
 * d'en obtenir un mauvais.
 */
function soldeEtAvis(
  at: (step: CycleStep) => CyclePoint,
  jalons: Jalons,
  precedent: CycleStep,
): NextAction {
  // Seul le chantier se livre par ses matériaux : c'est la marque des travaux.
  const metier: Metier = precedent === "materiaux" ? "travaux" : "etudes";
  const solde = at("solde");
  if (solde.state !== "done") {
    const days = solde.waiting ?? 0;
    return {
      step: "solde",
      title: "Solde à facturer",
      detail: "La prestation est rendue. Rien d'autre ne bloque l'encaissement.",
      tone: waitingTone(days),
      alert: days > FRESH_DAYS,
      actions: [{ key: "invoice_balance", label: "Solde encaissé", primary: true }],
    };
  }

  const avis = at("avis");
  if (avis.state !== "done") {
    if (jalons.review_requested_at === null) {
      return {
        step: "avis",
        title: "Avis client à demander",
        detail: "Le solde est encaissé — c'est le moment de le demander.",
        tone: "info",
        alert: false,
        actions: [{ key: "ask_review", label: "Avis demandé", primary: true }],
      };
    }
    return {
      step: "avis",
      title: "Avis client en attente",
      detail: "Demandé, jamais revenu. Une relance vaut mieux qu'un silence.",
      tone: "warning",
      alert: false,
      actions: [{ key: "record_review", label: "Avis reçu", primary: true }],
    };
  }

  return {
    step: precedent,
    title: "Affaire terminée",
    detail: FIN_DE_COURSE[precedent] ?? "Solde encaissé, avis recueilli.",
    tone: "success",
    alert: false,
    // Un bureau d'études n'a pas de chantier à ouvrir : lui proposer le bouton
    // enverrait sur un écran qui ne le concerne pas.
    actions:
      metier === "travaux"
        ? [{ key: "open_worksite", label: "Ouvrir le chantier" }]
        : [],
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
