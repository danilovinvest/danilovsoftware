import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { CustomersGraphScreen } from "@/modules/graph";

export const metadata: Metadata = { title: "Graphe des fiches" };

/*
  Un segment littéral, frère de `[id]` comme `nouveau` : Next sert le segment
  écrit avant le segment dynamique, si bien que `/customers/graphe` n'est jamais
  pris pour la fiche d'identifiant « graphe ».
*/
export default function CustomersGraphPage() {
  return (
    <RequireAuth permission="customers:read">
      <CustomersGraphScreen />
    </RequireAuth>
  );
}
