"use client";

import { useMemo, useState } from "react";
import { PencilIcon, SearchIcon, UserPlusIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth, usePermission } from "@/modules/auth";
import { EmptyState, ErrorNotice, Skeleton } from "@/shared/ui/feedback";
import { GradientAvatar } from "@/shared/ui/gradient-avatar";
import { formatDate, formatRelative, initials } from "@/shared/lib/format";
import { errorMessage } from "@/shared/api/errors";
import { revokeInvitation } from "../lib/api";
import { useInvitations, useRoles, useWorkspaceUsers } from "../hooks/use-settings";
import type { WorkspaceUser } from "../lib/types";
import { InviteWizard } from "./invite-wizard";
import { MemberDialog } from "./member-dialog";
import { SettingsPage, SettingsSection } from "./settings-page";

/**
 * Les comptes de l'espace de travail, et les invitations en attente.
 *
 * Les deux vivent sur le même écran parce qu'ils répondent à la même question :
 * qui a accès. Une invitation non acceptée est un accès en cours d'attribution,
 * pas un objet d'une autre nature.
 */
export function MembersPanel() {
  const { account } = useAuth();
  const canWrite = usePermission("users:write");

  const { users, total, loading, error, reload } = useWorkspaceUsers();
  const { roles } = useRoles();
  const invitations = useInvitations(canWrite);

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<WorkspaceUser | null>(null);
  const [inviting, setInviting] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  // Le rang de l'appelant vient de la table des rôles, servie par l'API :
  // le front ne rejoue pas la hiérarchie, il la lit.
  const actorRank = useMemo(
    () => roles.find((role) => role.slug === account?.role)?.rank ?? 0,
    [roles, account],
  );

  const rankOf = useMemo(
    () => (slug: string) => roles.find((role) => role.slug === slug)?.rank ?? 0,
    [roles],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((user) =>
      [user.first_name, user.last_name, user.email, user.role_name]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [users, search]);

  /** Même règle que l'API : rang strictement supérieur, ou soi-même. */
  function canEdit(user: WorkspaceUser): boolean {
    if (!canWrite) return false;
    if (user.id === account?.id) return true;
    return actorRank > rankOf(user.role);
  }

  async function revoke(id: string) {
    setRevoking(id);
    setRevokeError(null);
    try {
      await revokeInvitation(id);
      invitations.reload();
    } catch (cause) {
      setRevokeError(errorMessage(cause));
    } finally {
      setRevoking(null);
    }
  }

  return (
    <SettingsPage
      title="Membres"
      description="Les comptes qui ont accès à cet espace de travail."
    >
      <SettingsSection
        title="Comptes"
        description={loading ? undefined : `${total} compte${total > 1 ? "s" : ""}`}
        action={
          <div className="flex items-center gap-2">
            <div className="relative w-48">
              <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nom, e-mail, rôle…"
                className="pl-8"
              />
            </div>
            {canWrite && (
              <Button size="sm" onClick={() => setInviting(true)}>
                <UserPlusIcon />
                Inviter
              </Button>
            )}
          </div>
        }
      >
        {error ? (
          <ErrorNotice message={error} />
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table className="[&_thead_th]:text-muted-foreground [&_thead_th]:h-8 [&_thead_th]:text-xs [&_thead_th]:font-medium">
              <TableHeader>
                <TableRow>
                  <TableHead>Membre</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Dernière connexion</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }, (_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="p-0">
                      <EmptyState
                        title="Aucun membre ne correspond"
                        description="Élargissez la recherche."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((user) => {
                    const name =
                      [user.first_name, user.last_name].filter(Boolean).join(" ") ||
                      user.email;

                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <GradientAvatar
                              seed={user.email}
                              text={initials(name)}
                              size={24}
                            />
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {name}
                                {user.id === account?.id && (
                                  <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                                    vous
                                  </span>
                                )}
                              </p>
                              <p className="text-muted-foreground truncate text-xs">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-info-soft text-info rounded-[4px]">
                            {user.role_name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.is_active ? (
                            <Badge className="bg-success-soft text-success rounded-[4px]">
                              Actif
                            </Badge>
                          ) : (
                            <Badge className="bg-neutral-soft text-neutral rounded-[4px]">
                              Désactivé
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-right text-xs">
                          {user.last_login_at
                            ? formatRelative(user.last_login_at)
                            : "jamais"}
                        </TableCell>
                        <TableCell className="text-right">
                          {canEdit(user) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => setEditing(user)}
                              title={`Modifier ${name}`}
                            >
                              <PencilIcon className="size-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </SettingsSection>

      {canWrite && (
        <SettingsSection
          title="Invitations en attente"
          description="Liens émis et non encore utilisés. Chacun ne sert qu'une fois."
        >
          {revokeError && <ErrorNotice message={revokeError} />}

          {invitations.error ? (
            <ErrorNotice message={invitations.error} />
          ) : invitations.loading ? (
            <Skeleton className="h-16 w-full" />
          ) : invitations.invitations.length === 0 ? (
            <div className="rounded-lg border">
              <EmptyState
                title="Aucune invitation en attente"
                description="Le bouton « Inviter » crée un lien à transmettre."
              />
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table className="[&_thead_th]:text-muted-foreground [&_thead_th]:h-8 [&_thead_th]:text-xs [&_thead_th]:font-medium">
                <TableHeader>
                  <TableRow>
                    <TableHead>Invité</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Par</TableHead>
                    <TableHead className="text-right">Expire</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell>
                        <p className="truncate font-medium">{invitation.email}</p>
                        {(invitation.first_name || invitation.last_name) && (
                          <p className="text-muted-foreground truncate text-xs">
                            {[invitation.first_name, invitation.last_name]
                              .filter(Boolean)
                              .join(" ")}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-info-soft text-info rounded-[4px]">
                          {invitation.role_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {invitation.invited_by || "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {invitation.expired ? (
                          <span className="text-danger font-medium">Expirée</span>
                        ) : (
                          <span className="text-muted-foreground">
                            {formatDate(invitation.expires_at)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          disabled={revoking === invitation.id}
                          onClick={() => revoke(invitation.id)}
                          title="Révoquer ce lien"
                        >
                          <XIcon className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </SettingsSection>
      )}

      {editing && (
        <MemberDialog
          key={editing.id}
          user={editing}
          roles={roles}
          actorRank={actorRank}
          isSelf={editing.id === account?.id}
          onClose={() => setEditing(null)}
          onSaved={reload}
        />
      )}

      {inviting && (
        <InviteWizard
          roles={roles}
          actorRank={actorRank}
          onClose={() => setInviting(false)}
          onCreated={invitations.reload}
        />
      )}
    </SettingsPage>
  );
}
