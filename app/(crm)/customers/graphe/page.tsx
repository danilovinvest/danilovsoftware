import { Suspense } from "react";
import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { CustomersGraphScreen, GraphSkeleton } from "@/modules/graph";

export const metadata: Metadata = { title: "Graphe des fiches" };

/*
  Un segment littéral, frère de `[id]` comme `nouveau` : Next sert le segment
  écrit avant le segment dynamique, si bien que `/customers/graphe` n'est jamais
  pris pour la fiche d'identifiant « graphe ».

  La borne Suspense n'est pas décorative : l'écran lit `?focus=` pour ouvrir la
  toile sur une fiche, et `useSearchParams` fait basculer en rendu client tout
  l'arbre jusqu'à la borne la plus proche.
*/
export default function CustomersGraphPage() {
  return (
    <RequireAuth permission="customers:read">
      <Suspense fallback={<GraphSkeleton />}>
        <CustomersGraphScreen />
      </Suspense>
    </RequireAuth>
  );
}
