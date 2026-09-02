"use client";

import { useMemo, useState } from "react";
import { LockIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/modules/auth";
import { errorMessage } from "@/shared/api/errors";
import { ErrorNotice, Spinner } from "@/shared/ui/feedback";
import { GradientAvatar } from "@/shared/ui/gradient-avatar";
import { initials } from "@/shared/lib/format";
import { setUserRole } from "../lib/api";
import type { Role, WorkspaceUser } from "../lib/types";

/** Rôle vers lequel un compte retombe quand on le retire d'un autre. */
const BASE_ROLE = "user";

/**
 * Qui porte ce rôle, avec un bouton par ligne.
 *
 * Un compte porte **toujours exactement un rôle** : `users.role_id` n'est pas
 * nullable. « Retirer » ne veut donc pas dire « plus de rôle » mais « repasser
 * au rôle de base », et le bouton le dit en toutes lettres plutôt que de le
 * cacher derrière une liste déroulante. Un clic, une action, un libellé qui
 * annonce ce qui va se passer.
 */
export function RoleMembersDialog({
  role,
  roles,
  users,
  loading,
  onClose,
  onChanged,
}: {
  role: Role;
  roles: Role[];
  users: WorkspaceUser[];
  loading: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { account } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const actorRank = useMemo(
    () => roles.find((entry) => entry.slug === account?.role)?.rank ?? 0,
    [roles, account],
  );
  const rankOf = useMemo(
    () => (slug: string) => roles.find((entry) => entry.slug === slug)?.rank ?? 0,
    [roles],
  );
  const baseRole = roles.find((entry) => entry.slug === BASE_ROLE);

  /** Même règle que l'API : rang strictement supérieur, et jamais soi-même. */
  const canManage = (user: WorkspaceUser) =>
    user.id !== account?.id &&
    actorRank > rankOf(user.role) &&
    role.rank <= actorRank;

  // Les porteurs d'abord : c'est la réponse à la question qu'on s'est posée en
  // ouvrant la fenêtre.
  const sorted = useMemo(() => {
    const name = (user: WorkspaceUser) =>
      [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email;
    return [...users].sort((a, b) => {
      const holds = Number(b.role === role.slug) - Number(a.role === role.slug);
      return holds || name(a).localeCompare(name(b));
    });
  }, [users, role.slug]);

  const holders = sorted.filter((user) => user.role === role.slug).length;

  async function move(user: WorkspaceUser, slug: string) {
    setPending(user.id);
    setError(null);
    try {
      await setUserRole(user.id, slug);
      onChanged();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(null);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Membres — {role.name}</DialogTitle>
          <DialogDescription>
            {holders === 0
              ? "Aucun compte ne porte ce rôle."
              : `${holders} compte${holders > 1 ? "s" : ""} porte${holders > 1 ? "nt" : ""} ce rôle.`}{" "}
            Retirer quelqu&apos;un le renvoie vers «&nbsp;
            {baseRole?.name ?? "Chargé d'affaires"}&nbsp;».
          </DialogDescription>
        </DialogHeader>

        {error && <ErrorNotice message={error} />}

        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {loading ? (
            <div className="text-muted-foreground flex min-h-24 items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              {sorted.map((user) => {
                const name =
                  [user.first_name, user.last_name].filter(Boolean).join(" ") ||
                  user.email;
                const holds = user.role === role.slug;
                const editable = canManage(user);
                const isBase = role.slug === BASE_ROLE;

                return (
                  <div
                    key={user.id}
                    className="flex items-center gap-2 border-b px-3 py-2 last:border-b-0"
                  >
                    <GradientAvatar seed={user.email} text={initials(name)} size={24} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {name}
                        {user.id === account?.id && (
                          <span className="text-muted-foreground ml-1.5 font-normal">
                            vous
                          </span>
                        )}
                      </p>
                      <p className="text-muted-foreground truncate text-[11px]">
                        {holds ? user.email : user.role_name}
                      </p>
                    </div>

                    {pending === user.id ? (
                      <Spinner className="text-muted-foreground" />
                    ) : !editable ? (
                      <span
                        className="text-muted-foreground flex shrink-0 items-center gap-1 text-[11px]"
                        title={
                          user.id === account?.id
                            ? "Vous ne pouvez pas changer votre propre rôle."
                            : "Ce compte a un rang égal ou supérieur au vôtre."
                        }
                      >
                        <LockIcon className="size-3" />
                        {holds ? "porte ce rôle" : ""}
                      </span>
                    ) : holds && isBase ? (
                      <span className="text-muted-foreground shrink-0 text-[11px]">
                        rôle de base
                      </span>
                    ) : holds ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 shrink-0"
                        onClick={() => move(user, BASE_ROLE)}
                        title={`Repassera « ${baseRole?.name ?? BASE_ROLE} »`}
                      >
                        Retirer
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 shrink-0"
                        onClick={() => move(user, role.slug)}
                      >
                        Donner ce rôle
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-muted-foreground/80 text-[11px]">
          Changer le rôle de quelqu&apos;un ferme ses sessions : il devra se
          reconnecter pour que ses nouvelles permissions prennent effet.
        </p>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
