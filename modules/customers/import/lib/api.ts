import { apiBase } from "@/shared/lib/env";
import { apiFetch, getAccessToken, refreshSession } from "@/shared/api/client";
import { ApiError } from "@/shared/api/errors";
import type { ImportReport, ImportStatus, Plan } from "./types";

export function getStatus() {
  return apiFetch<ImportStatus>("/v1/imports/excel");
}

/**
 * Analyse le classeur sans rien écrire. Sans fichier fourni, l'API reprend
 * celui posé à la racine du projet — c'est le chemin « en un clic ».
 *
 * L'envoi passe par fetch directement plutôt que par apiFetch : ce dernier
 * sérialise le corps en JSON, ce qui ne convient pas à un multipart.
 */
export async function analyze(file?: File): Promise<Plan> {
  const headers: Record<string, string> = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  // Le corps est reconstruit à chaque tentative : un FormData déjà envoyé ne
  // se rejoue pas de façon fiable après un renouvellement de jeton.
  const send = () => {
    let body: FormData | undefined;
    if (file) {
      body = new FormData();
      body.append("file", file);
    }
    return fetch(`${apiBase()}/v1/imports/excel/analyze`, {
      method: "POST",
      headers,
      body,
    });
  };

  let response = await send();

  if (response.status === 401) {
    const renewed = await refreshSession();
    if (renewed) {
      headers.Authorization = `Bearer ${renewed.access_token}`;
      response = await send();
    }
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = payload?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "internal_error",
      error?.message ?? "L'analyse du fichier a échoué.",
      error?.fields ?? {},
    );
  }
  return payload as Plan;
}

/** Écrit le plan relu. L'API applique tout en une transaction. */
export function apply(plan: Plan) {
  return apiFetch<ImportReport>("/v1/imports/excel/apply", {
    method: "POST",
    body: plan,
  });
}
