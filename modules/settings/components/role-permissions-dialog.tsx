"use client";

import { useEffect, useMemo, useState } from "react";
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
import { ErrorNotice, Spinner } from "@/shared/ui/feedback";
import { errorMessage } from "@/shared/api/errors";
import { getRolePermissions, setRolePermissions } from "../lib/api";
import type { PermissionEntry, Role } from "../lib/types";
import { PermissionMatrix } from "./permission-matrix";

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
          <PermissionMatrix
            catalog={catalog}
            held={held}
            selected={selected ?? new Set<string>()}
            loading={loading}
            onToggle={toggle}
          />
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
