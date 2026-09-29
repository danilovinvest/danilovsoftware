"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/ui/feedback";

/**
 * Le graphe de toute la base : les fiches, leurs liens posés et les liens que
 * leurs interlocuteurs trahissent.
 *
 * L'écran est en construction : l'API (`GET /v1/customers/graph`), ses types et
 * l'empreinte qui le garde à jour (`useGraphVersion`) existent déjà, le dessin
 * — Sigma.js et Graphology — vient ensuite. Rien n'est chargé ici : un écran
 * qui attend son dessin n'a pas à payer la lecture de quatre cents fiches.
 */
export function CustomersGraphScreen() {
  return (
    <div data-demo="graphe-global" className="flex w-full flex-col gap-4">
      <h1 className="text-xl font-semibold">Graphe des fiches</h1>
      <div className="rounded-xl border">
        <EmptyState
          title="Graphe en construction"
          description="Toutes les fiches, leurs syndics, leurs apporteurs et les interlocuteurs qu'elles partagent, sur une seule toile qui se met à jour d'elle-même."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/customers">Retour aux fiches</Link>
            </Button>
          }
        />
      </div>
    </div>
  );
}
