"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RequireAuth } from "@/modules/auth";
import { CustomerDetailView } from "@/modules/customers";

/*
Une seule page pour toutes les fiches, l'identifiant en paramètre d'URL.

L'application est un export statique : Next ne fabrique à la compilation que
les pages dont il connaît les paramètres, et les fiches vivent en base. Voir
`shared/lib/routes.ts`, qui est le seul endroit où cette adresse s'écrit.

La borne Suspense n'est pas décorative : `useSearchParams` fait basculer en
rendu client tout l'arbre jusqu'à la borne la plus proche.
*/
export default function CustomerPage() {
  return (
    <RequireAuth permission="customers:read">
      <Suspense>
        <CustomerFromQuery />
      </Suspense>
    </RequireAuth>
  );
}

function CustomerFromQuery() {
  const id = useSearchParams().get("id") ?? "";
  // La clé remonte la fiche quand on passe de l'une à l'autre : la même page
  // sert toutes les fiches, et l'état d'un onglet ouvert ne doit pas suivre.
  return <CustomerDetailView key={id} customerId={id} />;
}
