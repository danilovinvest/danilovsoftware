"use client";

import { useState } from "react";
import { Unlink2Icon } from "lucide-react";
import { usePermission } from "@/modules/auth";
import { ClaudeButton, customerMailContext } from "@/modules/assistant";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { errorMessage } from "@/shared/api/errors";
import { plural } from "@/shared/lib/format";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { ListSkeleton } from "@/shared/ui/loading";
import { askConfirm } from "@/shared/ui/confirm";
import { notifyError, notifySuccess } from "@/shared/ui/toaster";
import * as api from "../lib/api";
import { useCustomerMailPages } from "../hooks/use-customer-mail";
import { CustomerMailRow } from "./customer-mail-row";

/**
 * Les courriels d'une fiche.
 *
 * Ils ne sont là que parce qu'une adresse de la fiche figure parmi les
 * correspondants — ou parce qu'on les y a rattachés. Les messages dont
 * personne n'est reconnu vivent dans l'écran Messagerie.
 *
 * **Le rapprochement se trompe en série, pas à l'unité.** Une fiche portant une
 * adresse trop large — au pire celle de la boîte elle-même — ramasse des
 * milliers de messages d'un coup. D'où la sélection multiple et le « tout
 * retirer » : corriger cela ligne par ligne serait une journée de clics.
 *
 * **Retirer se défait** (issue 88). Le geste était sans retour, à un clic d'une
 * icône : le toast propose « Annuler », qui rattache à nouveau les courriels
 * retirés. « Tout retirer », lui, demande confirmation — il porte sur des
 * milliers de messages que l'écran n'a pas tous en main pour les rendre.
 */
export function CustomerMail({ customerId }: { customerId: string }) {
  const mail = useCustomerMailPages(customerId);
  const canWrite = usePermission("customers:write");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  function pick(id: string, on: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function detach(ids: string[] | "all") {
    setBusy(true);
    try {
      const result =
        ids === "all"
          ? await api.detachCustomerMailMany(customerId, { all: true })
          : await api.detachCustomerMailMany(customerId, { ids });
      setSelected(new Set());
      const undo = ids === "all" ? undefined : { label: "Annuler", onClick: () => void reattach(ids) };
      notifySuccess(`${plural(result.detached, "courriel retiré", "courriels retirés")} de la fiche`, undo);
    } catch (cause) {
      notifyError(errorMessage(cause), () => void detach(ids));
    } finally {
      setBusy(false);
      mail.reload();
    }
  }

  // Le geste inverse : les mêmes courriels reviennent, sans retenir d'adresse —
  // ce n'était pas le geste défait.
  async function reattach(ids: string[]) {
    try {
      await api.attachCustomerMail(customerId, ids, false);
      notifySuccess("Courriels rattachés à nouveau");
    } catch (cause) {
      notifyError(errorMessage(cause), () => void reattach(ids));
    } finally {
      mail.reload();
    }
  }

  if (mail.loading) return <ListSkeleton rows={5} hue="indigo" />;
  if (mail.error && mail.messages.length === 0) {
    return <ErrorNotice message={errorMessage(mail.error)} onRetry={mail.reload} />;
  }
  if (mail.messages.length === 0) {
    return (
      <EmptyState
        title="Aucun courriel"
        description="Aucun message de la boîte ne cite une adresse de cette fiche. Depuis la Messagerie, « Rattacher à une fiche » en apprend une."
      />
    );
  }

  const shown = mail.messages;
  const allPicked = shown.length > 0 && shown.every((m) => selected.has(m.id));

  return (
    <div className="flex flex-col">
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        {canWrite && (
          <label className="text-muted-foreground flex cursor-pointer items-center gap-2 text-xs">
            <Checkbox
              checked={allPicked}
              disabled={busy}
              onCheckedChange={(value) => setSelected(value === true ? new Set(shown.map((m) => m.id)) : new Set())}
              aria-label="Tout sélectionner"
            />
            Tout sélectionner
            <span className="text-muted-foreground/60 tabular-nums">({shown.length})</span>
          </label>
        )}
        {canWrite && selected.size > 0 && (
          <Button size="xs" variant="outline" disabled={busy} className="text-danger hover:text-danger" onClick={() => void detach([...selected])}>
            <Unlink2Icon />
            Retirer {plural(selected.size, "courriel")}
          </Button>
        )}
        <span className="text-muted-foreground ml-auto text-xs tabular-nums">
          {shown.length < mail.total ? `${shown.length} sur ${mail.total}` : plural(mail.total, "courriel")}
        </span>
        <ClaudeButton size="xs" context={customerMailContext({ total: mail.total })} />
        {/* « Tout retirer » porte sur la fiche entière, pas sur ce qui est à
            l'écran : c'est le seul geste qui répare une fiche ayant ramassé des
            milliers de messages. */}
        {canWrite && (
          <Button
            size="xs"
            variant="ghost"
            disabled={busy}
            className="text-muted-foreground hover:text-danger"
            onClick={async () => {
              const ok = await askConfirm({
                title: `Retirer les ${mail.total} courriels de cette fiche`,
                description:
                  "Ils restent dans la boîte et dans l'écran Messagerie. Ils ne seront simplement plus rattachés à ce client, et ce geste ne s'annule pas.",
                confirmLabel: "Tout retirer",
              });
              if (ok) void detach("all");
            }}
          >
            Tout retirer ({mail.total})
          </Button>
        )}
      </div>

      <div className="divide-y rounded-lg border">
        {shown.map((message) => (
          <CustomerMailRow
            key={message.id}
            customerId={customerId}
            message={message}
            open={expanded === message.id}
            onToggle={() => setExpanded(expanded === message.id ? null : message.id)}
            picked={selected.has(message.id)}
            onPick={(on) => pick(message.id, on)}
            canWrite={canWrite}
            busy={busy}
            onDetach={() => void detach([message.id])}
          />
        ))}
      </div>

      {mail.hasMore && (
        <Button size="sm" variant="outline" className="mt-2 self-center" disabled={mail.loadingMore} onClick={mail.loadMore}>
          {mail.loadingMore ? "Chargement…" : `Charger plus (${mail.total - shown.length} restants)`}
        </Button>
      )}
    </div>
  );
}
