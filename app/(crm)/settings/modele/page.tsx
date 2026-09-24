import type { Metadata } from "next";
import { RequireAuth } from "@/modules/auth";
import { FicheModelPanel, SettingsPage, SettingsSection } from "@/modules/settings";

export const metadata: Metadata = { title: "Modèle de fiche" };

export default function SettingsFicheModelPage() {
  // Lire le modèle suit les fiches ; le régler est sous `system:admin` côté
  // API, comme l'ordre des frises : ce n'est pas un réglage d'écran mais une
  // définition qui déplace la liste de travail de tout le monde.
  return (
    <RequireAuth permission="customers:read">
      <SettingsPage
        title="Modèle de fiche"
        description="Ce que l'entreprise appelle une fiche complète, et qui décide de ce qu'il reste à faire."
      >
        <SettingsSection
          title="Les contrôles"
          description="« S'applique » dit si le contrôle est évalué ; « obligatoire » dit s'il rend la fiche incomplète. Un critère facultatif se compte sans faire crier la liste de travail."
        >
          <FicheModelPanel />
        </SettingsSection>
      </SettingsPage>
    </RequireAuth>
  );
}
