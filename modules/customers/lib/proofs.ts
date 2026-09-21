import type { CycleStep } from "./cycle";
import type { Interaction, ProofBatch, Quote } from "./types";

/**
 * Ce qui prouve déjà un cran, sans qu'on ait rien à joindre.
 *
 * Le dirigeant : « je peux cocher, mais je ne peux rien prouver ». Une partie de
 * la preuve est pourtant en base — le PDF d'un devis, la facture d'acompte, le
 * compte rendu d'un rendez-vous. Le cran la montre et l'ouvre d'un clic ; ce
 * qui manque se joint à la main (`StepProof`).
 *
 * Module pur : il lit ce que la fiche a déjà servi, sans aller chercher plus.
 */

export type AutoProof = {
  /** « Devis DE2026-0022 », « Facture FA2026-0106 », « RDV du 12 sept. ». */
  label: string;
  /** Le document chez Microsoft, quand il y en a un. */
  href: string;
  at: string | null;
};

const isInvoice = (quote: Quote) => quote.reference.toUpperCase().startsWith("FA");

/*
  Une facture d'acompte se reconnaît à ce qu'elle dit d'elle-même.

  Les deux crans montraient toutes les factures de l'affaire, si bien que la
  facture de solde apparaissait sous l'acompte — « il y a une facture jointe à
  la facture d'acompte ». Mesuré le 21/09 : 30 affaires portent plusieurs
  factures. La ligne que la lecture du PDF a retenue les départage — « Total
  acompte HT », « Montant acompte HT » d'un côté, « Montant de la facture HT »
  de l'autre —, et le nom du fichier ou l'intitulé à défaut (« Acompte N°1 sur
  devis… »).
*/
const isDepositInvoice = (quote: Quote) =>
  /acompte/i.test(`${quote.amount_evidence} ${quote.drive_name} ${quote.label}`);

function quoteProof(quote: Quote, prefix: string): AutoProof {
  return {
    label: `${prefix} ${quote.reference || quote.label || ""}`.trim(),
    href: quote.drive_url,
    at: quote.issued_at,
  };
}

function interactionProof(interaction: Interaction, label: string): AutoProof {
  const summary = interaction.summary?.trim();
  return {
    label: summary ? `${label} — ${summary.slice(0, 80)}` : label,
    href: "",
    at: interaction.occurred_at,
  };
}

export function autoProofsOf(
  step: CycleStep,
  quotes: Quote[],
  interactions: Interaction[],
): AutoProof[] {
  const devis = quotes.filter((quote) => !isInvoice(quote));
  const factures = quotes.filter(isInvoice);
  const signes = devis.filter((quote) => quote.status === "accepte" || quote.status === "realise");
  const ofKind = (kind: string) => interactions.filter((entry) => entry.kind === kind);

  switch (step) {
    case "contact":
      return interactions.slice(-1).map((entry) => interactionProof(entry, "Premier échange"));
    case "rdv":
      return ofKind("rdv").map((entry) => interactionProof(entry, "Rendez-vous"));
    case "rapport":
      return ofKind("rapport").map((entry) => interactionProof(entry, "Rapport"));
    case "devis":
    case "negociation":
      return devis.map((quote) => quoteProof(quote, "Devis"));
    case "signe":
      return signes.map((quote) => quoteProof(quote, "Devis signé"));
    case "acompte":
      return factures
        .filter(isDepositInvoice)
        .map((quote) => quoteProof(quote, "Facture d'acompte"));
    case "solde":
      return factures
        .filter((quote) => !isDepositInvoice(quote))
        .map((quote) => quoteProof(quote, "Facture"));
    default:
      return [];
  }
}

/** Ce qu'une preuve déposée a fait, en une ligne : où, combien, ce qui manque. */
export function describeBatch(batch: ProofBatch): string {
  const parts: string[] = [];
  if (batch.folder_path) {
    const where = batch.folder_path.split("/").slice(-2).join("/");
    parts.push(`Rangé dans ${where}${batch.folder_created ? " (dossier créé)" : ""}`);
  }
  const files = batch.proofs.filter((proof) => proof.drive_url).length;
  if (files > 1) parts.push(`${files} fichiers déposés`);
  if (batch.skipped.length > 0) parts.push(`non copiées : ${batch.skipped.join(", ")}`);
  if (batch.warning) parts.push(batch.warning);
  return parts.join(" · ");
}
