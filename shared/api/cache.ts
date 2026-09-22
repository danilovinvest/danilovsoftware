"use client";

import useSWR, { unload, type SWRConfiguration, type SWRResponse } from "swr";
import { onSessionEnd } from "./client";

/**
 * Le cache des lectures, partagé par tous les écrans.
 *
 * Chaque écran rechargeait tout à chaque visite : revenir sur une fiche
 * repeignait ses squelettes, et l'annuaire des collègues partait trois fois
 * par fiche. SWR garde la dernière réponse de chaque question et la montre
 * **tout de suite**, puis la revérifie en arrière-plan — l'écran ne repart
 * jamais de zéro pour une question déjà posée.
 *
 * **Le chargement passe toujours par `apiFetch`** : les fonctions d'appel des
 * modules sont les fetchers. Le jeton reste en mémoire dans le client, et le
 * renouvellement reste le sien, dédupliqué : un second chemin vers
 * `/v1/auth/refresh` déconnecterait l'utilisateur (détection de rejeu).
 *
 * La clé est une chaîne préfixée par le module (`customers:detail:<id>`) :
 * deux modules ne se marchent pas dessus, et une clé se lit dans un débogueur.
 */

/*
  La session qui se ferme emporte le cache.

  Déconnexion ou refus du renouvellement : les fiches d'un compte ne doivent
  pas apparaître sous le compte suivant sur le même poste. `unload` vide tout
  et abandonne les requêtes en vol — une réponse de l'ancien compte arrivée
  après coup ne peut donc pas repeupler le cache. Sans revalidation : il n'y a
  plus de jeton, relire maintenant ne rendrait que des 401.
*/
onSessionEnd(() => unload({ revalidate: false }));

/*
  Pas de nouvel essai automatique après une erreur. Les écrans l'affichent avec
  « Réessayer », comme avant : un nouvel essai silencieux ferait tourner un
  squelette à la place d'un message, et marteler un serveur qui refuse (un 403,
  un 404) n'y changerait rien. Le retour du réseau et du focus relancent, eux.
*/
const BASE: SWRConfiguration = {
  shouldRetryOnError: false,
};

/**
 * Ce qui bouge sous les yeux de l'équipe : fiches, listes, comptes.
 *
 * Revérifié au retour sur l'onglet, mais au plus une fois par minute — un
 * aller-retour entre deux fenêtres ne doit pas relancer chaque écran monté.
 * Les montages rapprochés (trois composants qui posent la même question) ne
 * font qu'une requête.
 */
export const LIVE: SWRConfiguration = {
  ...BASE,
  revalidateOnFocus: true,
  focusThrottleInterval: 60_000,
  dedupingInterval: 5_000,
};

/**
 * Ce qui ne change presque jamais : l'annuaire des collègues.
 *
 * Une requête pour toute l'application, jusqu'au rechargement de la page ou à
 * la déconnexion. Un collègue ajouté dans la journée apparaît au rechargement
 * suivant, ce qui est le rythme auquel on embauche.
 */
export const STABLE: SWRConfiguration = {
  ...BASE,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  revalidateIfStale: false,
};

/**
 * Ce qui coûte un appel à Microsoft Graph : le contenu d'un dossier OneDrive.
 *
 * Jamais relancé par le focus ni par le réseau. Rouvrir le même dossier dans
 * la minute reprend la réponse en cache sans appel ; au-delà, elle s'affiche
 * tout de suite et un seul appel la revérifie — une arborescence recopiée
 * serait fausse dès le premier dossier créé depuis l'Explorateur, le cache ne
 * sert donc qu'à ne pas repeindre, jamais à se dispenser de relire.
 */
export const COSTLY: SWRConfiguration = {
  ...BASE,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 60_000,
};

/**
 * Une lecture en cache. `key` à `null` ne charge rien (une question qui n'a
 * pas encore de sens). `load` passe par les fonctions d'appel du module.
 */
export function useCached<T>(
  key: string | null,
  load: () => Promise<T>,
  config: SWRConfiguration = LIVE,
): SWRResponse<T, unknown> {
  return useSWR<T, unknown>(key, load, config);
}
