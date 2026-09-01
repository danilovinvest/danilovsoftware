"use client";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ErrorNotice, Skeleton } from "@/shared/ui/feedback";
import { useRoles } from "../hooks/use-settings";
import { SettingsPage, SettingsSection } from "./settings-page";

export function RolesPanel() {
  const { roles, loading, error } = useRoles();

  return (
    <SettingsPage
      title="Rôles"
      description="Chaque compte porte un rôle ; le rôle porte les permissions."
    >
      <SettingsSection
        title="Rôles de l'espace"
        description="Les permissions voyagent dans le jeton d'accès : un changement de rôle prend effet au renouvellement, dans les 15 minutes."
      >
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading
                  ? Array.from({ length: 3 }, (_, index) => (
                      <TableRow key={index}>
                        <TableCell colSpan={3}>
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
                              <Badge className="bg-neutral-soft text-neutral rounded-[4px]">
                                Système
                              </Badge>
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
                            <Badge className="bg-info-soft text-info rounded-[4px]">
                              Toutes
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground tabular-nums">
                              {role.permission_count}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SettingsSection>
    </SettingsPage>
  );
}
