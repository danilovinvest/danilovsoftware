import { apiFetch } from "@/shared/api/client";
import { formatDate } from "@/shared/lib/format";
import type { BankAccount } from "./receipt-types";

/**
 * Les relevés bancaires et leur rapprochement (migration 114).
 *
 * Le serveur sert des faits — les lignes, ce que la règle en propose, ce que
 * les relevés couvrent — et ce module en tire ce que l'écran dit. Rien ici ne
 * décide d'un rapprochement : une proposition se valide d'un clic, ou pas.
 */

export type BankLineStatus = "a_rapprocher" | "rapproche" | "ignore";

export interface SuggestedAllocation {
  quote_id: string;
  reference: string;
  customer: string;
  amount: string;
}

export interface BankSuggestion {
  /** « paiement » : un virement déjà saisi à pointer. « facture » : un
   *  encaissement à inscrire. « fiche » : payeur reconnu, aucune facture.
   *  Vide : rien à proposer. */
  kind: "paiement" | "facture" | "fiche" | "";
  sure: boolean;
  reason: string;
  group_id?: string;
  allocations?: SuggestedAllocation[];
  customer_id?: string;
  customer_name?: string;
  pending?: string;
}

export interface BankLine {
  id: string;
  bank_account_id: string;
  account_label: string;
  booked_at: string;
  label: string;
  detail: string;
  amount: string;
  status: BankLineStatus;
  note: string;
  payment_group_id: string | null;
  matched_by: string;
  decided_at: string | null;
  decided_by_name: string;
  suggestion?: BankSuggestion;
}

export interface StatementGap {
  from: string;
  to: string;
}

export interface BankCoverage {
  covered_until: string;
  gaps: StatementGap[];
  late: boolean;
}

export interface BankAccountState {
  account: BankAccount;
  coverage: BankCoverage;
  to_reconcile: number;
  to_reconcile_total: string;
}

export interface BankStatement {
  id: string;
  bank_account_id: string;
  account_label: string;
  period_start: string;
  period_end: string;
  file_name: string;
  lines_total: number;
  lines_new: number;
  imported_at: string;
  imported_by_name: string;
}

export interface StatementPreview {
  period_start: string;
  period_end: string;
  period_announced: boolean;
  lines: number;
  credits: number;
  credits_total: string;
  debits: number;
  debits_total: string;
  known: number;
  skipped: number;
}

export interface ReconcilePayload {
  group_id?: string;
  allocations?: { quote_id: string; amount: string }[];
  customer_id?: string | null;
  from_suggestion?: boolean;
}

export function bankOverview(signal?: AbortSignal) {
  return apiFetch<BankAccountState[]>("/v1/bank/overview", { signal });
}

export function listBankStatements(signal?: AbortSignal) {
  return apiFetch<BankStatement[]>("/v1/bank/statements", { signal });
}

export function listBankLines(status: BankLineStatus, account: string | null, signal?: AbortSignal) {
  return apiFetch<BankLine[]>("/v1/bank/lines", {
    query: { status, account: account ?? undefined },
    signal,
  });
}

function statementForm(file: File, accountId: string, period?: { start: string; end: string }) {
  const form = new FormData();
  form.append("file", file);
  form.append("bank_account_id", accountId);
  if (period) {
    form.append("period_start", period.start);
    form.append("period_end", period.end);
  }
  return form;
}

/** Ce qu'un fichier contient, sans rien écrire. */
export function previewStatement(file: File, accountId: string) {
  return apiFetch<StatementPreview>("/v1/bank/statements/preview", {
    method: "POST",
    body: statementForm(file, accountId),
  });
}

export function importStatement(file: File, accountId: string, period: { start: string; end: string }) {
  return apiFetch<BankStatement>("/v1/bank/statements", {
    method: "POST",
    body: statementForm(file, accountId, period),
  });
}

export function reconcileBankLine(id: string, payload: ReconcilePayload) {
  return apiFetch<void>(`/v1/bank/lines/${id}/reconcile`, { method: "POST", body: payload });
}

export function ignoreBankLine(id: string, note: string) {
  return apiFetch<void>(`/v1/bank/lines/${id}/ignore`, { method: "POST", body: { note } });
}

export function reopenBankLine(id: string) {
  return apiFetch<void>(`/v1/bank/lines/${id}/reopen`, { method: "POST", body: {} });
}

export function reconcileSure(account: string | null) {
  return apiFetch<{ reconciled: number }>("/v1/bank/reconcile-sure", {
    method: "POST",
    query: { account: account ?? undefined },
    body: {},
  });
}

/**
 * Ce qu'il faut envoyer pour valider une proposition telle quelle. Nul quand
 * elle ne propose rien d'écrivable : l'écran n'offre alors pas « Valider ».
 */
export function suggestionPayload(suggestion: BankSuggestion | undefined): ReconcilePayload | null {
  if (!suggestion) return null;
  if (suggestion.kind === "paiement" && suggestion.group_id) {
    return { group_id: suggestion.group_id, from_suggestion: true };
  }
  if (suggestion.kind === "facture" && suggestion.allocations?.length) {
    return {
      allocations: suggestion.allocations.map((a) => ({ quote_id: a.quote_id, amount: a.amount })),
      from_suggestion: true,
    };
  }
  if (suggestion.kind === "fiche" && suggestion.customer_id) {
    return { customer_id: suggestion.customer_id, from_suggestion: true };
  }
  return null;
}

/** Le libellé du bouton qui valide une proposition : il dit ce qui sera écrit. */
export function suggestionAction(suggestion: BankSuggestion | undefined): string {
  switch (suggestion?.kind) {
    case "paiement":
      return "Pointer ce virement";
    case "facture":
      return suggestion.pending ? "Encaisser, le reste en attente" : "Encaisser";
    case "fiche":
      return "Mettre en attente sur sa fiche";
    default:
      return "";
  }
}

export interface CoverageAlert {
  tone: "danger" | "warning";
  text: string;
}

/**
 * Ce qui manque aux relevés d'un compte : un trou entre deux relevés, ou rien
 * depuis trop longtemps. Un compte à jour ne rend rien — une alerte permanente
 * cesse d'être une alerte.
 */
export function coverageAlerts(coverage: BankCoverage): CoverageAlert[] {
  const alerts: CoverageAlert[] = coverage.gaps.map((gap) => ({
    tone: "danger" as const,
    text:
      gap.from === gap.to
        ? `Relevé manquant : le ${formatDate(gap.from)}`
        : `Relevé manquant : du ${formatDate(gap.from)} au ${formatDate(gap.to)}`,
  }));
  if (coverage.covered_until === "") {
    alerts.push({ tone: "warning", text: "Aucun relevé importé" });
  } else if (coverage.late) {
    alerts.push({
      tone: "warning",
      text: `Rien depuis le ${formatDate(coverage.covered_until)} : le relevé suivant manque`,
    });
  }
  return alerts;
}

/** Les propositions sûres d'une liste : celles que « Valider les sûres » prendra. */
export function sureCount(lines: BankLine[]): number {
  return lines.filter((line) => line.suggestion?.sure && suggestionPayload(line.suggestion)).length;
}
