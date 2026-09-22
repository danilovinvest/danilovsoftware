"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { readMailQuery, writeMailQuery, type MailQuery } from "../lib/mail-query";

/**
 * L'adresse de la messagerie, lue et écrite.
 *
 * Lue à chaque rendu (`useSearchParams`) : ⌘K qui mène à un autre courriel
 * depuis la messagerie change l'écran, pas seulement la barre d'adresse
 * (issue 91). Écrite par `history.replaceState`, que Next relaie à
 * `useSearchParams` sans aller-retour serveur — `j` tenu enfoncé ne doit pas
 * lancer une navigation par ligne.
 *
 * **Ouvrir depuis la liste empile une entrée**, et une seule : le bouton
 * Retour du téléphone ramène alors à la liste, comme dans toute messagerie.
 * Passer d'une conversation à la suivante la remplace, sans quoi Retour
 * reparcourrait trente conversations une à une.
 */
export function useMailQuery() {
  const params = useSearchParams();
  const query = readMailQuery(params);
  // Vrai tant que l'entrée empilée par une ouverture est la page courante.
  const pushed = useRef(false);

  useEffect(() => {
    // Retour du navigateur : l'entrée empilée n'est plus là.
    const onPop = () => {
      pushed.current = false;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = useCallback((next: Partial<MailQuery>, mode: "replace" | "push" = "replace") => {
    // Lue au moment du geste et non capturée au rendu : deux gestes rapprochés
    // ne doivent pas s'écraser l'un l'autre.
    const merged = { ...readMailQuery(new URLSearchParams(window.location.search)), ...next };
    const qs = writeMailQuery(merged);
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    if (mode === "push") window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }, []);

  const open = useCallback(
    (messageId: string) => {
      const current = new URLSearchParams(window.location.search).get("message");
      if (current) {
        go({ message: messageId });
        return;
      }
      pushed.current = true;
      go({ message: messageId }, "push");
    },
    [go],
  );

  const close = useCallback(() => {
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
      return;
    }
    go({ message: null });
  }, [go]);

  return { query, go, open, close };
}
