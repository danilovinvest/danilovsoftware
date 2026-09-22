"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangleIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  canReloadForStaleChunk,
  isStaleChunk,
  reloadForStaleChunk,
} from "@/shared/lib/stale-chunk";

/**
 * L'écran d'une erreur de rendu, en français et dans le cadre du CRM.
 *
 * Sans lui, n'importe quelle exception affichait l'écran brut de Next —
 * « Application error: a client-side exception has occurred », en anglais,
 * sans en-tête ni chemin de retour. Le cas le plus fréquent est une page
 * ouverte avant un déploiement : celle-là se recharge d'elle-même.
 */
export function ErrorScreen({ error, retry }: { error: unknown; retry: () => void }) {
  // Décidé une fois, à l'affichage : une page périmée se recharge d'elle-même.
  const [recharge] = useState(() => isStaleChunk(error) && canReloadForStaleChunk());

  useEffect(() => {
    if (recharge) reloadForStaleChunk();
    // Le détail va à la console, pour qui le cherche ; l'écran dit quoi faire.
    console.error(error);
  }, [error, recharge]);

  if (recharge) {
    return (
      <p className="text-muted-foreground p-10 text-center text-sm">
        Une nouvelle version du CRM est en ligne : rechargement…
      </p>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-16 text-center">
      <AlertTriangleIcon className="text-warning size-8" />
      <h1 className="text-base font-semibold">Cet écran n&apos;a pas pu s&apos;afficher</h1>
      <p className="text-muted-foreground text-sm">
        Rien n&apos;a été perdu de ce qui était déjà enregistré. Réessayez ; si l&apos;erreur
        revient, rechargez la page ou repartez du tableau de bord.
      </p>
      <div className="flex flex-wrap justify-center gap-2 pt-2">
        <Button onClick={() => retry()}>
          <RotateCcwIcon />
          Réessayer
        </Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Recharger la page
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/dashboard">Tableau de bord</Link>
        </Button>
      </div>
    </div>
  );
}
