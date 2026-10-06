"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorNotice } from "@/shared/ui/feedback";
import { TextField } from "@/shared/ui/form";
import { useAction } from "../hooks/use-customers";
import { setSuccessor } from "../lib/syndic-api";
import { refreshSyndicViews } from "../lib/syndic-cache";
import type { ChainMember } from "../lib/syndic-types";
import { CustomerPicker } from "./customer-picker";

/**
 * « Repris par… » : le cabinet qui succède à celui-ci (migration 109).
 *
 * Le Cabinet Cerutti est devenu CGI, AGEFIM est devenu OXIA : la fiche de
 * l'ancien reste, avec son histoire, et le portefeuille du nouveau montre les
 * immeubles hérités. Transférer les immeubles termine leurs mandats ici au
 * jour dit et les ouvre chez le successeur — sans la case, seule la filiation
 * est écrite, et chaque immeuble se bascule à la main.
 */
export function SuccessorDialog({
  customerId,
  customerName,
  current,
  onClose,
  onSaved,
}: {
  customerId: string;
  customerName: string;
  /** Le successeur déjà enregistré, s'il y en a un. */
  current: ChainMember | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [successor, setSuccessorChoice] = useState<{ id: string | null; name: string }>({
    id: current?.id ?? null,
    name: current?.name ?? "",
  });
  const [since, setSince] = useState(current?.started_at?.slice(0, 10) ?? "");
  const [transfer, setTransfer] = useState(current === null);
  const save = useAction(setSuccessor, { inline: true });

  async function submit(successorId: string | null) {
    const ok = await save.run(customerId, {
      successor_id: successorId,
      since: since || null,
      transfer_buildings: successorId !== null && transfer,
    });
    if (ok === null) return;
    // Un transfert change le syndic de chaque immeuble.
    refreshSyndicViews();
    onSaved();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" data-demo="successor-dialog">
        <DialogHeader>
          <DialogTitle>{customerName} — repris par</DialogTitle>
          <DialogDescription>
            Un rachat ou un changement de nom : la fiche reste, et le portefeuille du successeur
            montre ses immeubles comme hérités.
          </DialogDescription>
        </DialogHeader>
        {save.error && <ErrorNotice message={save.error} />}
        <CustomerPicker
          label="Successeur"
          value={successor.id}
          valueName={successor.name}
          placeholder="Chercher le cabinet…"
          onChange={(id, name) => setSuccessorChoice({ id, name })}
        />
        <TextField
          label="Depuis le"
          type="date"
          value={since}
          hint="Vide quand on ne sait pas : « depuis toujours »."
          onChange={(event) => setSince(event.target.value)}
        />
        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            className="mt-0.5"
            checked={transfer}
            onCheckedChange={(state) => setTransfer(state === true)}
          />
          <span>
            Transférer les immeubles gérés
            <span className="text-muted-foreground block text-xs">
              Leurs mandats se terminent ici à cette date et s&apos;ouvrent chez le successeur. Les
              affaires d&apos;avant restent comptées à l&apos;ancien cabinet.
            </span>
          </span>
        </label>
        <DialogFooter className="sm:justify-between">
          {current ? (
            <Button variant="ghost" disabled={save.pending} onClick={() => void submit(null)}>
              Retirer le successeur
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              disabled={save.pending || successor.id === null || successor.id === customerId}
              onClick={() => void submit(successor.id)}
            >
              Enregistrer
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
