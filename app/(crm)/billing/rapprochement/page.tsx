import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { ReconciliationView } from "@/modules/billing";

export const metadata: Metadata = { title: "Rapprochement bancaire" };

export default function ReconciliationPage() {
  return (
    // La permission de l'entrée de menu : des relevés et des encaissements, lus
    // comme les virements d'une pièce.
    <RequireAuth permission="quotes:read">
      <ReconciliationView />
    </RequireAuth>
  );
}
