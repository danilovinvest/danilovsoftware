"use client";

import { usePermission } from "@/modules/auth";
import { apiBase } from "@/shared/lib/env";
import { WORKSPACE } from "@/shared/lib/workspace";
import {
  SettingsPage,
  SettingsRow,
  SettingsRows,
  SettingsSection,
} from "./settings-page";

/**
 * Réglages généraux de l'espace de travail.
 *
 * Le CRM est mono-espace : le nom ne vient pas de l'API et n'est donc pas
 * modifiable ici. La section « Connexion » sert surtout au diagnostic — savoir
 * sur quelle API le front est branché évite bien des allers-retours.
 *
 * Elle est réservée à `system:admin` : jeton d'accès, cookie httpOnly et adresse
 * d'API ne disent rien à un chargé d'affaires, et un écran de réglages rempli
 * de termes qu'on ne comprend pas fait douter du reste.
 */
export function GeneralPanel() {
  const isAdmin = usePermission("system:admin");

  return (
    <SettingsPage
      title="Général"
      description={
        isAdmin
          ? "Identité et raccordement de l'espace de travail."
          : "Identité de l'espace de travail."
      }
    >
      <SettingsSection title="Espace de travail">
        <SettingsRows>
          <SettingsRow label="Nom">{WORKSPACE.name}</SettingsRow>
          <SettingsRow label="Activité">{WORKSPACE.tagline}</SettingsRow>
        </SettingsRows>
      </SettingsSection>

      {isAdmin && (
        <SettingsSection
          title="Connexion"
          description="Le front appelle cette API depuis le navigateur ; l'autorisation est appliquée à chaque requête côté serveur."
        >
          <SettingsRows>
            <SettingsRow label="API">
              <span className="font-mono text-xs">{apiBase()}</span>
            </SettingsRow>
            <SettingsRow
              label="Session"
              hint="Le jeton d'accès ne vit qu'en mémoire ; le refresh token est un cookie httpOnly."
            >
              15 minutes
            </SettingsRow>
          </SettingsRows>
        </SettingsSection>
      )}
    </SettingsPage>
  );
}
