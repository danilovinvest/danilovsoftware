"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckIcon, LockIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/modules/auth";
import { ErrorNotice, Skeleton, Spinner } from "@/shared/ui/feedback";
import { errorMessage } from "@/shared/api/errors";
import { getRolePermissions, setRolePermissions } from "../lib/api";
import { actionRank, resourceLabel, resourceRank } from "../lib/labels";
import type { PermissionEntry, Role } from "../lib/types";

/**
 * La matrice des permissions d'un rôle.
 *
 * Elle rend visible la règle que l'API applique de toute façon : **on ne peut
 * accorder que des permissions que l'on détient soi-même**. Celles qu'on n'a
 * pas apparaissent verrouillées plutôt que cachées — les masquer laisserait
 * croire qu'elles n'existent pas, et on chercherait pourquoi un rôle ne peut
 * pas faire ce qu'on attend de lui.
 *
 * Le catalogue vient du serveur : ajouter une permission à l'API la fait
 * apparaître ici sans toucher au front.
 */
export function RolePermissionsDialog({
  role,
  catalog,
  catalogLoading,
  onClose,
  onSaved,
}: {
  role: Role;
  catalog: PermissionEntry[];
  catalogLoading: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { account } = useAuth();
  const held = useMemo(
    () => new Set<string>(account?.permissions ?? []),
    [account],
  );

  const [selected, setSelected] = useState<ReadonlySet<string> | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getRolePermissions(role.slug, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setSelected(new Set(data.items));
      })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setError(errorMessage(cause));
        setSelected(new Set());
      });
    return () => controller.abort();
  }, [role.slug]);

  const groups = useMemo(() => {
    const byResource = new Map<string, PermissionEntry[]>();
    for (const entry of catalog) {
      byResource.set(entry.resource, [...(byResource.get(entry.resource) ?? []), entry]);
    }
    return [...byResource.entries()]
      .map(
        ([resource, entries]) =>
          [
            resource,
            [...entries].sort(
              (a, b) =>
                actionRank(a.action) - actionRank(b.action) ||
                a.slug.localeCompare(b.slug),
            ),
          ] as const,
      )
      .sort(([a], [b]) => resourceRank(a) - resourceRank(b) || a.localeCompare(b));
  }, [catalog]);

  function toggle(slug: string) {
    setSelected((current) => {
      if (!current) return current;
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  async function save() {
    if (!selected) return;
    setPending(true);
    setError(null);
    try {
      await setRolePermissions(role.slug, [...selected]);
      onSaved();
      onClose();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  const isOwnRole = account?.role === role.slug;
  const loading = selected === null || catalogLoading;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Permissions — {role.name}</DialogTitle>
          <DialogDescription>
            {selected === null
              ? "Chargement…"
              : selected.size === 0
                ? "Aucune permission accordée"
                : `${selected.size} permission${selected.size > 1 ? "s" : ""} accordée${selected.size > 1 ? "s" : ""}`}
            {" · "}
            {role.user_count} compte{role.user_count > 1 ? "s" : ""} concerné
            {role.user_count > 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        {error && <ErrorNotice message={error} />}

        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {groups.map(([resource, entries]) => (
                <div key={resource} className="flex flex-col gap-1">
                  <p className="text-muted-foreground px-1 text-[11px] font-medium tracking-wide uppercase">
                    {resourceLabel(resource)}
                  </p>
                  <div className="overflow-hidden rounded-lg border">
                    {entries.map((entry) => {
                      const granted = selected.has(entry.slug);
                      const locked = !held.has(entry.slug);

                      return (
                        <button
                          key={entry.slug}
                          type="button"
                          disabled={locked}
                          onClick={() => toggle(entry.slug)}
                          title={
                            locked
                              ? "Vous ne détenez pas cette permission : vous ne pouvez pas l'accorder."
                              : undefined
                          }
                          className={cn(
                            "flex w-full items-start gap-2.5 border-b px-3 py-2 text-left transition-colors last:border-b-0",
                            locked ? "cursor-not-allowed opacity-50" : "hover:bg-accent/60",
                          )}
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[3px] border",
                              granted
                                ? "bg-brand border-transparent text-white"
                                : "border-input",
                            )}
                          >
                            {granted && <CheckIcon className="size-3" strokeWidth={3} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-xs">{entry.description}</span>
                            <span className="text-muted-foreground/70 block font-mono text-[11px]">
                              {entry.slug}
                            </span>
                          </span>
                          {locked && (
                            <LockIcon className="text-muted-foreground mt-0.5 size-3 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {isOwnRole && (
          <p className="text-warning bg-warning-soft/50 rounded-lg px-3 py-2 text-xs">
            C&apos;est votre propre rôle. Les permissions voyagent dans le jeton
            d&apos;accès : le changement ne sera visible qu&apos;au renouvellement,
            dans les quinze minutes.
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Annuler
          </Button>
          <Button type="button" onClick={save} disabled={pending || loading}>
            {pending && <Spinner />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
