import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { SettingsPage, SettingsSection } from "@/modules/settings";
import { DuplicatesPanel } from "@/modules/customers";

export const metadata: Metadata = { title: "Doublons" };

export default function SettingsDuplicatesPage() {
  // Voir les paires ne demande que la lecture des fiches ; les fusionner en
  // retire une, et l'API l'exige derrière `customers:delete`.
  return (
    <RequireAuth permission="customers:read">
      <SettingsPage
        title="Doublons"
        description="Le même client, entré plusieurs fois par des chemins différents."
      >
        <SettingsSection
          title="Fiches qui se ressemblent"
          description="Le classeur Excel et les deux arborescences OneDrive ne se connaissaient pas."
        >
          <DuplicatesPanel />
        </SettingsSection>
      </SettingsPage>
    </RequireAuth>
  );
}
