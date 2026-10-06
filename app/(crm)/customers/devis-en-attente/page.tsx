import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { AwaitingQuotesView } from "@/modules/customers";

export const metadata: Metadata = { title: "Devis sans réponse" };

/*
  Un segment littéral, frère de `[id]` comme `partenaires` : jamais pris pour
  une fiche. Des montants de devis : la permission des pièces.
*/
export default function AwaitingQuotesPage() {
  return (
    <RequireAuth permission="quotes:read">
      <AwaitingQuotesView />
    </RequireAuth>
  );
}
