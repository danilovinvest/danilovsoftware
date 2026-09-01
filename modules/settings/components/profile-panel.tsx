"use client";

import { useAuth } from "@/modules/auth";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, initials } from "@/shared/lib/format";
import {
  SettingsPage,
  SettingsRow,
  SettingsRows,
  SettingsSection,
} from "./settings-page";

/**
 * Le profil se lit entièrement dans le jeton d'accès : ni requête, ni état de
 * chargement. Il est en lecture seule — modifier un compte passe par
 * `users:write`, que le titulaire du compte n'a pas forcément sur lui-même.
 */
export function ProfilePanel() {
  const { account } = useAuth();
  if (!account) return null;

  const name =
    [account.first_name, account.last_name].filter(Boolean).join(" ") ||
    account.email;

  return (
    <SettingsPage
      title="Profil"
      description="Le compte avec lequel vous êtes connecté."
    >
      <SettingsSection title="Identité">
        <div className="flex items-center gap-3 rounded-lg border px-3 py-3">
          <span
            aria-hidden
            className="bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold"
          >
            {initials(name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="text-muted-foreground truncate text-xs">
              {account.email}
            </p>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Accès"
        description="Le rôle et les permissions sont attribués par un administrateur."
      >
        <SettingsRows>
          <SettingsRow label="Rôle">
            <Badge className="bg-info-soft text-info rounded-[4px]">
              {account.role_name}
            </Badge>
          </SettingsRow>
          <SettingsRow
            label="Permissions"
            hint="Portées dans le jeton d'accès, rafraîchies toutes les 15 minutes."
          >
            {account.permissions.length}
          </SettingsRow>
          <SettingsRow label="Compte">
            {account.is_active ? (
              <Badge className="bg-success-soft text-success rounded-[4px]">
                Actif
              </Badge>
            ) : (
              <Badge className="bg-danger-soft text-danger rounded-[4px]">
                Désactivé
              </Badge>
            )}
          </SettingsRow>
          <SettingsRow label="Dernière connexion">
            {formatDateTime(account.last_login_at)}
          </SettingsRow>
          <SettingsRow label="Compte créé le">
            {formatDateTime(account.created_at)}
          </SettingsRow>
        </SettingsRows>
      </SettingsSection>
    </SettingsPage>
  );
}
