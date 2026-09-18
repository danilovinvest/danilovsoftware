import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ApiError, type ApiErrorCode } from "@/shared/api/errors";

/**
 * La session, demandée à la coque.
 *
 * Le refresh token ne passe jamais par ici : la coque le garde dans le
 * trousseau du système et ne rend que la session — jeton d'accès, durée,
 * compte (`src-tauri/src/session.rs`). C'est ce que le cookie `HttpOnly`
 * garantissait sur le web, et que `tauri://localhost` ne permet plus.
 */
export type NativeSession = {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: unknown;
};

type Failure = {
  status: number;
  code: string;
  message: string;
  fields: Record<string, string>;
};

const KNOWN: ReadonlySet<string> = new Set<ApiErrorCode>([
  "bad_request",
  "validation_failed",
  "unauthorized",
  "forbidden",
  "not_found",
  "conflict",
  "internal_error",
  "network_error",
]);

/** Une erreur de la coque devient l'`ApiError` que les écrans savent lire. */
function toApiError(error: unknown): ApiError {
  const failure = error as Partial<Failure> | null;
  if (failure && typeof failure.message === "string") {
    const code = KNOWN.has(failure.code ?? "") ? (failure.code as ApiErrorCode) : "internal_error";
    return new ApiError(failure.status ?? 0, code, failure.message, failure.fields ?? {});
  }
  return new ApiError(0, "internal_error", String(error));
}

async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    throw toApiError(error);
  }
}

/** Renouvelle depuis le trousseau ; `null` quand aucune session n'est ouverte. */
export function refreshNative<T extends NativeSession>(): Promise<T | null> {
  return call<T | null>("session_refresh");
}

export function loginNative<T extends NativeSession>(email: string, password: string): Promise<T> {
  return call<T>("session_login", { email, password });
}

export function logoutNative(): Promise<void> {
  return call<void>("session_logout");
}

/**
 * La connexion par passkey, dans le navigateur du système.
 *
 * Aucune clé ne se signe pour `tauri://localhost` : la coque ouvre le portail
 * avec un défi PKCE, la personne s'y authentifie, et le navigateur rend la main
 * par `omptcrm://auth`. La promesse se résout quand la coque annonce la session
 * — ou son échec. Elle ne se résout jamais si la personne abandonne dans le
 * navigateur : `cancel` la libère, et un nouvel essai remplace l'ancien.
 */
export function loginWithBrowser<T extends NativeSession>(): {
  session: Promise<T>;
  cancel: () => void;
} {
  const unlisteners: Array<() => void> = [];
  const cancel = () => unlisteners.splice(0).forEach((unlisten) => unlisten());

  const session = new Promise<T>((resolve, reject) => {
    void Promise.all([
      listen<T>("session://opened", (event) => {
        cancel();
        resolve(event.payload);
      }),
      listen<Failure>("session://failed", (event) => {
        cancel();
        reject(toApiError(event.payload));
      }),
    ])
      .then((fns) => {
        unlisteners.push(...fns);
        return call<void>("session_login_browser");
      })
      .catch((error: unknown) => {
        cancel();
        reject(error instanceof ApiError ? error : toApiError(error));
      });
  });

  return { session, cancel };
}
