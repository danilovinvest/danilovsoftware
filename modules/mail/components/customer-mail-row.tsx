"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRightIcon, MoreHorizontalIcon, PaperclipIcon, SquareArrowOutUpRightIcon, Unlink2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { errorMessage } from "@/shared/api/errors";
import { formatDateTime } from "@/shared/lib/format";
import { ErrorNotice } from "@/shared/ui/feedback";
import { Bar } from "@/shared/ui/loading";
import { useCustomerMessageBody } from "../hooks/use-threads";
import { splitQuote } from "../lib/quote";
import { Attachments } from "./attachments";
import { MailKindBadge } from "./mail-kind-badge";
import type { MailMessage } from "../lib/types";

/**
 * Un courriel de la fiche : une ligne, qui se déplie sur le message entier.
 *
 * Le corps n'est plus tronqué à quatre mille caractères, ni déclaré « non
 * copié » quand il ne l'avait simplement jamais été : le déplier le demande au
 * serveur (issue 88). « Ouvrir dans la messagerie » mène à la conversation
 * entière, là où l'on voit ce qui a été répondu.
 */
export function CustomerMailRow({
  customerId,
  message,
  open,
  onToggle,
  picked,
  onPick,
  canWrite,
  busy,
  onDetach,
}: {
  customerId: string;
  message: MailMessage;
  open: boolean;
  onToggle: () => void;
  picked: boolean;
  onPick: (on: boolean) => void;
  canWrite: boolean;
  busy: boolean;
  onDetach: () => void;
}) {
  return (
    <div>
      <div className={cn("flex items-start transition-colors", picked ? "bg-accent/60" : "hover:bg-accent/50")}>
        {canWrite && (
          <span className="mt-2.5 ml-3 shrink-0">
            <Checkbox
              checked={picked}
              disabled={busy}
              onCheckedChange={(value) => onPick(value === true)}
              aria-label={`Sélectionner « ${message.subject || "(sans objet)"} »`}
            />
          </span>
        )}

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-start gap-3 px-3 py-2 text-left"
        >
          <ChevronRightIcon
            className={cn("text-muted-foreground mt-0.5 size-3.5 shrink-0 transition-transform", open && "rotate-90")}
          />
          <span
            className={cn("mt-1 size-1.5 shrink-0 rounded-full", message.outgoing ? "bg-info" : "bg-success")}
            title={message.outgoing ? "envoyé" : "reçu"}
          />
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-1.5">
              <MailKindBadge message={message} />
              <span className="truncate text-[13px] font-medium">{message.subject || "(sans objet)"}</span>
            </span>
            <span className="text-muted-foreground/70 block truncate text-[11px]">
              {message.outgoing ? "à " : "de "}
              {message.from_name || message.from_email}
              {/* Un rattachement par le fil se dit : c'est celui qu'on ne voit
                  pas venir, et celui qu'on veut pouvoir vérifier. */}
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
          <span className="text-muted-foreground/60 hidden shrink-0 text-[11px] tabular-nums sm:inline">
            {formatDateTime(message.sent_at)}
          </span>
        </button>

        {/* Retirer un courriel de la fiche, pas de la boîte. Le bouton reste
            visible : un bouton qui n'apparaît qu'au survol n'existe pas sur
            une tablette, et c'est là que la fiche se relit. */}
        {canWrite && (
          <button
            type="button"
            title="Retirer ce courriel de la fiche"
            aria-label="Retirer ce courriel de la fiche"
            disabled={busy}
            onClick={onDetach}
            className="text-muted-foreground/40 hover:text-danger hover:bg-danger-soft mt-1.5 mr-2 shrink-0 rounded p-1.5 transition-colors disabled:opacity-40"
          >
            <Unlink2Icon className="size-3.5" />
          </button>
        )}
      </div>

      {open && <ExpandedMail customerId={customerId} message={message} />}
    </div>
  );
}

function ExpandedMail({ customerId, message }: { customerId: string; message: MailMessage }) {
  // Le corps déjà dans la liste suffit ; sinon on le demande, une fois.
  const fetched = useCustomerMessageBody(
    customerId,
    message.body || message.body_fetched ? null : message.id,
  );
  const [showQuote, setShowQuote] = useState(false);
  const body = message.body || fetched.data?.body || "";
  const attachments = fetched.data?.attachment_count ?? message.attachment_count;
  const { main, quoted } = splitQuote(body);

  return (
    <div className="bg-muted/20 flex flex-col gap-2 border-t px-3 py-3 sm:pl-10">
      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <span className="tabular-nums">{formatDateTime(message.sent_at)}</span>
        <Link
          href={`/mail?message=${message.id}`}
          data-demo="customer-mail-open"
          className="hover:text-foreground flex items-center gap-1 font-medium underline-offset-2 hover:underline"
        >
          <SquareArrowOutUpRightIcon className="size-3" />
          Ouvrir dans la messagerie
        </Link>
      </div>

      {fetched.isLoading ? (
        <div className="flex flex-col gap-2">
          {["w-full", "w-11/12", "w-4/5"].map((width) => (
            <Bar key={width} className={cn("h-2.5", width)} />
          ))}
        </div>
      ) : fetched.error ? (
        <ErrorNotice message={errorMessage(fetched.error)} onRetry={() => void fetched.mutate()} />
      ) : body ? (
        <p className="max-w-3xl text-xs leading-relaxed break-words whitespace-pre-wrap">{main}</p>
      ) : (
        <p className="text-muted-foreground/70 text-[11px]">
          Ce message n&apos;a pas de texte — une pièce jointe seule, ou un accusé de réception.
        </p>
      )}

      {quoted && (
        <>
          <button
            type="button"
            onClick={() => setShowQuote((value) => !value)}
            aria-label={showQuote ? "Replier la citation" : "Afficher la citation"}
            className="bg-muted hover:bg-muted/70 text-muted-foreground self-start rounded px-1.5"
          >
            <MoreHorizontalIcon className="size-4" />
          </button>
          {showQuote && (
            <p className="text-muted-foreground max-w-3xl border-l-2 pl-3 text-[11px] leading-relaxed break-words whitespace-pre-wrap">
              {quoted}
            </p>
          )}
        </>
      )}
      {attachments > 0 && <Attachments messageId={message.id} />}
    </div>
  );
}
