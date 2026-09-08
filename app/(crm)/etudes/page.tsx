import { Suspense } from "react";
import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { WorksitesView } from "@/modules/worksites";

export const metadata: Metadata = { title: "Études" };

/*
Le carnet du bureau d'études, servi par le même composant que les chantiers.

Les deux écrans partagent tout ce qui compte — le chargement, la carte, la
liste, la fiche latérale — et divergent sur ce qui les définit : les colonnes du
tableau et les quatre listes de travail. En faire deux modules aurait dupliqué
quatre cents lignes pour que la moitié dérive au premier ajustement.
*/
export default function StudiesPage() {
  return (
    <RequireAuth permission="customers:read">
      <Suspense>
        <WorksitesView metier="etudes" />
      </Suspense>
    </RequireAuth>
  );
}
