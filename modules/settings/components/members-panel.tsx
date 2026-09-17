"use client";

import { companyLabel } from "@/modules/group";

import { useMemo, useState } from "react";
import { KeyRoundIcon, PencilIcon, SearchIcon, UserPlusIcon, XIcon } from "lucide-react";
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
import {
  useInvitations,
  usePasskeyCoverage,
  usePasskeyEnrollments,
  useRoles,
  useWorkspaceUsers,
} from "../hooks/use-settings";
import type { WorkspaceUser } from "../lib/types";
import { InviteWizard } from "./invite-wizard";
import { MemberDialog } from "./member-dialog";
import { PasskeyLinkDialog } from "./passkey-link-dialog";
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
  /*
    Les clés et les liens en circulation, chargés seulement pour qui peut agir.

    Deux lectures distinctes parce que ce sont deux faits distincts : combien de
    clés porte un compte, et quel lien attend d'être ouvert. Les fondre aurait
    obligé l'écran à deviner l'un depuis l'autre — un compte sans clé peut très
    bien avoir déjà reçu son lien.
  */
  const passkeys = usePasskeyCoverage(canWrite);
  const enrollments = usePasskeyEnrollments(canWrite);

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<WorkspaceUser | null>(null);
  const [enrolling, setEnrolling] = useState<WorkspaceUser | null>(null);
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

  /*
    `null` veut dire « on ne sait pas », et la distinction n'est pas
    théorique.

    Un compte absent de la couverture n'a aucune clé — c'est un regroupement en
    base, pas une ligne par personne — mais une carte **vide** dit la même chose
    qu'un compte sans clé. Pendant le chargement, chaque ligne affichait donc
    « aucune clé », y compris pour qui en avait déjà ; et si la lecture échouait,
    l'écran restait bloqué sur ce mensonge sans rien en dire. C'est le défaut que
    ce dépôt a déjà payé sur l'interrupteur de copie OneDrive — un réglage qui
    mentait — et une relecture l'a rattrapé ici.

    On ne rend donc une pastille que lorsqu'on sait, et l'échec se dit.
  */
  const couvertureConnue = !passkeys.loading && passkeys.error === null;
  const liensConnus = !enrollments.loading && enrollments.error === null;
  const keysOf = (id: string): number | null =>
    couvertureConnue ? (passkeys.keysByUser.get(id) ?? 0) : null;
  const liveLinkOf = (id: string) =>
    liensConnus
      ? (enrollments.enrollments.find((entry) => entry.user_id === id) ?? null)
      : null;

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
                        <TableCell data-demo="member-companies">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge className="bg-info-soft text-info rounded-md">
                              {user.role_name}
                            </Badge>
                            {/*
                              La société à côté du rôle : ce sont les deux
                              dimensions d'un compte — ce qu'il peut faire, et
                              pour laquelle des sociétés il le fait.

                              Rien du tout pour un compte qui voit tout le
                              groupe. Une pastille « Tout le groupe » sur chaque
                              ligne ne distinguerait personne, et c'est
                              justement la distinction qu'on vient lire ici.
                            */}
                            {user.issuer !== "" && (
                              <Badge className="bg-neutral-soft text-neutral rounded-md">
                                {companyLabel(user.issuer)}
                              </Badge>
                            )}
                            {/*
                              Les clés d'accès du compte, et c'est la seule
                              question qui commande la bascule vers la clé
                              seule : on ne coupe les mots de passe que
                              lorsque plus personne n'est à zéro. Le zéro est
                              donc en teinte d'alerte, le reste en gris — un
                              compte pourvu n'a rien à signaler.
                            */}
                            {canWrite && keysOf(user.id) !== null && (
                              <Badge
                                data-demo="cles-par-compte"
                                className={
                                  keysOf(user.id) === 0
                                    ? "bg-warning-soft text-warning rounded-md"
                                    : "bg-neutral-soft text-neutral rounded-md"
                                }
                              >
                                {keysOf(user.id) === 0
                                  ? "aucune clé"
                                  : `${keysOf(user.id)} clé${(keysOf(user.id) ?? 0) > 1 ? "s" : ""}`}
                              </Badge>
                            )}
                            {/* L'échec se dit, au lieu de laisser croire que
                                personne n'a de clé. */}
                            {canWrite && passkeys.error !== null && (
                              <Badge
                                className="bg-neutral-soft text-neutral rounded-md"
                                title={passkeys.error}
                              >
                                clés inconnues
                              </Badge>
                            )}
                            {liveLinkOf(user.id) !== null && (
                              <Badge className="bg-info-soft text-info rounded-md">
                                lien envoyé
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.is_active ? (
                            <Badge className="bg-success-soft text-success rounded-md">
                              Actif
                            </Badge>
                          ) : (
                            <Badge className="bg-neutral-soft text-neutral rounded-md">
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
                          <div className="flex justify-end gap-1">
                            {canEdit(user) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                onClick={() => setEnrolling(user)}
                                title={`Enrôler une clé d'accès pour ${name}`}
                              >
                                <KeyRoundIcon className="size-3.5" />
                              </Button>
                            )}
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
                          </div>
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
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge className="bg-info-soft text-info rounded-md">
                            {invitation.role_name}
                          </Badge>
                          {/* Le lien dit dans quel CRM il fait entrer : c'est
                              écrit dans l'invitation, pas posé après coup. */}
                          {invitation.issuer !== "" && (
                            <Badge className="bg-neutral-soft text-neutral rounded-md">
                              {companyLabel(invitation.issuer)}
                            </Badge>
                          )}
                        </div>
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

      {enrolling && (
        <PasskeyLinkDialog
          key={enrolling.id}
          user={enrolling}
          live={liveLinkOf(enrolling.id)}
          onClose={() => setEnrolling(null)}
          onChanged={() => {
            enrollments.reload();
            passkeys.reload();
          }}
        />
      )}
    </SettingsPage>
  );
}
