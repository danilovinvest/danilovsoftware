"use client";

import { Badge } from "@/components/ui/badge";
import {
  SettingsPage,
  SettingsRow,
  SettingsRows,
  SettingsSection,
} from "./settings-page";

/**
 * Réglages d'affichage.
 *
 * Tout est en lecture pour l'instant, et le thème l'est par décision
 * d'architecture : le CRM est en clair uniquement (`app/globals.css` neutralise
 * la variante `dark` de Tailwind pour que l'OS du poste ne fasse pas basculer
 * l'interface). La ligne est affichée quand même — cacher le réglage
 * laisserait croire qu'il n'existe pas.
 */
export function ExperiencePanel() {
  return (
    <SettingsPage
      title="Expérience"
      description="Apparence et formats de l'interface."
    >
      <SettingsSection title="Apparence">
        <SettingsRows>
          <SettingsRow
            label="Thème"
            hint="Le CRM est en thème clair uniquement, indépendamment du réglage du poste."
          >
            <Badge className="bg-neutral-soft text-neutral rounded-[4px]">
              Clair
            </Badge>
          </SettingsRow>
        </SettingsRows>
      </SettingsSection>

      <SettingsSection
        title="Langue et formats"
        description="Les libellés du domaine sont en français ; les dates et montants suivent la convention fr-FR."
      >
        <SettingsRows>
          <SettingsRow label="Langue">Français</SettingsRow>
          <SettingsRow label="Format de date" hint="Exemple : 31/12/2026">
            JJ/MM/AAAA
          </SettingsRow>
          <SettingsRow label="Devise" hint="Montants transportés au centime près">
            Euro (€)
          </SettingsRow>
        </SettingsRows>
      </SettingsSection>
    </SettingsPage>
  );
}
