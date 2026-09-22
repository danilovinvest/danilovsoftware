"use client";

import { useState } from "react";
import type { Ref } from "react";
import { MoreHorizontalIcon, PaperclipIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { GradientAvatar } from "@/shared/ui/gradient-avatar";
import { Bar } from "@/shared/ui/loading";
import { ErrorNotice } from "@/shared/ui/feedback";
import { errorMessage } from "@/shared/api/errors";
import { formatDateTime, initials } from "@/shared/lib/format";
import { authorLabel, listDate, recipientsOf } from "../lib/display";
import { splitQuote } from "../lib/quote";
import { MATCHED_BY } from "../lib/labels";
import { useMessageBody } from "../hooks/use-threads";
import { Attachments } from "./attachments";
import type { ThreadMessage } from "../lib/types";

/**
 * Un message d'une conversation.
 *
 * **Replié, une ligne** : qui, le début du texte, quand. Une conversation de
 * douze messages se lit alors d'un coup d'œil, et c'est le dernier — déplié
 * d'office — qu'on lit en entier.
 *
 * **Déplié, tout ce que l'écran taisait** : l'expéditeur avec son adresse, tous
 * les correspondants (À et Cc, que la copie réunit), la date exacte, le corps,
 * les pièces jointes. Le corps jamais copié est demandé au dépliage, pas avant :
 * c'est le même arbitrage que la copie sélective, pris au moment où l'on lit.
 */
export function ThreadMessageItem({
  message,
  open,
  onToggle,
  onContact,
  now,
  ref,
}: {
  message: ThreadMessage;
  open: boolean;
  onToggle: () => void;
  /** « Tout de ce contact » depuis une adresse du message. */
  onContact: (email: string) => void;
  now: number;
  ref?: Ref<HTMLLIElement>;
}) {
  const author = authorLabel(message);

  if (!open) {
    return (
      <li ref={ref}>
        <button
          type="button"
          onClick={onToggle}
          className="hover:bg-muted/50 flex w-full min-w-0 items-center gap-2.5 px-4 py-2 text-left transition-colors"
        >
          <GradientAvatar
            seed={message.from_email || message.id}
            text={initials(author)}
            size={22}
            className="shrink-0"
          />
          <span className="max-w-[40%] shrink-0 truncate text-xs font-medium">{author}</span>
          <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">{message.snippet}</span>
          {message.attachment_count > 0 && (
            <PaperclipIcon className="text-muted-foreground/70 size-3 shrink-0" />
          )}
          <span className="text-muted-foreground/80 shrink-0 text-[0.7rem] tabular-nums">
            {listDate(message.sent_at, now)}
          </span>
        </button>
      </li>
    );
  }

  return (
    <li ref={ref} className="flex min-w-0 flex-col gap-3 px-4 py-4">
      <MessageHeader message={message} author={author} onToggle={onToggle} onContact={onContact} />
      <MessageBody message={message} />
    </li>
  );
}

function MessageHeader({
  message,
  author,
  onToggle,
  onContact,
}: {
  message: ThreadMessage;
  author: string;
  onToggle: () => void;
  onContact: (email: string) => void;
}) {
  const recipients = recipientsOf(message);
  return (
    <div className="flex min-w-0 items-start gap-3">
      <GradientAvatar
        seed={message.from_email || message.id}
        text={initials(author)}
        size={32}
        className="shrink-0"
      />
      <div className="min-w-0 flex-1">
        <button type="button" onClick={onToggle} className="flex w-full min-w-0 items-baseline gap-2 text-left">
          <span className="min-w-0 truncate text-sm font-medium">{author}</span>
          <span className="text-muted-foreground ml-auto shrink-0 text-xs tabular-nums">
            {formatDateTime(message.sent_at)}
          </span>
        </button>
        <div className="text-muted-foreground mt-0.5 flex min-w-0 flex-wrap gap-x-1 text-xs">
          <span className="shrink-0">De</span>
          <AddressLink email={message.from_email} onContact={onContact} />
          {message.outgoing && <span className="text-muted-foreground/70">(envoyé par la boîte)</span>}
        </div>
        {recipients.length > 0 && (
          <div className="text-muted-foreground mt-0.5 flex min-w-0 flex-wrap gap-x-1 text-xs">
            <span className="shrink-0">À</span>
            {recipients.map((address, index) => (
              <span key={address} className="min-w-0">
                <AddressLink email={address} onContact={onContact} />
                {index < recipients.length - 1 && ","}
              </span>
            ))}
          </div>
        )}
        {message.matched && message.customer_name && message.matched_by && (
          <p className="text-muted-foreground/80 mt-0.5 text-[11px]">
            Rattaché à {message.customer_name} {MATCHED_BY[message.matched_by] ?? ""}
          </p>
        )}
      </div>
    </div>
  );
}

// Une adresse mène à « tout de ce contact » : c'est la question qu'on se pose
// en la lisant — qu'est-ce qu'on s'est déjà dit ?
function AddressLink({ email, onContact }: { email: string; onContact: (email: string) => void }) {
  if (!email) return null;
  return (
    <button
      type="button"
      onClick={() => onContact(email)}
      title={`Toutes les conversations avec ${email}`}
      className="hover:text-foreground min-w-0 break-all underline-offset-2 hover:underline"
    >
      {email}
    </button>
  );
}

function MessageBody({ message }: { message: ThreadMessage }) {
  // Le corps en base suffit ; sinon on le demande — une seule fois, le cache
  // le garde pour le prochain dépliage.
  const fetched = useMessageBody(message.body_fetched ? null : message.id);
  const [showQuote, setShowQuote] = useState(false);

  if (!message.body_fetched && fetched.isLoading) {
    return (
      <div className="flex flex-col gap-2 pl-11">
        {["w-full", "w-11/12", "w-4/5", "w-2/3"].map((width) => (
          <Bar key={width} className={cn("h-2.5", width)} />
        ))}
        <p className="text-muted-foreground/60 text-[11px]">Récupération du message auprès du serveur…</p>
      </div>
    );
  }
  if (fetched.error) {
    return (
      <div className="pl-11">
        <ErrorNotice message={errorMessage(fetched.error)} onRetry={() => void fetched.mutate()} />
      </div>
    );
  }

  const body = message.body_fetched ? message.body : (fetched.data?.body ?? "");
  const attachments = fetched.data?.attachment_count ?? message.attachment_count;
  const { main, quoted } = splitQuote(body);

  return (
    <div className="flex min-w-0 flex-col gap-2 sm:pl-11">
      {body ? (
        // Un courrier se lit dans la police du texte ; `whitespace-pre-wrap`
        // garde les paragraphes que le serveur a conservés en dépliant le HTML.
        <div className="max-w-3xl text-sm leading-relaxed break-words whitespace-pre-wrap">{main}</div>
      ) : (
        <p className="text-muted-foreground text-sm">
          Ce message n&apos;a pas de texte — une pièce jointe seule, ou un accusé de réception.
        </p>
      )}
      {quoted && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowQuote((value) => !value)}
            title={showQuote ? "Replier la citation" : "Afficher la citation"}
            aria-label={showQuote ? "Replier la citation" : "Afficher la citation"}
            className="bg-muted hover:bg-muted/70 text-muted-foreground self-start rounded px-1.5"
          >
            <MoreHorizontalIcon className="size-4" />
          </button>
          {showQuote && (
            <div className="text-muted-foreground max-w-3xl border-l-2 pl-3 text-xs leading-relaxed break-words whitespace-pre-wrap">
              {quoted}
            </div>
          )}
        </div>
      )}
      {attachments > 0 && <Attachments messageId={message.id} />}
    </div>
  );
}
