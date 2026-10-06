import { apiFetch } from "@/shared/api/client";
import type { Building, BuildingDocumentPayload, UnitPayload } from "./building-types";

/**
 * Les appels de l'espace copropriété (migration 110). Chaque écriture rend
 * l'immeuble entier : l'écran remplace ce qu'il montre.
 */

export function getBuilding(customerId: string, signal?: AbortSignal) {
  return apiFetch<Building>(`/v1/customers/${customerId}/building`, { signal });
}

/** Crée un lot, ou corrige celui qu'on désigne. */
export function saveUnit(customerId: string, unitId: string | null, payload: UnitPayload) {
  return apiFetch<Building>(
    unitId ? `/v1/customers/${customerId}/units/${unitId}` : `/v1/customers/${customerId}/units`,
    { method: unitId ? "PUT" : "POST", body: payload },
  );
}

export function deleteUnit(customerId: string, unitId: string) {
  return apiFetch<Building>(`/v1/customers/${customerId}/units/${unitId}`, { method: "DELETE" });
}

/** Ajoute une pièce au dossier, ou corrige celle qu'on désigne. */
export function saveBuildingDocument(
  customerId: string,
  documentId: string | null,
  payload: BuildingDocumentPayload,
) {
  const base = `/v1/customers/${customerId}/building-documents`;
  return apiFetch<Building>(documentId ? `${base}/${documentId}` : base, {
    method: documentId ? "PUT" : "POST",
    body: payload,
  });
}

export function deleteBuildingDocument(customerId: string, documentId: string) {
  return apiFetch<Building>(`/v1/customers/${customerId}/building-documents/${documentId}`, {
    method: "DELETE",
  });
}

/** Le numéro de l'immeuble chez son syndic, sur le mandat. */
export function setLinkReference(linkId: string, reference: string) {
  return apiFetch<void>(`/v1/links/${linkId}/reference`, { method: "PUT", body: { reference } });
}
