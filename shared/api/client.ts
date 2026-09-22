import { apiBase } from "@/shared/lib/env";
import { refreshNative } from "@/shared/desktop/session";
import { APP_VERSION, markUpdateRequired } from "@/shared/desktop/update-required";
import { ApiError } from "./errors";

/**
 * Le jeton d'accès ne vit qu'en mémoire : ni localStorage ni cookie lisible,
 * donc rien à voler pour un script injecté. Il est reconstruit au lancement par
 * la coque, qui garde le refresh token dans le trousseau du système.
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
 * Renouvelle la session par la coque.
 *
 * C'est le SEUL endroit de l'interface qui demande un renouvellement : les
 * appels concurrents partagent la même promesse. L'API fait tourner le refresh
 * token à chaque appel et révoque toutes les sessions si un jeton consommé est
 * rejoué — la coque sérialise de son côté, et cette promesse partagée évite de
 * lui envoyer dix demandes quand dix requêtes rencontrent le même 401.
 *
 * Une API injoignable lève une erreur sans rien oublier : la coque garde le
 * jeton, qui resservira au prochain essai.
 */
export function refreshSession<T extends MinimalSession>(): Promise<T | null> {
  refreshPromise ??= refreshNative<T & { token_type: string; expires_in: number; user: unknown }>()
    .then((session) => {
      if (session) accessToken = session.access_token;
      else endSession();
      return session;
    })
    /*
      Un refus (4xx) : la session est finie, `null`. Tout le reste — réseau,
      serveur, trousseau — **lève** : ce n'est pas la fin de la session, et le
      confondre renvoyait à l'écran de connexion au premier wifi coupé ou au
      réveil d'une veille. La coque, elle, garde le jeton dans ce cas.
    */
    .catch((error: unknown) => {
      const status = error instanceof ApiError ? error.status : 0;
      if (status >= 400 && status < 500) {
        endSession();
        return null;
      }
      throw error instanceof ApiError
        ? error
        : new ApiError(0, "network_error", "L'API est injoignable.");
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise as Promise<T | null>;
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
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
  // La version voyage sur chaque appel : l'API refuse (426) celles qu'elle ne sert plus.
  if (APP_VERSION) headers["X-App-Version"] = APP_VERSION;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), { headers, signal });
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
    if (response.status === 426) markUpdateRequired(error?.min_version ?? "");
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
  // La version voyage sur chaque appel : l'API refuse (426) celles qu'elle ne sert plus.
  if (APP_VERSION) headers["X-App-Version"] = APP_VERSION;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
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
    if (response.status === 426) markUpdateRequired(error?.min_version ?? "");
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
