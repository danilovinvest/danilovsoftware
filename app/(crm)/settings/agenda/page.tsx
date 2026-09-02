import type { Metadata } from "next";
import { Suspense } from "react";
import { RequireAuth } from "@/modules/auth";
import { AgendaPanel } from "@/modules/settings";

export const metadata: Metadata = { title: "Agenda" };

export default function SettingsAgendaPage() {
  // Consulter l'agenda suffit à ouvrir l'écran ; le raccorder demande
  // `system:admin`, ce que l'API vérifie sur chacune des routes concernées.
  return (
    <RequireAuth permission="calendar:read">
      {/* Le retour d'autorisation Google revient en paramètre d'URL, que
          `useSearchParams` ne peut lire qu'à l'intérieur d'un Suspense. */}
      <Suspense fallback={null}>
        <AgendaPanel />
      </Suspense>
    </RequireAuth>
  );
}
