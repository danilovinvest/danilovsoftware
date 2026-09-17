/**
 * Où joindre l'API Go.
 *
 * Toutes les requêtes du CRM partent du navigateur : le refresh token vit dans
 * un cookie httpOnly posé par l'API, qu'un Server Component ne peut pas lire.
 *
 * **La base est vide en production, et c'est voulu.** Le CRM y est servi sur
 * trois hôtes — le portail et les deux sociétés — par un seul conteneur, et
 * Caddy route `/v1/*` vers l'API sur chacun d'eux. Chaque page appelle donc
 * l'API de **sa propre origine** : aucune requête n'est inter-origines, donc
 * aucun CORS avec identifiants ni cookie tierce-partie. Figer l'apex à la
 * compilation aurait fait l'inverse — une page servie sur `groupe.…` appelant
 * `testbeforeproduction.xyz`, ce que le Caddyfile du dépôt décrit depuis
 * l'origine comme « plus fragile pour rien ».
 *
 * En développement la valeur est renseignée (`http://localhost:8080`) parce que
 * le front tourne sur un autre port : c'est là le seul cas où les deux origines
 * diffèrent vraiment.
 */
const CONFIGURED = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

/**
 * La base absolue à préfixer à un chemin d'API.
 *
 * Absolue et non relative : `new URL()` refuse un chemin seul, et l'adresse du
 * connecteur MCP doit pouvoir être collée dans ChatGPT — donc être complète.
 *
 * L'origine du navigateur n'est lue qu'au moment de l'appel. La lire au chargement
 * du module donnerait deux réponses — le serveur n'a pas de `window` — et c'est
 * l'écart d'hydratation que le CRM évite partout ailleurs.
 */
export function apiBase(): string {
  if (CONFIGURED !== "") return CONFIGURED;
  if (typeof window !== "undefined") return window.location.origin;
  // Rendu côté serveur sans base configurée : aucune requête ne part d'ici,
  // mais `new URL` exige une valeur absolue plutôt qu'une chaîne vide.
  return "http://localhost:8080";
}
