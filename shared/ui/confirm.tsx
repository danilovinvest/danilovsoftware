"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Ce que la confirmation dit avant un geste qu'on ne peut pas défaire.
 *
 * Le titre nomme **ce qui part** (« Supprimer l'agenda « Travaux » »), la
 * description dit ce que cela emporte. Un « Êtes-vous sûr ? » sans objet se
 * valide sans être lu.
 */
export type ConfirmOptions = {
  title: string;
  description?: string;
  /** Le libellé du bouton, qui redit le geste : « Supprimer », « Révoquer ». */
  confirmLabel: string;
  /** Rouge par défaut : on ne confirme presque que des pertes. */
  destructive?: boolean;
};

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

/*
  Une seule confirmation à la fois, tenue hors de React.

  `window.confirm` était appelé à six endroits : une boîte du navigateur, en
  anglais sur certains postes, qui ne dit rien du CRM et que l'application de
  bureau affiche avec le nom de l'exécutable en titre. Le remplacer par une
  fonction qui rend une promesse garde la forme de ces appels — `if (!(await
  askConfirm(…))) return` — sans monter une boîte de dialogue dans chaque
  composant qui supprime quelque chose.
*/
let current: Pending | null = null;
const listeners = new Set<() => void>();

function publish(next: Pending | null) {
  current = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Ouvre la confirmation ; rend `true` si l'on a confirmé. */
export function askConfirm(options: ConfirmOptions): Promise<boolean> {
  // Une confirmation encore ouverte vaut refus : on ne la laisse pas pendre.
  current?.resolve(false);
  return new Promise((resolve) => publish({ ...options, resolve }));
}

function settle(ok: boolean) {
  const pending = current;
  publish(null);
  pending?.resolve(ok);
}

/** Le point d'affichage des confirmations. Monté une fois, à la racine. */
export function ConfirmHost() {
  const pending = useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );

  return (
    <Dialog open={pending !== null} onOpenChange={(open) => !open && settle(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{pending?.title}</DialogTitle>
          {/* Toujours présente : sans elle, un lecteur d'écran n'a que le titre. */}
          <DialogDescription className={pending?.description ? undefined : "sr-only"}>
            {pending?.description ?? "Ce geste ne se défait pas."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => settle(false)}>
            Annuler
          </Button>
          <Button
            variant={pending?.destructive === false ? "default" : "destructive"}
            onClick={() => settle(true)}
          >
            {pending?.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
