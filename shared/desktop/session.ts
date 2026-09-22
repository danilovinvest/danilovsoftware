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
 * Au-delà, le navigateur n'a vraisemblablement pas rendu la main : l'invite
 * « Ouvrir OMPT CRM » a été refusée, ignorée, ou l'onglet fermé. Deux minutes,
 * c'est la vie du code que le portail émet — passé ce délai, même un retour
 * tardif porterait un code mort. L'écran propose alors de recommencer, sans
 * cesser d'écouter : la personne peut encore être en train de se connecter.
 */
export const BROWSER_LOGIN_PATIENCE_MS = 2 * 60 * 1000;

/**
 * Au-delà, la coque elle-même écarte le retour (`PENDING_TTL` de `session.rs`) :
 * attendre davantage serait attendre ce qui ne peut plus arriver.
 */
const BROWSER_LOGIN_EXPIRY_MS = 10 * 60 * 1000;

/**
 * La connexion par passkey, dans le navigateur du système.
 *
 * Aucune clé ne se signe pour `tauri://localhost` : la coque ouvre le portail
 * avec un défi PKCE, la personne s'y authentifie, et le navigateur rend la main
 * par `omptcrm://auth`. La promesse se résout quand la coque annonce la session
 * — ou son échec. Si rien ne revient, elle échoue au bout de dix minutes, quand
 * la coque ne l'accepterait plus ; `cancel` la libère plus tôt, et un nouvel
 * essai remplace l'ancien.
 */
export function loginWithBrowser<T extends NativeSession>(): {
  session: Promise<T>;
  cancel: () => void;
} {
  const unlisteners: Array<() => void> = [];
  let cancelled = false;
  let expiry: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => {
    cancelled = true;
    clearTimeout(expiry);
    unlisteners.splice(0).forEach((unlisten) => unlisten());
  };

  const session = new Promise<T>((resolve, reject) => {
    expiry = setTimeout(() => {
      cancel();
      reject(
        new ApiError(
          0,
          "internal_error",
          "Le navigateur n'a pas rendu la main à l'application. Relancez la connexion.",
        ),
      );
    }, BROWSER_LOGIN_EXPIRY_MS);

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
        // Annulé pendant la mise en place : les écoutes arrivent après
        // `cancel`, qui ne les a pas vues. On les libère ici, et on n'ouvre
        // pas le navigateur pour un essai abandonné.
        if (cancelled) {
          fns.forEach((unlisten) => unlisten());
          return;
        }
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
