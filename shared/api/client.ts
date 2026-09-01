import { API_URL } from "@/shared/lib/env";
import { ApiError } from "./errors";

/**
 * Le jeton d'accès ne vit qu'en mémoire : ni localStorage ni cookie lisible,
 * donc rien à voler pour un script injecté. Il est reconstruit au chargement de
 * la page à partir du cookie de refresh (httpOnly).
 */
let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

/**
 * Renouvelle le jeton d'accès. Les appels concurrents partagent la même
 * promesse : dix requêtes qui échouent en même temps ne déclenchent qu'un seul
 * refresh, sinon la rotation des refresh tokens invaliderait la session.
 */
export function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = (await response.json()) as { access_token: string };
        accessToken = data.access_token;
        return accessToken;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
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
    const renewed = await refreshAccessToken();
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
