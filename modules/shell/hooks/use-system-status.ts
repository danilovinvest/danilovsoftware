"use client";

import { useEffect, useState } from "react";
import { getStatus, type StatusReport } from "../lib/status";

/** Une minute : le rythme de la copie de la messagerie, la plus rapide. */
const RELECTURE_MS = 60_000;

export type SystemStatus =
  | { kind: "loading" }
  | { kind: "unreachable"; since: number }
  | { kind: "ready"; report: StatusReport };

/**
 * L'état du CRM, relu chaque minute et au retour sur l'onglet.
 *
 * Un onglet caché ne relit rien : dix onglets oubliés feraient dix requêtes par
 * minute pour un bandeau que personne ne regarde. Revenir sur l'onglet relit
 * tout de suite, c'est le moment où l'on regarde.
 *
 * L'API injoignable est un état à part entière, et non une erreur avalée :
 * c'est précisément la panne que le bandeau doit dire en premier.
 */
export function useSystemStatus(): SystemStatus {
  const [status, setStatus] = useState<SystemStatus>({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    function charger() {
      if (document.visibilityState === "hidden") return;
      getStatus(controller.signal)
        .then((report) => setStatus({ kind: "ready", report }))
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setStatus((prev) =>
            prev.kind === "unreachable" ? prev : { kind: "unreachable", since: Date.now() },
          );
        });
    }

    charger();
    const timer = setInterval(charger, RELECTURE_MS);
    document.addEventListener("visibilitychange", charger);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", charger);
      controller.abort();
    };
  }, []);

  return status;
}
