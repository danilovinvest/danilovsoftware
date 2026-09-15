import type {
  Alert,
  Metier,
  ReadWorksite,
  StatusBucket,
  StudyStatus,
  Worksite,
  WorksiteQuote,
  WorksiteStatus,
} from "./types";
import { deadlineOf, deliveredAt, missionOf } from "@/modules/customers";

/**
 * Ce qui se déduit d'un chantier, et rien de plus.
 *
 * Module **pur** : ni React, ni réseau, et l'instant lui est passé en argument —
 * celui du serveur, pas celui du poste. C'est le même patron que `cycle.ts`
 * pour le cycle commercial, et pour la même raison : trois vues et cinq listes
 * lisent ces fonctions, et trois lectures séparées auraient divergé au premier
 * changement de règle.
 *
 * **Rien n'est inventé ici.** L'écran ne montre que ce que les données
 * portent : des dates de démarrage, des devis, des factures. Les coûts, la
 * marge, les PV de réception et les avis clients ont disparu — le CRM ne les a
 * jamais suivis, et une colonne vide qui prétend le contraire fait douter du
 * reste de l'écran.
 */

const DAY = 86_400_000;

/** Au-delà, un chantier démarré et jamais terminé mérite une question. */
export const RUNNING_LONG_DAYS = 60;
/** Au-delà, plus personne n'a écrit ni appelé à propos de ce chantier. */
export const SILENT_DAYS = 45;

function days(from: string, to: number): number {
  return Math.floor((to - new Date(from).getTime()) / DAY);
}

/**
 * Une facture se reconnaît à sa référence.
 *
 * C'est la numérotation de l'entreprise, lue des noms de fichiers OneDrive :
 * `DE2026-0048` est un devis, `FA2026-0106` une facture. Cent quatre factures
 * pour cent quatre-vingts devis — le signal est franc, et c'est le seul dont
 * on dispose : aucun montant, aucune date d'émission ne sont renseignés.
 */
export function isInvoice(quote: WorksiteQuote): boolean {
  return quote.reference.trim().toUpperCase().startsWith("FA");
}

/**
 * Où en est l'exécution.
 *
 * L'ordre des tests compte, et le premier est le plus fort : une affaire
 * `realise` est faite, qu'on connaisse ou non sa date de démarrage. La
 * reléguer « à planifier » parce que le dossier OneDrive ne portait pas de
 * date ferait remonter en alerte quatre-vingts chantiers terminés.
 */
export function statusOf(worksite: Worksite, now: number): WorksiteStatus {
  if (worksite.stage === "realise") return "realise";
  if (!worksite.started_at) return "a_planifier";
  return new Date(worksite.started_at).getTime() > now ? "planifie" : "en_cours";
}

/**
 * Où en est une étude.
 *
 * Le bureau d'études ne planifie pas, il produit. L'ordre des tests est celui
 * de l'argent : rien ne commence avant l'acompte, et rien n'est fini avant le
 * solde. Entre les deux, le seul jalon qui compte est le **rendu des plans** —
 * c'est le livrable, et l'équivalent exact de la date de chantier.
 */
export function studyOf(worksite: Worksite, soldee: boolean, acompte: boolean): StudyStatus {
  if (soldee) return "soldee";
  // Rendue, c'est ce que la mission livre : un dossier, un rapport, un sondage.
  if (rendueLe(worksite) !== null) return "rendue";
  if (!acompte) return "acompte_attendu";
  return "en_cours";
}

function rendueLe(worksite: Worksite): string | null {
  return deliveredAt(worksite, missionOf(worksite, worksite.quotes));
}

export const STUDY_ORDER: StudyStatus[] = [
  "acompte_attendu",
  "en_cours",
  "rendue",
  "soldee",
];

/**
 * Le chiffré d'un chantier.
 *
 * On additionne les **devis**, jamais les factures : une facture reprend le
 * montant du devis qu'elle solde, les compter toutes deux doublerait le
 * chantier. Quand aucun devis n'est chiffré, on rend `null` — un zéro se lirait
 * comme un chantier gratuit.
 */
function total(quotes: WorksiteQuote[], champ: "amount_ht" | "amount_ttc"): number | null {
  let somme = 0;
  let trouve = false;
  for (const quote of quotes) {
    const brut = quote[champ];
    if (!brut) continue;
    const valeur = Number(brut);
    if (Number.isNaN(valeur)) continue;
    somme += valeur;
    trouve = true;
  }
  return trouve ? somme : null;
}

export function read(worksite: Worksite, now: number): ReadWorksite {
  const factures = worksite.quotes.filter(isInvoice);
  const devis = worksite.quotes.filter((quote) => !isInvoice(quote));

  const acompte = worksite.quotes.some((q) => q.deposit_status === "recu");
  const soldee = worksite.quotes.some((q) => q.balance_status === "recu");

  return {
    worksite,
    status: statusOf(worksite, now),
    study: studyOf(worksite, soldee, acompte),
    daysRunning: worksite.started_at ? days(worksite.started_at, now) : null,
    daysSilent: worksite.last_interaction_at
      ? days(worksite.last_interaction_at, now)
      : null,
    // Un chantier réalisé ou une étude rendue ne sont plus en retard de rien.
    deadline: deadlineOf(
      worksite,
      worksite.stage === "realise" || rendueLe(worksite) !== null,
      now,
    ),
    invoiced: factures.length > 0,
    depositReceived: worksite.quotes.some((q) => q.deposit_status === "recu"),
    amountHT: total(devis, "amount_ht"),
    amountTTC: total(devis, "amount_ttc"),
    devis,
    factures,
  };
}

export const STATUS_ORDER: WorksiteStatus[] = [
  "a_planifier",
  "planifie",
  "en_cours",
  "realise",
];

export function buckets(reads: ReadWorksite[], metier: Metier): StatusBucket[] {
  if (metier === "etudes") {
    return STUDY_ORDER.map((status) => ({
      status,
      count: reads.filter((r) => r.study === status).length,
    }));
  }
  return STATUS_ORDER.map((status) => ({
    status,
    count: reads.filter((r) => r.status === status).length,
  }));
}

function alert(read: ReadWorksite, reason: string): Alert {
  return {
    worksite_id: read.worksite.id,
    label: read.worksite.label,
    customer_name: read.worksite.customer_name,
    reason,
    amount: read.amountHT,
  };
}

/** Le total d'une liste de travail. Nul quand rien n'y est chiffré. */
export function alertTotal(rows: Alert[]): number | null {
  const chiffres = rows.filter((row) => row.amount !== null);
  return chiffres.length === 0
    ? null
    : chiffres.reduce((sum, row) => sum + (row.amount ?? 0), 0);
}

/**
 * Les quatre listes de travail.
 *
 * Chacune se lit sur une colonne réelle, et chacune est peuplée — une liste
 * d'alertes vide en permanence apprend à ignorer le bloc entier.
 */
/**
 * Les quatre listes de travail du bureau d'études.
 *
 * Ce ne sont pas celles des travaux, et c'est tout l'intérêt d'un écran à part :
 * une étude ne manque pas de date de démarrage, elle manque d'acompte, de
 * plans rendus, ou d'une facture de solde. Chacune se lit sur une colonne
 * réelle, et chacune est peuplée.
 */
export function studyAlerts(reads: ReadWorksite[]) {
  const attente = reads
    .filter((r) => r.study === "acompte_attendu")
    .map((r) => alert(r, "Signée, acompte non encaissé — l'étude ne démarre pas"));

  /*
    Une étude en production inquiète quand son délai approche ou passe, et à
    défaut de délai quand elle dure. Celles qui sont en retard passent devant :
    c'est une promesse faite au client qu'on est en train de ne pas tenir.
  */
  const pressante = (r: ReadWorksite) => r.deadline !== null && r.deadline.tone !== "neutral";
  const production = reads
    .filter(
      (r) =>
        r.study === "en_cours" &&
        (pressante(r) || (r.deadline === null && (r.daysRunning ?? 0) > RUNNING_LONG_DAYS)),
    )
    .sort(
      (a, b) =>
        Number(b.deadline?.late ?? false) - Number(a.deadline?.late ?? false) ||
        (b.daysRunning ?? 0) - (a.daysRunning ?? 0),
    )
    .map((r) =>
      alert(r, pressante(r) ? r.deadline!.label : `En production depuis ${r.daysRunning} jours`),
    );

  const aFacturer = reads
    .filter((r) => r.study === "rendue")
    .map((r) => alert(r, "Rendue au client, solde non encaissé"));

  const avis = reads
    .filter(
      (r) =>
        r.study === "soldee" &&
        r.worksite.review_requested_at === null &&
        r.worksite.review_received_at === null,
    )
    .map((r) => alert(r, "Soldée — c'est le moment de demander l'avis"));

  return { unplanned: attente, running: production, toInvoice: aFacturer, noDeposit: avis };
}

export function alerts(reads: ReadWorksite[]) {
  const unplanned = reads
    .filter((r) => r.status === "a_planifier")
    .map((r) =>
      alert(
        r,
        r.depositReceived
          ? "Acompte encaissé, aucune date de démarrage"
          : "Signé, aucune date de démarrage",
      ),
    );

  const running = reads
    .filter((r) => r.status === "en_cours" && (r.daysRunning ?? 0) > RUNNING_LONG_DAYS)
    .sort((a, b) => (b.daysRunning ?? 0) - (a.daysRunning ?? 0))
    .map((r) => alert(r, `Démarré il y a ${r.daysRunning} jours, non terminé`));

  const toInvoice = reads
    .filter((r) => r.status === "realise" && !r.invoiced)
    .map((r) => alert(r, "Réalisé, aucune facture au dossier"));

  const noDeposit = reads
    .filter((r) => !r.depositReceived && r.status !== "realise")
    .map((r) => alert(r, "Signé, acompte non encaissé"));

  return { unplanned, running, toInvoice, noDeposit };
}

/** Les chantiers dont la dernière trace remonte à loin. Sert la fiche, pas les alertes. */
export function isSilent(read: ReadWorksite): boolean {
  return read.daysSilent !== null && read.daysSilent > SILENT_DAYS;
}
