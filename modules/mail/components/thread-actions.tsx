"use client";

import Link from "next/link";
import type { Ref } from "react";
import {
  CheckIcon,
  ExternalLinkIcon,
  Link2Icon,
  ListTodoIcon,
  MailIcon,
  RotateCcwIcon,
  UserPlusIcon,
  UserRoundIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClaudeButton, mailContext } from "@/modules/assistant";
import { usePermission } from "@/modules/auth";
import { cn } from "@/lib/utils";
import { HUE } from "@/shared/ui/hue";
import type { MailThread, ThreadMessage } from "../lib/types";
import { customerHref } from "@/shared/lib/routes";

/**
 * Les gestes d'une conversation, du plus fréquent au plus rare.
 *
 * **Traiter** d'abord, seul bouton plein : c'est le geste qu'on fait sur chaque
 * conversation, et celui que `e` fait au clavier. Puis **répondre dans Gmail** —
 * le CRM lit la boîte et n'envoie rien, la réponse s'écrit là-bas, sur la bonne
 * boîte et dans le bon fil (issue 62). Puis ce qui relie le courriel au reste
 * du CRM : une tâche, la fiche, tout ce qu'on s'est dit avec ce contact.
 *
 * La barre passe à la ligne sur un écran étroit plutôt que de pousser la page.
 */
export function ThreadActions({
  thread,
  latestIncoming,
  contact,
  gmailRef,
  pending,
  onToggleDone,
  onTask,
  onAttach,
  onContact,
}: {
  thread: MailThread;
  /** Le dernier message reçu : c'est lui qu'on rattache, et lui qui nomme l'expéditeur. */
  latestIncoming: ThreadMessage | null;
  contact: string;
  gmailRef: Ref<HTMLAnchorElement>;
  pending: boolean;
  onToggleDone: () => void;
  onTask: () => void;
  onAttach: () => void;
  onContact: (email: string) => void;
}) {
  const canAttach = usePermission("customers:write");
  const canTask = usePermission("tasks:write");
  const done = !thread.todo && thread.done_at !== null;
  const last = thread.messages[thread.messages.length - 1];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button
        size="xs"
        data-demo="mail-triage"
        onClick={onToggleDone}
        disabled={pending}
        variant={done ? "outline" : "default"}
        title={done ? "Rouvrir la conversation (e)" : "Marquer traitée (e)"}
      >
        {done ? <RotateCcwIcon /> : <CheckIcon />}
        {done ? "Rouvrir" : "Marquer traité"}
        <kbd className="ml-0.5 hidden font-mono text-[10px] opacity-60 sm:inline">e</kbd>
      </Button>

      {thread.gmail_url && (
        <Button size="xs" variant="outline" asChild data-demo="mail-gmail">
          {/* Un lien et non un bouton : `target="_blank"` ouvre un onglet dans
              le navigateur, et l'application de bureau détourne tout lien
              externe vers le navigateur du système. */}
          <a ref={gmailRef} href={thread.gmail_url} target="_blank" rel="noopener noreferrer">
            <ExternalLinkIcon />
            Répondre dans Gmail
          </a>
        </Button>
      )}

      {canTask && (
        <Button size="xs" variant="outline" onClick={onTask} data-demo="mail-task" title="Créer une tâche (t)">
          <ListTodoIcon />
          Créer une tâche
        </Button>
      )}

      {thread.customer_id ? (
        <Button size="xs" variant="outline" asChild>
          <Link href={customerHref(thread.customer_id)}>
            <UserRoundIcon />
            <span className="max-w-40 truncate">{thread.customer_name || "Ouvrir la fiche"}</span>
          </Link>
        </Button>
      ) : (
        canAttach &&
        latestIncoming && (
          <>
            <Button size="xs" variant="outline" onClick={onAttach}>
              <Link2Icon />
              Rattacher à une fiche
            </Button>
            {/* Créer la fiche avec cette adresse suffit : la copie suivante
                rapprochera d'elle-même les messages passés. */}
            <Button size="xs" variant="ghost" asChild>
              <Link
                href={`/customers/nouveau?email=${encodeURIComponent(latestIncoming.from_email)}&name=${encodeURIComponent(latestIncoming.from_name ?? "")}`}
              >
                <UserPlusIcon />
                Créer la fiche
              </Link>
            </Button>
          </>
        )
      )}

      {contact && (
        <Button size="xs" variant="ghost" onClick={() => onContact(contact)} title={`Tout ce qu'on s'est écrit avec ${contact}`}>
          <MailIcon />
          Tout de ce contact
        </Button>
      )}

      <ClaudeButton
        size="xs"
        context={mailContext({
          subject: thread.subject,
          from: last ? (last.from_name || last.from_email) : "",
          customer: thread.customer_id ? thread.customer_name : null,
        })}
      />
    </div>
  );
}

/** Où en est la conversation, en une pastille et une phrase. */
export function TriageState({ thread }: { thread: MailThread }) {
  const when = thread.done_at
    ? new Date(thread.done_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
    : "";
  const by = thread.done_by ? ` par ${thread.done_by}` : "";

  if (thread.todo && thread.done_at) {
    return (
      <span className={cn("rounded-sm px-1.5 py-0.5 text-[11px] font-medium", HUE.cyan.soft, HUE.cyan.text)}>
        Rouvert — traité le {when}
        {by}, un message est arrivé depuis
      </span>
    );
  }
  if (thread.todo) {
    return (
      <span className={cn("rounded-sm px-1.5 py-0.5 text-[11px] font-medium", HUE.cyan.soft, HUE.cyan.text)}>
        À traiter
      </span>
    );
  }
  if (thread.done_at) {
    return (
      <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
        <CheckIcon className="size-3" />
        Traité le {when}
        {by}
      </span>
    );
  }
  return null;
}
