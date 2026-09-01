import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { TreasuryView } from "@/modules/billing";

export const metadata: Metadata = { title: "Flux de trésorerie — Danilov CRM" };

export default function TreasuryPage() {
  return (
    // Même garde que dans le module : la lecture financière du groupe n'est pas
    // celle du journal des ventes. `users:read` tient lieu d'« invoices:read »
    // tant que l'API n'a pas cette permission.
    <RequireAuth permission="users:read">
      <TreasuryView />
    </RequireAuth>
  );
}
