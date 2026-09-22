"use client";

import { useState } from "react";
import { PencilIcon, PlusIcon, ShieldIcon, Trash2Icon, UsersIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth, usePermission } from "@/modules/auth";
import { ErrorNotice, Skeleton } from "@/shared/ui/feedback";
import {
  usePermissionCatalog,
  useRoles,
  useWorkspaceUsers,
} from "../hooks/use-settings";
import type { Role } from "../lib/types";
import { RoleDialog } from "./role-dialog";
import { RoleDeleteDialog } from "./role-delete-dialog";
import { RoleWizard } from "./role-wizard";
import { RoleMembersDialog } from "./role-members-dialog";
import { RolePermissionsDialog } from "./role-permissions-dialog";
import { SettingsPage, SettingsSection } from "./settings-page";

/**
 * Les rôles de l'espace de travail.
 *
 * Trois actions par ligne, et deux refus assumés : un rôle livré avec le CRM
 * ne se supprime pas, et un rôle souverain n'a pas de matrice de permissions à
 * éditer — il les détient toutes, présentes et futures. Un rôle encore porté se
 * supprime en nommant son remplaçant : personne ne reste sans rôle.
 */
export function RolesPanel() {
  const canWrite = usePermission("roles:write");
  // L'identifiant du rôle voyage dans le jeton : utile au diagnostic, muet
  // pour tous les autres.
  const showSlugs = usePermission("system:admin");
  const { roles, loading, error, reload } = useRoles();
  const catalog = usePermissionCatalog(canWrite);
  // Les comptes servent au panneau des membres d'un rôle. On les charge ici
  // pour que la liste des rôles et ce panneau partagent une seule source :
  // déplacer quelqu'un doit mettre à jour la colonne « Membres » du tableau.
  const workspace = useWorkspaceUsers();

  const [editing, setEditing] = useState<Role | null>(null);
  const [creating, setCreating] = useState(false);
  const [permissionsOf, setPermissionsOf] = useState<Role | null>(null);
  const [membersOf, setMembersOf] = useState<Role | null>(null);
  const [removing, setRemoving] = useState<Role | null>(null);
  const { account } = useAuth();
  // Le rang de l'appelant vient de la table des rôles, comme dans l'écran des
  // membres : le front ne rejoue pas la hiérarchie, il la lit.
  const actorRank = roles.find((role) => role.slug === account?.role)?.rank ?? 0;

  return (
    <SettingsPage
      title="Rôles"
      description="Chaque compte porte un rôle ; le rôle porte les permissions."
    >
      <SettingsSection
        title="Rôles de l'espace"
        description="Les permissions voyagent dans le jeton d'accès : un changement prend effet au renouvellement, dans les 15 minutes."
        action={
          canWrite && (
            <Button size="sm" onClick={() => setCreating(true)}>
              <PlusIcon />
              Nouveau rôle
            </Button>
          )
        }
      >
        {catalog.error && <ErrorNotice message={catalog.error} />}

        {error ? (
          <ErrorNotice message={error} />
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table className="[&_thead_th]:text-muted-foreground [&_thead_th]:h-8 [&_thead_th]:text-xs [&_thead_th]:font-medium">
              <TableHeader>
                <TableRow>
                  <TableHead>Rôle</TableHead>
                  <TableHead className="text-right">Membres</TableHead>
                  <TableHead className="text-right">Permissions</TableHead>
                  {canWrite && <TableHead className="w-36" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading
                  ? Array.from({ length: 3 }, (_, index) => (
                      <TableRow key={index}>
                        <TableCell colSpan={canWrite ? 4 : 3}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  : roles.map((role) => (
                      <TableRow key={role.slug}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{role.name}</span>
                            {role.is_system && (
                              <Badge className="bg-neutral-soft text-neutral rounded-md">
                                Système
                              </Badge>
                            )}
                            {showSlugs && (
                              <span className="text-muted-foreground/70 font-mono text-[11px]">
                                {role.slug}
                              </span>
                            )}
                          </div>
                          {role.description && (
                            <p className="text-muted-foreground mt-0.5 text-xs">
                              {role.description}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-right tabular-nums">
                          {role.user_count}
                        </TableCell>
                        <TableCell className="text-right">
                          {/*
                            Un rôle « grants_all » court-circuite la table des
                            permissions : afficher son compte laisserait croire
                            qu'il est limité à ce nombre.
                          */}
                          {role.grants_all ? (
                            <Badge className="bg-info-soft text-info rounded-md">
                              Toutes
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground tabular-nums">
                              {role.permission_count}
                            </span>
                          )}
                        </TableCell>

                        {canWrite && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-0.5">
                              {!role.grants_all && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7"
                                  onClick={() => setPermissionsOf(role)}
                                  title={`Permissions de ${role.name}`}
                                >
                                  <ShieldIcon className="size-3.5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                onClick={() => setMembersOf(role)}
                                title={`Membres de ${role.name}`}
                              >
                                <UsersIcon className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                onClick={() => setEditing(role)}
                                title={`Renommer ${role.name}`}
                              >
                                <PencilIcon className="size-3.5" />
                              </Button>
                              {!role.is_system && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive size-7"
                                    onClick={() => setRemoving(role)}
                                    title={`Supprimer ${role.name}`}
                                  >
                                    <Trash2Icon className="size-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>
        )}

        {!canWrite && (
          <p className="text-muted-foreground text-xs">
            Votre rôle permet de consulter cette liste, pas de la modifier.
          </p>
        )}
      </SettingsSection>

      <RoleDeleteDialog
        role={removing}
        roles={roles}
        actorRank={actorRank}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
        onDeleted={() => {
          setRemoving(null);
          reload();
          workspace.reload();
        }}
      />

      {creating && (
        <RoleWizard
          catalog={catalog.permissions}
          catalogLoading={catalog.loading}
          onClose={() => setCreating(false)}
          onCreated={reload}
        />
      )}

      {editing && (
        <RoleDialog
          key={editing.slug}
          role={editing}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      )}

      {membersOf && (
        <RoleMembersDialog
          key={membersOf.slug}
          role={membersOf}
          roles={roles}
          users={workspace.users}
          loading={workspace.loading}
          onClose={() => setMembersOf(null)}
          onChanged={() => {
            workspace.reload();
            reload();
          }}
        />
      )}

      {permissionsOf && (
        <RolePermissionsDialog
          key={permissionsOf.slug}
          role={permissionsOf}
          catalog={catalog.permissions}
          catalogLoading={catalog.loading}
          onClose={() => setPermissionsOf(null)}
          onSaved={reload}
        />
      )}
    </SettingsPage>
  );
}
