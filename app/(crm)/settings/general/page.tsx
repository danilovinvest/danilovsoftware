import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { GeneralPanel } from "@/modules/settings";

export const metadata: Metadata = { title: "Général — Danilov CRM" };

export default function SettingsGeneralPage() {
  return (
    <RequireAuth>
      <GeneralPanel />
    </RequireAuth>
  );
}
