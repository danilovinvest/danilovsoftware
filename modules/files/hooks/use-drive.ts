"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/shared/api/errors";
import * as api from "../lib/api";
import type { DriveAccount, DriveListing, DriveRun } from "../lib/types";

/**
 * Le compte OneDrive raccordé.
 *
 * Même motif que partout ailleurs dans le CRM : la clé de la requête voyage
 * avec son résultat, et `loading` s'en déduit. Un `setLoading(true)` dans
 * l'effet ferait un rendu de plus et se ferait refuser par le compilateur React.
 */
export function useDrive() {
  const [token, setToken] = useState(0);
  const key = `drive:${token}`;
  const [resolved, setResolved] = useState<{
    key: string;
    accounts: DriveAccount[];
    configured: boolean;
    error: string | null;
  }>({ key: "", accounts: [], configured: false, error: null });

  useEffect(() => {
    const controller = new AbortController();
    api
      .listAccounts(controller.signal)
      .then((data) =>
        setResolved({ key, accounts: data.items, configured: data.configured, error: null }),
      )
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResolved({
          key,
          accounts: [],
          configured: false,
          error: error instanceof Error ? error.message : "Raccordement illisible.",
        });
      });
    return () => controller.abort();
  }, [key]);

  // Stable, pour qu'un écran puisse relire au retour de Microsoft sans boucler.
  const reload = useCallback(() => setToken((value) => value + 1), []);

  return {
    accounts: resolved.accounts,
    configured: resolved.configured,
    loading: resolved.key !== key,
    error: resolved.error,
    reload,
  };
}

/**
 * Le contenu d'un dossier.
 *
 * L'appel part à chaque changement de chemin, sans cache : une arborescence
 * recopiée serait fausse dès le premier dossier créé depuis l'Explorateur, et
 * le CRM n'a aucune raison de tenir un second exemplaire de ce que OneDrive
 * tient déjà.
 */
export function useListing(path: string) {
  const [resolved, setResolved] = useState<{
    key: string;
    listing: DriveListing | null;
    error: string | null;
    notFound: boolean;
  }>({ key: " ", listing: null, error: null, notFound: false });

  useEffect(() => {
    const controller = new AbortController();
    api
      .browse(path, controller.signal)
      .then((listing) => setResolved({ key: path, listing, error: null, notFound: false }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResolved({
          key: path,
          listing: null,
          error: error instanceof Error ? error.message : "Dossier illisible.",
          // Un dossier renommé dans l'Explorateur n'est pas une panne : la
          // fiche le dit comme tel, avec le chemin qu'elle cherchait.
          notFound: error instanceof ApiError && error.status === 404,
        });
      });
    return () => controller.abort();
  }, [path]);

  return {
    listing: resolved.key === path ? resolved.listing : null,
    loading: resolved.key !== path,
    error: resolved.key === path ? resolved.error : null,
    notFound: resolved.key === path && resolved.notFound,
  };
}

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

  const reload = useCallback(() => setToken((value) => value + 1), []);

  return {
    runs: resolved.runs,
    syncing: resolved.syncing,
    reload,
  };
}
