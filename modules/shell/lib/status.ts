import { apiFetch } from "@/shared/api/client";

/** Miroir de `internal/status` côté API. */
export type CheckState = "ok" | "stale" | "error";
export type Overall = "ok" | "degraded" | "down";

export type StatusCheck = {
  key: string;
  label: string;
  state: CheckState;
  last_success_at?: string;
  latency_ms?: number;
};

export type StatusReport = {
  version: { commit: string; built_at: string | null };
  started_at: string;
  checked_at: string;
  overall: Overall;
  checks: StatusCheck[];
};

export function getStatus(signal?: AbortSignal) {
  return apiFetch<StatusReport>("/v1/status", { signal });
}

/**
 * La version du bundle chargé dans cet onglet, gravée à la compilation.
 * Vide en développement : le bandeau affiche alors « dev ».
 */
export const BUNDLE_VERSION = {
  commit: process.env.NEXT_PUBLIC_BUILD_COMMIT ?? "",
  builtAt: process.env.NEXT_PUBLIC_BUILT_AT ?? "",
};

/**
 * Une mise à jour est disponible quand l'API tourne sur un autre déploiement
 * que celui dont vient la page.
 *
 * On compare l'**instant de construction** et pas seulement le commit : deux
 * déploiements d'un arbre modifié portent le même `abc1234-dirty`, et seul
 * l'horodatage les distingue. deploy.sh donne le même aux deux images.
 *
 * Une version inconnue d'un côté ou de l'autre — développement, application de
 * bureau qui construit son propre bundle — ne propose jamais rien : annoncer
 * une mise à jour qu'un rechargement ne ferait pas disparaître serait pire que
 * de se taire.
 */
export function updateAvailable(report: StatusReport, bundle = BUNDLE_VERSION): boolean {
  if (!bundle.builtAt || !report.version.built_at) return false;
  const loaded = Date.parse(bundle.builtAt);
  const running = Date.parse(report.version.built_at);
  if (Number.isNaN(loaded) || Number.isNaN(running)) return false;
  return running !== loaded || report.version.commit !== bundle.commit;
}

/** Où lire le détail d'une vérification : l'écran de réglages de l'intégration. */
export const CHECK_HREF: Record<string, string> = {
  mail: "/settings/messagerie",
  agenda: "/settings/agenda",
  onedrive: "/settings/fichiers",
};
