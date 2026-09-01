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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const applySession = useCallback(
    (session: SessionResponse) => {
      setAccessToken(session.access_token);
      setAccount(session.user);

      // Le jeton d'accès est court : on programme son renouvellement plutôt que
      // d'attendre un 401 au milieu d'une saisie.
      clearTimer();
      const delay = Math.max(session.expires_in * 1000 - REFRESH_MARGIN_MS, 10_000);
      timerRef.current = setTimeout(() => {
        void renew();
      }, delay);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clearTimer],
  );

  const renew = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/v1/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("refresh failed");
      applySession((await response.json()) as SessionResponse);
    } catch {
      setAccessToken(null);
      setAccount(null);
      clearTimer();
    }
  }, [applySession, clearTimer]);

  // Au chargement, la session est reconstruite depuis le cookie httpOnly :
  // rien n'est conservé côté navigateur entre deux visites.
  useEffect(() => {
    void renew().finally(() => setLoading(false));
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
          setAccessToken(null);
          setAccount(null);
          clearTimer();
        }
      },
      can: (permission) => account?.permissions.includes(permission) ?? false,
      refreshAccount: async () => {
        setAccount(await authApi.me());
      },
    }),
    [account, loading, applySession, clearTimer],
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
