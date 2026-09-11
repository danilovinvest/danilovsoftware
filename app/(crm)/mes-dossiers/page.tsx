import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { MyProjectsView } from "@/modules/customers";

export const metadata: Metadata = { title: "Mes dossiers" };

export default function MyProjectsPage() {
  return (
    <RequireAuth permission="customers:read">
      <MyProjectsView />
    </RequireAuth>
  );
}
