import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { PurchasesView } from "@/modules/billing";

export const metadata: Metadata = { title: "Achats" };

export default function PurchasesPage() {
  return (
    // La permission de l'entrée de menu : des prix d'achat, lus comme les pièces.
    <RequireAuth permission="quotes:read">
      <PurchasesView />
    </RequireAuth>
  );
}
