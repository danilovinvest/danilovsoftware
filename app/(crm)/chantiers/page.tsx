import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { WorksitesView } from "@/modules/worksites";

export const metadata: Metadata = { title: "Chantiers" };

export default function WorksitesPage() {
  return (
    <RequireAuth permission="customers:read">
      <WorksitesView />
    </RequireAuth>
  );
}
