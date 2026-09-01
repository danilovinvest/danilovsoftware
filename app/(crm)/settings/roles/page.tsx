import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { RolesPanel } from "@/modules/settings";

export const metadata: Metadata = { title: "Rôles — Danilov CRM" };

export default function SettingsRolesPage() {
  return (
    <RequireAuth permission="roles:read">
      <RolesPanel />
    </RequireAuth>
  );
}
