"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { errorMessage } from "@/shared/api/errors";
import { ErrorNotice } from "@/shared/ui/feedback";
import { SelectField } from "@/shared/ui/form";
import { deleteRole } from "../lib/api";
import type { Role } from "../lib/types";

/**
 * Supprimer un rôle, même porté, sans laisser personne sans rôle.
 *
 * « Je veux pouvoir supprimer des rôles même s'ils sont attribués, juste je ne
 * peux pas laisser un membre sans rôle. » Un rôle porté faisait griser la
 * corbeille. Il se supprime désormais en disant **qui le remplace** : ses
 * porteurs y passent, l'ancien disparaît, dans une seule transaction côté
 * serveur. Le remplaçant se choisit parmi les rôles qu'on a le droit
 * d'attribuer — le serveur le vérifie aussi.
 */
export function RoleDeleteDialog({
  role,
  roles,
  actorRank,
  onOpenChange,
  onDeleted,
}: {
  /** Le rôle à supprimer ; nul, la fenêtre est fermée. */
  role: Role | null;
  roles: Role[];
  actorRank: number;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const [replacement, setReplacement] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const porte = (role?.user_count ?? 0) > 0;
  const choix = roles
    .filter((entry) => entry.slug !== role?.slug && entry.rank <= actorRank)
    .map((entry) => ({ value: entry.slug, label: entry.name }));

  async function confirm() {
    if (!role || (porte && !replacement)) return;
    setPending(true);
    setError(null);
    try {
      await deleteRole(role.slug, porte ? replacement : undefined);
      onDeleted();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={role !== null}
      onOpenChange={(open) => {
        if (!open) {
          setReplacement("");
          setError(null);
        }
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-md" data-demo="role-delete">
        <DialogHeader>
          <DialogTitle>Supprimer le rôle {role?.name}</DialogTitle>
          <DialogDescription>
            {porte
              ? `${role?.user_count} membre${(role?.user_count ?? 0) > 1 ? "s portent" : " porte"} ce rôle. Choisissez celui qu'ils prendront : personne ne reste sans rôle. Leurs sessions sont fermées, pour que le nouveau rôle s'applique tout de suite.`
              : "Personne ne porte ce rôle. Il disparaît avec ses permissions."}
          </DialogDescription>
        </DialogHeader>
        {porte && (
          <SelectField
            label="Remplacé par"
            options={choix}
            placeholder="Choisir un rôle"
            value={replacement}
            onValueChange={setReplacement}
          />
        )}
        {error && <ErrorNotice message={error} />}
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            disabled={pending || (porte && !replacement)}
            onClick={confirm}
          >
            Supprimer le rôle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
