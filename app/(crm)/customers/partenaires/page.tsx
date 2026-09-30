import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { PartnerRanking } from "@/modules/customers";

export const metadata: Metadata = { title: "Partenaires" };

/*
  Un segment littéral, frère de `[id]` comme `graphe` : `/customers/partenaires`
  n'est jamais pris pour une fiche. Des montants : la permission des pièces.
*/
export default function PartnersPage() {
  return (
    <RequireAuth permission="quotes:read">
      <PartnerRanking />
    </RequireAuth>
  );
}
