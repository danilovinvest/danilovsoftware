import { apiFetch } from "@/shared/api/client";
import type {
  BillingRules,
  BuildingRef,
  Dunning,
  DunningPayload,
  Management,
  Portfolio,
  ProjectBilling,
  Recovery,
} from "./syndic-types";

/**
 * Les appels de l'espace syndic (migration 109). Les montants sont ceux de la
 * société du compte : `issuer` n'est qu'une lentille pour « tout le groupe ».
 */

function withIssuer(path: string, issuer?: string) {
  return issuer ? `${path}?issuer=${encodeURIComponent(issuer)}` : path;
}

/** Le portefeuille d'un syndic ou d'un gestionnaire. */
export function getPortfolio(customerId: string, issuer?: string, signal?: AbortSignal) {
  return apiFetch<Portfolio>(withIssuer(`/v1/customers/${customerId}/portfolio`, issuer), { signal });
}

/** La gestion d'une copropriété : ses syndics, qui la suit, ses règles. */
export function getManagement(customerId: string, signal?: AbortSignal) {
  return apiFetch<Management>(`/v1/customers/${customerId}/management`, { signal });
}

/** Les règles de facturation d'une fiche : seuls les champs envoyés changent. */
export function setBillingRules(customerId: string, rules: Partial<BillingRules>) {
  return apiFetch<BillingRules>(`/v1/customers/${customerId}/billing-rules`, {
    method: "PUT",
    body: rules,
  });
}

/** Le successeur d'un cabinet, `null` pour le retirer. */
export function setSuccessor(
  customerId: string,
  payload: { successor_id: string | null; since: string | null; transfer_buildings: boolean },
) {
  return apiFetch<void>(`/v1/customers/${customerId}/successor`, { method: "PUT", body: payload });
}

/** Les bornes d'une époque de gestion ou d'une succession. */
export function setLinkPeriod(linkId: string, period: { started_at: string | null; ended_at: string | null }) {
  return apiFetch<void>(`/v1/links/${linkId}/period`, { method: "PUT", body: period });
}

/** Les immeubles que suit un interlocuteur : la liste entière. */
export function setContactBuildings(contactId: string, buildingIds: string[]) {
  return apiFetch<BuildingRef[]>(`/v1/contacts/${contactId}/buildings`, {
    method: "PUT",
    body: { building_ids: buildingIds },
  });
}

/** Le circuit de facturation d'une affaire. */
export function getProjectBilling(projectId: string, signal?: AbortSignal) {
  return apiFetch<ProjectBilling>(`/v1/projects/${projectId}/billing`, { signal });
}

/** L'échelle de recouvrement d'une facture, et son reste dû du jour. */
export function getDunning(quoteId: string, signal?: AbortSignal) {
  return apiFetch<Dunning>(`/v1/quotes/${quoteId}/dunning`, { signal });
}

export function addDunningStep(quoteId: string, payload: DunningPayload) {
  return apiFetch<Dunning>(`/v1/quotes/${quoteId}/dunning`, { method: "POST", body: payload });
}

export function removeDunningStep(quoteId: string, stepId: string) {
  return apiFetch<Dunning>(`/v1/quotes/${quoteId}/dunning/${stepId}`, { method: "DELETE" });
}

/** Tout ce qui est à recouvrer, dans le périmètre du compte. */
export function listRecovery(issuer?: string, signal?: AbortSignal) {
  return apiFetch<Recovery[]>(withIssuer("/v1/recovery", issuer), { signal });
}
