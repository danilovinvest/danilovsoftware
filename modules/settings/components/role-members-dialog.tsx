"use client";

import { useMemo, useState } from "react";
import { LockIcon, UserPlusIcon } from "lucide-react";
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
import { EmptyState, ErrorNotice, Spinner } from "@/shared/ui/feedback";
import { GradientAvatar } from "@/shared/ui/gradient-avatar";
import { SelectField } from "@/shared/ui/form";
import { initials } from "@/shared/lib/format";
import { setUserRole } from "../lib/api";
import type { Role, WorkspaceUser } from "../lib/types";

/**
 * Les comptes qui portent un rôle, et les mouvements possibles.
 *
 * Un compte porte **toujours exactement un rôle** : `users.role_id` n'est pas
 * nullable. « Retirer quelqu'un d'un rôle » n'existe donc pas — on lui en donne
 * un autre. L'écran le dit et propose le choix, plutôt qu'un bouton « Retirer »
 * qui cacherait une décision.
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
  const [toAdd, setToAdd] = useState("");

  const actorRank = useMemo(
    () => roles.find((entry) => entry.slug === account?.role)?.rank ?? 0,
    [roles, account],
  );
  const rankOf = useMemo(
    () => (slug: string) => roles.find((entry) => entry.slug === slug)?.rank ?? 0,
    [roles],
  );

  /** Même règle que l'API : rang strictement supérieur, et jamais soi-même. */
  const canManage = (user: WorkspaceUser) =>
    user.id !== account?.id && actorRank > rankOf(user.role);

  const holders = users.filter((user) => user.role === role.slug);
  const candidates = users.filter((user) => user.role !== role.slug && canManage(user));

  const assignable = roles
    .filter((entry) => entry.rank <= actorRank)
    .map((entry) => ({ value: entry.slug, label: entry.name }));

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
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Membres — {role.name}</DialogTitle>
          <DialogDescription>
            Un compte porte toujours exactement un rôle : le sortir d&apos;ici,
            c&apos;est lui en donner un autre.
          </DialogDescription>
        </DialogHeader>

        {error && <ErrorNotice message={error} />}

        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {loading ? (
            <div className="text-muted-foreground flex min-h-24 items-center justify-center">
              <Spinner />
            </div>
          ) : holders.length === 0 ? (
            <div className="rounded-lg border">
              <EmptyState
                title="Aucun compte ne porte ce rôle"
                description="Ajoutez-en un ci-dessous."
              />
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              {holders.map((user) => {
                const name =
                  [user.first_name, user.last_name].filter(Boolean).join(" ") ||
                  user.email;
                const editable = canManage(user);

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
                        {user.email}
                      </p>
                    </div>

                    {editable ? (
                      <div className="w-44 shrink-0">
                        <SelectField
                          options={assignable}
                          value={user.role}
                          disabled={pending === user.id}
                          onValueChange={(slug) => {
                            if (slug !== user.role) void move(user, slug);
                          }}
                        />
                      </div>
                    ) : (
                      <span
                        className="text-muted-foreground flex shrink-0 items-center gap-1 text-[11px]"
                        title={
                          user.id === account?.id
                            ? "Vous ne pouvez pas changer votre propre rôle."
                            : "Ce compte a un rang égal ou supérieur au vôtre."
                        }
                      >
                        <LockIcon className="size-3" />
                        non modifiable
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-end gap-2 border-t pt-3">
          <div className="min-w-0 flex-1">
            <SelectField
              label="Attribuer ce rôle à"
              options={candidates.map((user) => ({
                value: user.id,
                label:
                  [user.first_name, user.last_name].filter(Boolean).join(" ") ||
                  user.email,
              }))}
              value={toAdd}
              emptyLabel="Choisir un compte"
              placeholder={
                candidates.length === 0 ? "Aucun compte disponible" : "Choisir un compte"
              }
              disabled={candidates.length === 0}
              onValueChange={setToAdd}
            />
          </div>
          <Button
            type="button"
            disabled={toAdd === "" || pending !== null}
            onClick={() => {
              const user = candidates.find((entry) => entry.id === toAdd);
              if (user) {
                void move(user, role.slug);
                setToAdd("");
              }
            }}
          >
            <UserPlusIcon />
            Ajouter
          </Button>
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
