"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const MINUTE = 60_000;

/**
 * L'instant courant, à la minute près.
 *
 * L'agenda figeait l'heure au montage : un onglet ouvert la veille montrait
 * encore hier comme « aujourd'hui », et la ligne de l'heure restait plantée à
 * l'heure de l'ouverture. Le minuteur se recale sur la minute pleine, pour que
 * la ligne avance quand l'horloge du système avance, pas trente secondes après.
 *
 * Un onglet en arrière-plan voit ses minuteurs ralentis, parfois suspendus :
 * revenir sur l'onglet relit donc l'heure tout de suite, sans attendre le tour
 * suivant.
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer = 0;
    const schedule = () => {
      timer = window.setTimeout(tick, MINUTE - (Date.now() % MINUTE));
    };
    function tick() {
      setNow(new Date());
      schedule();
    }
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      window.clearTimeout(timer);
      tick();
    };

    schedule();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return now;
}

/*
 * L'écran est-il plus étroit que `md` ?
 *
 * Lu par `useSyncExternalStore` et non par un effet : le premier rendu côté
 * client donne déjà la bonne réponse, sans peindre d'abord la grille du mois
 * pour la remplacer une image plus tard. Le rendu serveur, qui n'a pas de
 * `window`, répond « large » — c'est le défaut historique.
 */
const NARROW_QUERY = "(max-width: 767px)";

function subscribeNarrow(listener: () => void) {
  const query = window.matchMedia(NARROW_QUERY);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

export function useIsNarrow(): boolean {
  return useSyncExternalStore(
    subscribeNarrow,
    () => window.matchMedia(NARROW_QUERY).matches,
    () => false,
  );
}
