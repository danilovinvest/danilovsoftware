import type {
  Alert,
  ReadWorksite,
  StatusBucket,
  Worksite,
  WorksiteQuote,
  WorksiteStatus,
} from "./types";

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

  return {
    worksite,
    status: statusOf(worksite, now),
    daysRunning: worksite.started_at ? days(worksite.started_at, now) : null,
    daysSilent: worksite.last_interaction_at
      ? days(worksite.last_interaction_at, now)
      : null,
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

export function buckets(reads: ReadWorksite[]): StatusBucket[] {
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
