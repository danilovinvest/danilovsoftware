import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { DashboardView } from "@/modules/dashboard";

export const metadata: Metadata = { title: "Tableau de bord" };

export default function DashboardPage() {
  return (
    <RequireAuth permission="customers:read">
      <DashboardView />
    </RequireAuth>
  );
}
