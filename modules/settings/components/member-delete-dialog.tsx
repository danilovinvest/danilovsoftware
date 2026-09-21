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
import { ErrorNotice } from "@/shared/ui/feedback";
import { errorMessage } from "@/shared/api/errors";
import { deleteUser } from "../lib/api";

/**
 * Retirer un membre, après avoir dit ce que cela fait.
 *
 * La route existait, gardée par `users:delete` et par le rang, et aucun écran
 * ne l'appelait : « je ne peux pas supprimer des membres ». La confirmation dit
 * ce qui part et ce qui reste, parce que « supprimer » laisse croire que ses
 * fiches et ses tâches disparaissent avec lui — ce n'est pas le cas.
 */
export function MemberDeleteDialog({
  member,
  onOpenChange,
  onDeleted,
}: {
  /** Le membre à retirer ; nul, la fenêtre est fermée. */
  member: { id: string; name: string } | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!member) return;
    setPending(true);
    setError(null);
    try {
      await deleteUser(member.id);
      onDeleted();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={member !== null}
      onOpenChange={(open) => {
        if (!open) setError(null);
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Retirer {member?.name}</DialogTitle>
          <DialogDescription>
            Le compte ne pourra plus se connecter : ses sessions, ses connecteurs
            d&apos;assistant et ses liens de clé d&apos;accès sont révoqués. Ce qu&apos;il a
            écrit reste — fiches, tâches, échanges ne partent pas avec lui.
          </DialogDescription>
        </DialogHeader>
        {error && <ErrorNotice message={error} />}
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="destructive" disabled={pending} onClick={confirm}>
            Retirer le membre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
