"use client";

import { useCallback, useEffect, useState } from "react";
import { COSTLY, LIVE, useCached } from "@/shared/api/cache";
import { ApiError } from "@/shared/api/errors";
import * as api from "../lib/api";
import type { DriveAccount, DriveRun } from "../lib/types";

/**
 * Le compte OneDrive raccordé.
 *
 * Dans le cache partagé : l'écran des réglages et celui de l'arborescence
 * posent la même question, une seule requête y répond.
 */
export function useDrive() {
  const { data, error, isValidating, mutate } = useCached(
    "files:accounts",
    () => api.listAccounts(),
    LIVE,
  );
  const reload = useCallback(() => void mutate(), [mutate]);

  return {
    accounts: data?.items ?? NO_ACCOUNTS,
    configured: data?.configured ?? false,
    loading: isValidating && data === undefined,
    error: error ? errorMessage(error, "Raccordement illisible.") : null,
    reload,
  };
}

/**
 * Le contenu d'un dossier.
 *
 * Chaque parcours interroge Microsoft Graph, et c'est cher : l'onglet
 * Documents d'une affaire repartait à zéro à chaque changement d'onglet. La
 * réponse est gardée **pour ne pas repeindre**, jamais pour se dispenser de
 * relire — une arborescence recopiée serait fausse dès le premier dossier créé
 * depuis l'Explorateur. Revenir dans la minute ne rappelle pas Graph ; au-delà,
 * la réponse connue s'affiche et un seul appel la revérifie. Ni le focus ni le
 * réseau ne relancent (voir `COSTLY`).
 */
export function useListing(path: string) {
  const { data, error } = useCached(`files:browse:${path}`, () => api.browse(path), COSTLY);

  return {
    listing: data ?? null,
    loading: data === undefined && !error,
    error: error ? errorMessage(error, "Dossier illisible.") : null,
    // Un dossier renommé dans l'Explorateur n'est pas une panne : la fiche le
    // dit comme tel, avec le chemin qu'elle cherchait.
    notFound: error instanceof ApiError && error.status === 404,
  };
}

/** Le message d'une erreur, ou la phrase de l'écran quand elle n'en a pas. */
function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

const NO_ACCOUNTS: DriveAccount[] = [];

/**
 * Le journal des copies.
 *
 * Il se rafraîchit tant qu'une copie tourne : le badge « en cours » doit
 * s'éteindre tout seul, sinon il faudrait recharger la page pour savoir si le
 * travail est fini.
 */
export function useDriveRuns() {
  const [token, setToken] = useState(0);
  const key = `runs:${token}`;
  const [resolved, setResolved] = useState<{
    key: string;
    runs: DriveRun[];
    syncing: boolean;
  }>({ key: "", runs: [], syncing: false });

  useEffect(() => {
    const controller = new AbortController();
    api
      .listRuns(20, controller.signal)
      .then((data) => setResolved({ key, runs: data.items, syncing: data.syncing }))
      .catch(() => {
        if (!controller.signal.aborted) setResolved({ key, runs: [], syncing: false });
      });
    return () => controller.abort();
  }, [key]);

  useEffect(() => {
    if (!resolved.syncing) return;
    const timer = setTimeout(() => setToken((value) => value + 1), 5000);
    return () => clearTimeout(timer);
  }, [resolved.syncing, resolved.key]);

  // Stable, pour qu'un écran puisse relire au retour de Microsoft sans boucler.
  const reload = useCallback(() => setToken((value) => value + 1), []);

  return {
    runs: resolved.runs,
    syncing: resolved.syncing,
    reload,
  };
}
