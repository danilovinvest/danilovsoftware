import { Suspense } from "react";
import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { WorksitesView } from "@/modules/worksites";

export const metadata: Metadata = { title: "Chantiers" };

/*
La borne Suspense n'est pas décorative : l'écran lit `?affaire=` pour ouvrir le
chantier désigné depuis la fiche client, et `useSearchParams` fait basculer en
rendu client tout l'arbre jusqu'à la borne la plus proche. Sans elle, ce serait
la mise en page entière — barre latérale comprise — qui cesserait d'être
préparée à l'avance.
*/
export default function WorksitesPage() {
  return (
    <RequireAuth permission="customers:read">
      <Suspense>
        <WorksitesView />
      </Suspense>
    </RequireAuth>
  );
}
