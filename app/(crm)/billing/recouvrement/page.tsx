import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { RecoveryView } from "@/modules/billing";

export const metadata: Metadata = { title: "Recouvrement" };

export default function RecoveryPage() {
  return (
    // La permission de l'entrée de menu : des factures, lues comme les autres.
    <RequireAuth permission="quotes:read">
      <RecoveryView />
    </RequireAuth>
  );
}
