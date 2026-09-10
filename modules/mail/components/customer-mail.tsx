"use client";

import { useState } from "react";
import { ChevronRightIcon, PaperclipIcon, Unlink2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermission } from "@/modules/auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { errorMessage } from "@/shared/api/errors";
import { formatDateTime } from "@/shared/lib/format";
import { EmptyState, ErrorNotice, Skeleton } from "@/shared/ui/feedback";
import * as api from "../lib/api";
import { useCustomerMail } from "../hooks/use-mail";
import { Attachments } from "./attachments";

/**
 * Les courriels d'une fiche.
 *
 * Ils ne sont là que parce qu'une adresse de la fiche figure parmi les
 * correspondants : c'est ce qui a autorisé la copie du corps. Les messages dont
 * personne n'est reconnu ne sont pas ici, et leur contenu n'est pas en base.
 *
 * **Le rapprochement se trompe en série, pas à l'unité.** Une fiche portant une
 * adresse trop large — au pire celle de la boîte elle-même — ramasse des
 * milliers de messages d'un coup. D'où la sélection multiple et le « tout
 * retirer » : corriger cela ligne par ligne serait une journée de clics.
 */
export function CustomerMail({ customerId }: { customerId: string }) {
  const [open, setOpen] = useState(false);
  const { messages, total, loading, error, reload } = useCustomerMail(customerId, true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const canWrite = usePermission("customers:write");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [detachError, setDetachError] = useState<string | null>(null);

  function pick(id: string, on: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setDetachError(null);
    try {
      await action();
      setSelected(new Set());
      reload();
    } catch (cause) {
      setDetachError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Skeleton className="h-24 w-full" />;
  if (error) return <ErrorNotice message={error} />;

  if (messages.length === 0) {
    return (
      <EmptyState
        title="Aucun courriel"
        description="Aucun message de la boîte raccordée ne cite une adresse de cette fiche."
      />
    );
  }

  const shown = open ? messages : messages.slice(0, 8);
  const allShownPicked = shown.length > 0 && shown.every((m) => selected.has(m.id));
  // La liste est plafonnée, le compteur ne l'est pas : dire « tout retirer »
  // sans annoncer le vrai nombre laisserait croire qu'on ne touche qu'à l'écran.
  const hidden = total - messages.length;

  return (
    <div className="flex flex-col">
      {detachError && (
        <div className="mb-2">
          <ErrorNotice message={detachError} />
        </div>
      )}

      {canWrite && (
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <label className="text-muted-foreground flex cursor-pointer items-center gap-2 text-xs">
            <Checkbox
              checked={allShownPicked}
              disabled={busy}
              onCheckedChange={(value) =>
                setSelected(value === true ? new Set(shown.map((m) => m.id)) : new Set())
              }
              aria-label="Tout sélectionner"
            />
            Tout sélectionner
            <span className="text-muted-foreground/60 tabular-nums">({shown.length})</span>
          </label>

          {selected.size > 0 && (
            <Button
              size="xs"
              variant="outline"
              disabled={busy}
              className="text-danger hover:text-danger"
              onClick={() =>
                run(() =>
                  api.detachCustomerMailMany(customerId, { ids: [...selected] }),
                )
              }
            >
              <Unlink2Icon />
              Retirer {selected.size} courriel{selected.size > 1 ? "s" : ""}
            </Button>
          )}

          {/*
            « Tout retirer » porte sur la fiche entière, pas sur ce qui est à
            l'écran : c'est le seul geste qui répare une fiche ayant ramassé des
            milliers de messages, et il serait inutile s'il s'arrêtait aux cent
            premiers.
          */}
          <Button
            size="xs"
            variant="ghost"
            disabled={busy}
            className="text-muted-foreground hover:text-danger ml-auto"
            onClick={() => {
              if (
                !confirm(
                  `Retirer les ${total} courriels de cette fiche ?\n\n` +
                    "Ils restent dans la boîte et dans l'écran Messagerie ; " +
                    "ils ne seront simplement plus rattachés à ce client.",
                )
              )
                return;
              run(() => api.detachCustomerMailMany(customerId, { all: true }));
            }}
          >
            Tout retirer ({total})
          </Button>
        </div>
      )}

      <div className="divide-y rounded-lg border">
        {shown.map((message) => {
          const isOpen = expanded === message.id;
          const picked = selected.has(message.id);
          return (
            <div key={message.id}>
              <div
                className={cn(
                  "flex items-start transition-colors",
                  picked ? "bg-accent/60" : "hover:bg-accent/50",
                )}
              >
                {canWrite && (
                  <span className="mt-2.5 ml-3 shrink-0">
                    <Checkbox
                      checked={picked}
                      disabled={busy}
                      onCheckedChange={(value) => pick(message.id, value === true)}
                      aria-label={`Sélectionner « ${message.subject || "(sans objet)"} »`}
                    />
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : message.id)}
                  className="flex min-w-0 flex-1 items-start gap-3 px-3 py-2 text-left"
                >
                  <ChevronRightIcon
                    className={cn(
                      "text-muted-foreground mt-0.5 size-3.5 shrink-0 transition-transform",
                      isOpen && "rotate-90",
                    )}
                  />
                  <span
                    className={cn(
                      "mt-1 size-1.5 shrink-0 rounded-full",
                      message.outgoing ? "bg-info" : "bg-success",
                    )}
                    title={message.outgoing ? "envoyé" : "reçu"}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">
                      {message.subject || "(sans objet)"}
                    </span>
                    <span className="text-muted-foreground/70 block truncate text-[11px]">
                      {message.outgoing ? "à " : "de "}
                      {message.from_name || message.from_email}
                      {/* Un rattachement par le fil se dit : c'est celui qu'on
                          ne voit pas venir, et celui qu'on veut pouvoir vérifier. */}
                      {message.matched_by === "fil" && " · rattaché par le fil"}
                      {" · "}
                      {message.snippet}
                    </span>
                  </span>
                  {message.attachment_count > 0 && (
                    <span className="text-muted-foreground/70 flex shrink-0 items-center gap-1 text-[11px]">
                      <PaperclipIcon className="size-3" />
                      {message.attachment_count}
                    </span>
                  )}
                  <span className="text-muted-foreground/60 shrink-0 text-[11px] tabular-nums">
                    {formatDateTime(message.sent_at)}
                  </span>
                </button>

                {/*
                  Retirer un courriel de la fiche, pas de la boîte. Le bouton
                  reste visible, comme la corbeille des échanges : un bouton qui
                  n'apparaît qu'au survol n'existe pas sur une tablette, et
                  c'est là que la fiche se relit.
                */}
                {canWrite && (
                  <button
                    type="button"
                    title="Retirer ce courriel de la fiche"
                    aria-label="Retirer ce courriel de la fiche"
                    disabled={busy}
                    onClick={() =>
                      run(() => api.detachCustomerMail(customerId, message.id))
                    }
                    className="text-muted-foreground/40 hover:text-danger hover:bg-danger-soft mt-1.5 mr-2 shrink-0 rounded p-1.5 transition-colors disabled:opacity-40"
                  >
                    <Unlink2Icon className="size-3.5" />
                  </button>
                )}
              </div>

              {isOpen && (
                <div className="bg-muted/20 border-t px-3 py-3 pl-10">
                  {message.body ? (
                    <p className="text-muted-foreground text-xs leading-relaxed whitespace-pre-wrap">
                      {message.body.slice(0, 4000)}
                      {message.body.length > 4000 && "\n\n[…]"}
                    </p>
                  ) : (
                    <p className="text-muted-foreground/70 text-[11px]">
                      Le corps de ce message n&apos;a pas été copié.
                    </p>
                  )}
                  {message.attachment_count > 0 && <Attachments messageId={message.id} />}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {messages.length > shown.length && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-muted-foreground hover:text-foreground mt-2 self-start text-xs"
        >
          Voir les {messages.length - shown.length} autres
        </button>
      )}

      {hidden > 0 && open && (
        <p className="text-muted-foreground/60 mt-2 text-[11px]">
          {hidden} autres ne sont pas affichés — « Tout retirer » les emporte
          aussi.
        </p>
      )}

    </div>
  );
}
