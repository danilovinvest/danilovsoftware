import { API_URL } from "@/shared/lib/env";
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

export function setAccessToken(token: string | null) {
  accessToken = token;
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
export function refreshSession<T extends MinimalSession>(): Promise<T | null> {
  refreshPromise ??= fetch(`${API_URL}/v1/auth/refresh`, {
    method: "POST",
    credentials: "include",
  })
    .then(async (response) => {
      if (!response.ok) {
        accessToken = null;
        return null;
      }
      const session = (await response.json()) as MinimalSession;
      accessToken = session.access_token;
      return session;
    })
    .catch(() => null)
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

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, signal, retryOnUnauthorized = true } = options;

  const url = new URL(`${API_URL}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) url.searchParams.append(key, item);
    } else {
      url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      credentials: "include",
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
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
