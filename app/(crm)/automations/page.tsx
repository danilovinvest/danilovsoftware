import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { AutomationList } from "@/modules/automations";

export const metadata: Metadata = { title: "Automatisations" };

export default function AutomationsPage() {
  return (
    <RequireAuth permission="automations:read">
      <AutomationList />
    </RequireAuth>
  );
}
