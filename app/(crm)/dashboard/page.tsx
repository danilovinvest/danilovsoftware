import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { DashboardView } from "@/modules/dashboard";
import { LandingGuard } from "@/modules/shell";

export const metadata: Metadata = { title: "Tableau de bord" };

export default function DashboardPage() {
  return (
    // L'arrivée de tout le CRM : un compte qui ne lit pas les fiches est
    // renvoyé vers son premier écran plutôt que vers un refus (issue 95).
    <LandingGuard permission="customers:read">
      <RequireAuth permission="customers:read">
        <DashboardView />
      </RequireAuth>
    </LandingGuard>
  );
}
