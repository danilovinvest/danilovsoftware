import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { PendingReceiptsView } from "@/modules/billing";

export const metadata: Metadata = { title: "À affecter" };

export default function PendingReceiptsPage() {
  return (
    // La permission de l'entrée de menu : ce sont des encaissements, lus comme
    // les virements d'une pièce.
    <RequireAuth permission="quotes:read">
      <PendingReceiptsView />
    </RequireAuth>
  );
}
