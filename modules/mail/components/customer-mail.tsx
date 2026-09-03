"use client";

import { useState } from "react";
import { ChevronRightIcon, MailIcon, PaperclipIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/shared/lib/format";
import { EmptyState, ErrorNotice, Skeleton } from "@/shared/ui/feedback";
import { useCustomerMail } from "../hooks/use-mail";
import { Attachments } from "./attachments";

/**
 * Les courriels d'une fiche.
 *
 * Ils ne sont là que parce qu'une adresse de la fiche figure parmi les
 * correspondants : c'est ce qui a autorisé la copie du corps. Les messages dont
 * personne n'est reconnu ne sont pas ici, et leur contenu n'est pas en base.
 */
export function CustomerMail({ customerId }: { customerId: string }) {
  const [open, setOpen] = useState(false);
  const { messages, loading, error } = useCustomerMail(customerId, true);
  const [expanded, setExpanded] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col">
      <div className="divide-y rounded-lg border">
        {shown.map((message) => {
          const isOpen = expanded === message.id;
          return (
            <div key={message.id}>
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : message.id)}
                className="hover:bg-accent/50 flex w-full items-start gap-3 px-3 py-2 text-left transition-colors"
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

      <p className="text-muted-foreground/70 mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed">
        <MailIcon className="mt-px size-3 shrink-0" />
        <span>
          Copiés depuis la boîte raccordée parce qu&apos;une adresse de cette
          fiche y figure. Le CRM lit la messagerie, il n&apos;y écrit jamais.
        </span>
      </p>
    </div>
  );
}
