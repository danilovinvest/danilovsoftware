"use client";

import { useCallback, useEffect } from "react";
import { askConfirm } from "@/shared/ui/confirm";

/**
 * Ne pas perdre une saisie en cours.
 *
 * Une relance de trois paragraphes, un devis à moitié rempli, l'assistant de
 * création à sa deuxième étape : Échap, un clic à côté de la boîte ou la
 * fermeture de l'onglet les jetaient sans un mot. Tant que `dirty` est vrai :
 *
 * - fermer la boîte demande confirmation — le rappel rendu remplace le
 *   `onOpenChange` de la boîte et de son bouton « Annuler » ;
 * - quitter ou recharger la page déclenche l'avertissement du navigateur.
 *
 * Un enregistrement réussi ferme par le `onOpenChange` d'origine, sans passer
 * par ici : on ne demande pas « abandonner ? » à qui vient d'enregistrer.
 */
export function useDirtyGuard(dirty: boolean, onOpenChange?: (open: boolean) => void) {
  useEffect(() => {
    if (!dirty) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return useCallback(
    async (open: boolean) => {
      if (open || !dirty) {
        onOpenChange?.(open);
        return;
      }
      const ok = await askConfirm({
        title: "Abandonner la saisie",
        description: "Ce qui a été tapé n'est pas enregistré, et sera perdu.",
        confirmLabel: "Abandonner",
      });
      if (ok) onOpenChange?.(false);
    },
    [dirty, onOpenChange],
  );
}
