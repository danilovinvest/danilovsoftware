"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { refreshSession, setAccessToken } from "@/shared/api/client";
import { loginNative, logoutNative } from "@/shared/desktop/session";
import * as authApi from "./lib/api";
import type { Account, Permission, SessionResponse } from "./lib/types";

type AuthState = {
  account: Account | null;
  /** true tant que la session initiale n'a pas été résolue. */
  loading: boolean;
  /**
   * Le serveur est injoignable : la session n'est pas perdue, on réessaie.
   * Avec un compte, l'écran reste en place sous un bandeau ; sans compte (un
   * chargement hors ligne), la garde dit qu'elle attend le réseau.
   */
  offline: boolean;
  /** Réessaie tout de suite de joindre le serveur. */
  retry: () => void;
  login: (email: string, password: string) => Promise<void>;
  /**
   * Adopte une session déjà obtenue — aujourd'hui la connexion par passkey,
   * que le navigateur du système rend à la coque (`shared/desktop/session.ts`).
   */
  adoptSession: (session: SessionResponse) => void;
  logout: () => Promise<void>;
  can: (permission: Permission) => boolean;
  refreshAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

/** Marge avant expiration : on renouvelle sans jamais laisser le jeton périmer. */
const REFRESH_MARGIN_MS = 60_000;

/**
 * L'état de session est une seule valeur : « pas encore résolue » puis
 * « résolue, avec ou sans compte ». Le drapeau de chargement en est déduit,
 * ce qui évite tout setState synchrone dans un effet.
 */
type SessionState =
  | { status: "loading" }
  | { status: "ready"; account: Account | null; offline?: boolean }
  | { status: "offline" };

/** Les réessais s'espacent — 5 s, 10 s, 20 s… — sans dépasser une minute. */
const RETRY_BASE_MS = 5_000;
const RETRY_MAX_MS = 60_000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: "loading" });
  const account = state.status === "ready" ? state.account : null;
  const loading = state.status === "loading";
  const offline = state.status === "offline" || (state.status === "ready" && state.offline === true);
  /** Le nombre de réessais consécutifs, pour espacer le suivant. */
  const retriesRef = useRef(0);
  /** L'heure à laquelle le jeton d'accès expire : un réveil de veille la relit. */
  const expiresAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Le minuteur de renouvellement doit rappeler `renew`, qui dépend lui-même de
  // la planification : la référence casse ce cycle.
  const renewRef = useRef<() => void>(() => {});
  const accountIdRef = useRef<string | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const applySession = useCallback(
    (session: SessionResponse) => {
      // Un autre compte prend la place sans passer par la déconnexion (une
      // invitation acceptée en étant connecté) : ce que le cache tient
      // appartient au précédent, et ne doit pas s'afficher sous le suivant.
      if (accountIdRef.current && accountIdRef.current !== session.user.id) {
        setAccessToken(null);
      }
      accountIdRef.current = session.user.id;
      setAccessToken(session.access_token);
      setState({ status: "ready", account: session.user });
      retriesRef.current = 0;
      expiresAtRef.current = Date.now() + session.expires_in * 1000;

      // Le jeton d'accès est court : on programme son renouvellement plutôt que
      // d'attendre un 401 au milieu d'une saisie.
      clearTimer();
      const delay = Math.max(session.expires_in * 1000 - REFRESH_MARGIN_MS, 10_000);
      timerRef.current = setTimeout(() => renewRef.current(), delay);
    },
    [clearTimer],
  );

  const forget = useCallback(() => {
    accountIdRef.current = null;
    setAccessToken(null);
    setState({ status: "ready", account: null });
    clearTimer();
  }, [clearTimer]);

  const renew = useCallback(async () => {
    // Passe par le client partagé : c'est lui qui déduplique les appels
    // concurrents à /v1/auth/refresh.
    try {
      const session = await refreshSession<SessionResponse>();
      if (session) applySession(session);
      else forget();
    } catch {
      /*
        Le réseau ou le serveur, pas la session : on garde le compte et on
        réessaie. C'était une déconnexion, et la saisie en cours partait avec.
      */
      const delay = Math.min(RETRY_BASE_MS * 2 ** retriesRef.current, RETRY_MAX_MS);
      retriesRef.current += 1;
      setState((current) =>
        current.status === "ready"
          ? { ...current, offline: true }
          : { status: "offline" },
      );
      clearTimer();
      timerRef.current = setTimeout(() => renewRef.current(), delay);
    }
  }, [applySession, forget, clearTimer]);

  useEffect(() => {
    renewRef.current = () => void renew();
  }, [renew]);

  // Au lancement, la session est reconstruite par la coque depuis le
  // trousseau du système : rien n'est conservé dans la page entre deux
  // lancements.
  useEffect(() => {
    // `renew` est asynchrone : il n'écrit l'état qu'après la réponse du serveur.
    // La règle ne peut pas le prouver et signale l'appel ; lire une session
    // depuis le trousseau du système est précisément une synchronisation avec
    // un système externe, ce que l'effet est fait pour porter.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void renew();
    return clearTimer;
  }, [renew, clearTimer]);

  /*
    Le réseau revient, ou la fenêtre redevient visible : on n'attend pas le
    minuteur. Au réveil d'une veille, il est parti en retard et le jeton a pu
    expirer entre-temps.
  */
  useEffect(() => {
    function auRetour() {
      if (document.visibilityState === "hidden") return;
      // Sans session connue, il n'y a rien à renouveler : la page de connexion
      // ne doit pas interroger le serveur à chaque retour sur l'onglet.
      const perime =
        expiresAtRef.current > 0 && Date.now() > expiresAtRef.current - REFRESH_MARGIN_MS;
      if (retriesRef.current > 0 || perime) renewRef.current();
    }
    window.addEventListener("online", auRetour);
    document.addEventListener("visibilitychange", auRetour);
    return () => {
      window.removeEventListener("online", auRetour);
      document.removeEventListener("visibilitychange", auRetour);
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      account,
      loading,
      offline,
      retry: () => renewRef.current(),
      login: async (email, password) => {
        applySession(await loginNative<SessionResponse>(email, password));
      },
      adoptSession: applySession,
      logout: async () => {
        try {
          await logoutNative();
        } finally {
          forget();
        }
      },
      can: (permission) => account?.permissions.includes(permission) ?? false,
      refreshAccount: async () => {
        setState({ status: "ready", account: await authApi.me() });
      },
    }),
    [account, loading, offline, applySession, forget],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur de <AuthProvider>.");
  }
  return context;
}

/** Raccourci pour masquer un bouton dont l'action serait refusée par l'API. */
export function usePermission(permission: Permission): boolean {
  return useAuth().can(permission);
}
