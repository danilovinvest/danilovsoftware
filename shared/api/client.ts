import { apiBase } from "@/shared/lib/env";
import { ApiError } from "./errors";

/**
 * Le jeton d'accès ne vit qu'en mémoire : ni localStorage ni cookie lisible,
 * donc rien à voler pour un script injecté. Il est reconstruit au chargement de
 * la page à partir du cookie de refresh (httpOnly).
 */
let accessToken: string | null = null;
let refreshPromise: Promise<MinimalSession | null> | null = null;

/** Ce que le client a besoin de connaître d'une session ; l'appelant en sait plus. */
type MinimalSession = { access_token: string };

/*
  Ceux qu'il faut prévenir quand la session se ferme.

  Le cache des écrans (`shared/api/cache.ts`) s'y inscrit pour se vider : les
  fiches d'un compte ne doivent pas s'afficher, même une fraction de seconde,
  sous le compte suivant. Le client n'en sait pas plus — il n'importe aucune
  bibliothèque de cache, et l'application de bureau, qui partage ce fichier,
  n'a rien à y changer.
*/
const sessionEndListeners = new Set<() => void>();

/** S'inscrit à la fin de session ; rend de quoi se désinscrire. */
export function onSessionEnd(listener: () => void): () => void {
  sessionEndListeners.add(listener);
  return () => {
    sessionEndListeners.delete(listener);
  };
}

function endSession() {
  accessToken = null;
  for (const listener of sessionEndListeners) listener();
}

export function setAccessToken(token: string | null) {
  if (token === null) endSession();
  else accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

/**
 * Renouvelle la session à partir du cookie httpOnly.
 *
 * C'est le SEUL endroit du front qui appelle /v1/auth/refresh : les appels
 * concurrents partagent la même promesse. L'API fait tourner le refresh token
 * à chaque appel et révoque toutes les sessions si un jeton déjà consommé est
 * rejoué — deux refresh en parallèle déconnecteraient donc l'utilisateur.
 */
/*
  `null` veut dire « le serveur refuse » : la session est finie. Une coupure
  réseau ou une panne du serveur **lève** une `ApiError` : elle ne dit rien de
  la session, et la confondre avec un refus renvoyait à l'écran de connexion au
  premier wifi coupé ou au réveil d'une veille, en perdant la saisie en cours.
*/
export function refreshSession<T extends MinimalSession>(): Promise<T | null> {
  refreshPromise ??= fetch(`${apiBase()}/v1/auth/refresh`, {
    method: "POST",
    credentials: "include",
  })
    .catch(() => {
      throw new ApiError(0, "network_error", "L'API est injoignable.");
    })
    .then(async (response) => {
      // Toute réponse 4xx est un refus : cookie absent, expiré ou révoqué.
      if (response.status >= 400 && response.status < 500) {
        endSession();
        return null;
      }
      if (!response.ok) {
        throw new ApiError(response.status, "internal_error", "Le serveur ne répond pas.");
      }
      const session = (await response.json()) as MinimalSession;
      accessToken = session.access_token;
      return session;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise as Promise<T | null>;
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /**
   * Le corps, **déjà sous forme d'objet** : c'est `apiFetch` qui sérialise.
   *
   * Le type était `unknown`, et une chaîne en est un. Passer un
   * `JSON.stringify(...)` compilait donc sans un mot, partait sérialisé deux
   * fois, et le serveur recevait une chaîne JSON là où il attendait un objet —
   * « le champ "" attend un type struct ». Sept appels d'un même module y sont
   * passés, sans que `tsc`, ESLint ni deux relectures ne puissent le voir.
   * `object` refuse une chaîne, un nombre et un booléen : la faute ne compile
   * plus.
   */
  body?: object | FormData;
  query?: Record<string, string | string[] | number | undefined | null>;
  signal?: AbortSignal;
  /** Interne : empêche une boucle de refresh infinie. */
  retryOnUnauthorized?: boolean;
};

function buildUrl(path: string, query: RequestOptions["query"]): URL {
  const url = new URL(`${apiBase()}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) url.searchParams.append(key, item);
    } else {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

/**
 * Un fichier, et non du JSON : l'aperçu d'un document.
 *
 * Même jeton, même renouvellement que `apiFetch` — un aperçu ouvert au bout de
 * seize minutes ne doit pas échouer sur un jeton expiré. Une erreur arrive, elle,
 * dans l'enveloppe JSON habituelle.
 */
export async function apiFetchBlob(
  path: string,
  options: Pick<RequestOptions, "query" | "signal" | "retryOnUnauthorized"> = {},
): Promise<Blob> {
  const { query, signal, retryOnUnauthorized = true } = options;
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), { headers, credentials: "include", signal });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new ApiError(0, "network_error", "L'API est injoignable.");
  }

  if (response.status === 401 && retryOnUnauthorized) {
    const renewed = await refreshSession();
    if (renewed) return apiFetchBlob(path, { ...options, retryOnUnauthorized: false });
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const error = payload?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "internal_error",
      error?.message ?? "Une erreur est survenue.",
      error?.fields ?? {},
    );
  }
  return response.blob();
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, signal, retryOnUnauthorized = true } = options;

  const url = buildUrl(path, query);

  const headers: Record<string, string> = {};
  // Un fichier part en multipart : le navigateur pose lui-même l'en-tête, avec
  // la frontière qui sépare les parties. L'écrire à la main la perdrait.
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      credentials: "include",
      signal,
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new ApiError(0, "network_error", "L'API est injoignable.");
  }

  if (response.status === 401 && retryOnUnauthorized) {
    const renewed = await refreshSession();
    if (renewed) {
      return apiFetch<T>(path, { ...options, retryOnUnauthorized: false });
    }
  }

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = payload?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "internal_error",
      error?.message ?? "Une erreur est survenue.",
      error?.fields ?? {},
    );
  }

  return payload as T;
}

export type Paginated<T> = {
  items: T[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
};
