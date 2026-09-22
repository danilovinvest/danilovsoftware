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
import { Label } from "@/components/ui/label";
import { CustomerPicker } from "@/modules/customers";
import { errorMessage } from "@/shared/api/errors";
import { ErrorNotice } from "@/shared/ui/feedback";
import * as api from "../lib/api";
import type { AttachResult, BrowseMessage } from "../lib/types";

/**
 * Rattacher un courriel à une fiche, et retenir qui l'a écrit.
 *
 * L'adresse exacte ne rattache que ce qu'elle connaît, et quatre-vingts fiches
 * sur trois cent soixante-neuf en portent une. Ce qui manque, ce sont des
 * adresses — pas de l'intelligence. Ce dialogue en apprend une par clic : la
 * case « retenir l'adresse » est cochée d'office, et tout le passé de
 * l'expéditeur rejoint la fiche dans la foulée, puis ses fils. Un clic par
 * interlocuteur, jamais un par message.
 *
 * Le résultat est dit en une phrase — « 1 rattaché, adresse retenue, 12
 * courriels plus anciens ont suivi » — parce que c'est ce qui donne envie de
 * recommencer.
 */
export function AttachDialog({
  message,
  ids,
  open,
  onOpenChange,
  onDone,
}: {
  message: BrowseMessage;
  /**
   * Les courriels à rattacher, quand c'est une conversation entière : ses
   * messages suivent ensemble, sans attendre que le fil les rattrape. Absent,
   * le seul `message`.
   */
  ids?: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: (result: AttachResult) => void;
}) {
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [remember, setRemember] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pour un message envoyé par l'entreprise, ce sont les destinataires qu'on
  // retiendrait ; l'écran ne les connaît pas un à un, le serveur les trie.
  const adresse = message.outgoing ? "ses destinataires" : message.from_email;

  async function submit() {
    if (!customerId) return;
    setPending(true);
    setError(null);
    try {
      const result = await api.attachCustomerMail(customerId, ids ?? [message.id], remember);
      onDone(result);
      onOpenChange(false);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rattacher à une fiche</DialogTitle>
          <DialogDescription className="truncate">
            « {message.subject || "(sans objet)"} »
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <CustomerPicker
            label="Fiche"
            value={customerId}
            valueName={customerName}
            onChange={(id, name) => {
              setCustomerId(id);
              setCustomerName(name);
            }}
          />

          <label className="flex items-start gap-2.5">
            <Checkbox
              checked={remember}
              onCheckedChange={(value) => setRemember(value === true)}
              className="mt-0.5"
            />
            <span className="min-w-0">
              <Label className="text-xs font-normal">
                Retenir {adresse} comme interlocuteur de cette fiche
              </Label>
              <span className="text-muted-foreground/70 block text-[11px]">
                Ses courriels passés rejoignent la fiche tout de suite, les
                suivants tout seuls.
              </span>
            </span>
          </label>

          {error && <ErrorNotice message={error} />}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={pending}>
            Annuler
          </Button>
          <Button size="sm" onClick={submit} disabled={pending || !customerId}>
            Rattacher
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
