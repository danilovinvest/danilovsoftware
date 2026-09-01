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
import { API_URL } from "@/shared/lib/env";
import { setAccessToken } from "@/shared/api/client";
import * as authApi from "./lib/api";
import type { Account, Permission, SessionResponse } from "./lib/types";

type AuthState = {
  account: Account | null;
  /** true tant que la session initiale n'a pas été résolue. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: Permission) => boolean;
  refreshAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

/** Marge avant expiration : on renouvelle sans jamais laisser le jeton périmer. */
const REFRESH_MARGIN_MS = 60_000;

/** Échange le cookie httpOnly contre une nouvelle session, ou null s'il n'est plus valide. */
async function requestSession(): Promise<SessionResponse | null> {
  try {
    const response = await fetch(`${API_URL}/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) return null;
    return (await response.json()) as SessionResponse;
  } catch {
    return null;
  }
}

/**
 * L'état de session est une seule valeur : « pas encore résolue » puis
 * « résolue, avec ou sans compte ». Le drapeau de chargement en est déduit,
 * ce qui évite tout setState synchrone dans un effet.
 */
type SessionState = { status: "loading" } | { status: "ready"; account: Account | null };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: "loading" });
  const account = state.status === "ready" ? state.account : null;
  const loading = state.status === "loading";
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Le minuteur de renouvellement doit rappeler `renew`, qui dépend lui-même de
  // la planification : la référence casse ce cycle.
  const renewRef = useRef<() => void>(() => {});

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const applySession = useCallback(
    (session: SessionResponse) => {
      setAccessToken(session.access_token);
      setState({ status: "ready", account: session.user });

      // Le jeton d'accès est court : on programme son renouvellement plutôt que
      // d'attendre un 401 au milieu d'une saisie.
      clearTimer();
      const delay = Math.max(session.expires_in * 1000 - REFRESH_MARGIN_MS, 10_000);
      timerRef.current = setTimeout(() => renewRef.current(), delay);
    },
    [clearTimer],
  );

  const forget = useCallback(() => {
    setAccessToken(null);
    setState({ status: "ready", account: null });
    clearTimer();
  }, [clearTimer]);

  const renew = useCallback(async () => {
    const session = await requestSession();
    if (session) applySession(session);
    else forget();
  }, [applySession, forget]);

  useEffect(() => {
    renewRef.current = () => void renew();
  }, [renew]);

  // Au chargement, la session est reconstruite depuis le cookie httpOnly :
  // rien n'est conservé côté navigateur entre deux visites.
  useEffect(() => {
    // `renew` est asynchrone : il n'écrit l'état qu'après la réponse du serveur.
    // La règle ne peut pas le prouver et signale l'appel ; lire une session
    // depuis un cookie httpOnly est précisément une synchronisation avec un
    // système externe, ce que l'effet est fait pour porter.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void renew();
    return clearTimer;
  }, [renew, clearTimer]);

  const value = useMemo<AuthState>(
    () => ({
      account,
      loading,
      login: async (email, password) => {
        applySession(await authApi.login(email, password));
      },
      logout: async () => {
        try {
          await authApi.logout();
        } finally {
          forget();
        }
      },
      can: (permission) => account?.permissions.includes(permission) ?? false,
      refreshAccount: async () => {
        setState({ status: "ready", account: await authApi.me() });
      },
    }),
    [account, loading, applySession, forget],
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
