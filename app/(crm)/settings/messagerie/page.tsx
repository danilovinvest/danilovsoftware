import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { MailPanel } from "@/modules/mail";

export const metadata: Metadata = { title: "Messagerie" };

export default function SettingsMailPage() {
  // Consulter suffit à ouvrir l'écran ; raccorder une boîte demande
  // `mail:write`, ce que l'API vérifie sur chacune des routes concernées.
  return (
    <RequireAuth permission="mail:read">
      <MailPanel />
    </RequireAuth>
  );
}
