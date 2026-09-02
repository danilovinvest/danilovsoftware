import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { AssistantPanel } from "@/modules/settings";

export const metadata: Metadata = { title: "Assistant" };

export default function SettingsAssistantPage() {
  // Aucune permission particulière : chacun branche son propre assistant, qui
  // n'obtiendra jamais plus que ce que son compte peut déjà lire.
  return (
    <RequireAuth>
      <AssistantPanel />
    </RequireAuth>
  );
}
