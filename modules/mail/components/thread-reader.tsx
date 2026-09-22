"use client";

import { useEffect, useRef, useState } from "react";
import type { Ref } from "react";
import { ArrowLeftIcon, ChevronsDownUpIcon, ChevronsUpDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { Bar } from "@/shared/ui/loading";
import { plural } from "@/shared/lib/format";
import { ThreadActions, TriageState } from "./thread-actions";
import { ThreadMessageItem } from "./thread-message";
import type { MailThread, ThreadMessage } from "../lib/types";

/**
 * La conversation ouverte, du plus ancien message au plus récent.
 *
 * Les anciens sont repliés sur une ligne, le dernier est déplié : c'est lui
 * qu'on vient lire, les autres sont le contexte. Le message désigné par
 * l'adresse — celui que ⌘K a trouvé, au milieu d'un fil — est déplié lui aussi,
 * et l'écran s'y place.
 */
export function ThreadReader({
  thread,
  error,
  onRetry,
  anchorId,
  showAccount,
  now,
  contact,
  gmailRef,
  pending,
  onBack,
  onToggleDone,
  onTask,
  onAttach,
  onContact,
}: {
  thread: MailThread | undefined;
  error: string | null;
  onRetry: () => void;
  anchorId: string | null;
  showAccount: boolean;
  now: number;
  contact: string;
  gmailRef: Ref<HTMLAnchorElement>;
  pending: boolean;
  onBack: () => void;
  onToggleDone: () => void;
  onTask: () => void;
  onAttach: () => void;
  onContact: (email: string) => void;
}) {
  if (!anchorId) {
    return (
      <EmptyState
        title="Aucune conversation ouverte"
        description="Choisissez une conversation dans la liste — ou naviguez au clavier : j et k pour descendre et monter, Entrée pour ouvrir, ? pour tous les raccourcis."
      />
    );
  }
  if (error && !thread) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <BackButton onBack={onBack} />
        <ErrorNotice message={error} onRetry={onRetry} />
      </div>
    );
  }
  if (!thread) return <ReaderSkeleton onBack={onBack} />;

  return (
    <OpenedThread
      thread={thread}
      anchorId={anchorId}
      showAccount={showAccount}
      now={now}
      contact={contact}
      gmailRef={gmailRef}
      pending={pending}
      onBack={onBack}
      onToggleDone={onToggleDone}
      onTask={onTask}
      onAttach={onAttach}
      onContact={onContact}
    />
  );
}

/**
 * La conversation ouverte.
 *
 * Sur téléphone, le lecteur remplace la liste : le focus passe au titre, sans
 * quoi un lecteur d'écran restait sur une ligne qui n'est plus à l'écran. Sur
 * un écran large, la liste reste visible et garde le focus — j et k y
 * naviguent — et seule l'annonce dit ce qui s'est ouvert.
 */
function OpenedThread({
  thread,
  anchorId,
  showAccount,
  now,
  contact,
  gmailRef,
  pending,
  onBack,
  onToggleDone,
  onTask,
  onAttach,
  onContact,
}: {
  thread: MailThread;
  anchorId: string;
  showAccount: boolean;
  now: number;
  contact: string;
  gmailRef: Ref<HTMLAnchorElement>;
  pending: boolean;
  onBack: () => void;
  onToggleDone: () => void;
  onTask: () => void;
  onAttach: () => void;
  onContact: (email: string) => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (window.matchMedia("(min-width: 768px)").matches) return;
    titleRef.current?.focus({ preventScroll: true });
  }, [thread.key]);

  const latestIncoming = [...thread.messages].reverse().find((m) => !m.outgoing) ?? null;

  return (
    <article className="flex min-w-0 flex-col" data-demo="mail-thread-reader">
      <header className="bg-card flex flex-col gap-2.5 border-b p-4 md:sticky md:top-0 md:z-10">
        <BackButton onBack={onBack} />
        <h2
          ref={titleRef}
          tabIndex={-1}
          className="text-base leading-snug font-semibold break-words outline-none"
        >
          {thread.subject || "(sans objet)"}
        </h2>
        <p className="sr-only" aria-live="polite">
          Conversation ouverte : {thread.subject || "sans objet"}
        </p>
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <TriageState thread={thread} />
          <span>{plural(thread.messages.length, "message")}</span>
          {showAccount && <span className="truncate">· {thread.account}</span>}
        </div>
        <ThreadActions
          thread={thread}
          latestIncoming={latestIncoming}
          contact={contact}
          gmailRef={gmailRef}
          pending={pending}
          onToggleDone={onToggleDone}
          onTask={onTask}
          onAttach={onAttach}
          onContact={onContact}
        />
      </header>

      <Messages
        key={`${thread.account_id}|${thread.key}`}
        messages={thread.messages}
        anchorId={anchorId}
        now={now}
        onContact={onContact}
      />
    </article>
  );
}

function Messages({
  messages,
  anchorId,
  now,
  onContact,
}: {
  messages: ThreadMessage[];
  anchorId: string;
  now: number;
  onContact: (email: string) => void;
}) {
  const lastId = messages[messages.length - 1]?.id;
  // Ce que l'utilisateur a déplié ou replié lui-même ; le reste suit la règle.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const anchorRef = useRef<HTMLLIElement>(null);

  const isOpen = (id: string) => toggled[id] ?? (id === lastId || id === anchorId);
  const allOpen = messages.every((m) => isOpen(m.id));

  // Le message désigné par l'adresse, au milieu d'un fil, doit se voir sans
  // chercher : l'écran s'y place. Le dernier, lui, se lit en descendant.
  // Une fois par ancre : un message arrivé pendant la lecture ne doit pas
  // ramener l'écran de force là où l'on était à l'ouverture.
  const scrolledFor = useRef<string | null>(null);
  useEffect(() => {
    if (scrolledFor.current === anchorId) return;
    scrolledFor.current = anchorId;
    if (anchorId !== lastId) anchorRef.current?.scrollIntoView({ block: "start" });
  }, [anchorId, lastId]);

  return (
    <div className="flex min-w-0 flex-col">
      {messages.length > 2 && (
        <div className="flex justify-end px-4 pt-2">
          <Button
            size="xs"
            variant="ghost"
            onClick={() =>
              setToggled(Object.fromEntries(messages.map((m) => [m.id, !allOpen])))
            }
          >
            {allOpen ? <ChevronsDownUpIcon /> : <ChevronsUpDownIcon />}
            {allOpen ? "Tout replier" : "Tout déplier"}
          </Button>
        </div>
      )}
      <ol className="divide-y">
        {messages.map((message) => (
          <ThreadMessageItem
            key={message.id}
            ref={message.id === anchorId ? anchorRef : undefined}
            message={message}
            open={isOpen(message.id)}
            onToggle={() => setToggled((current) => ({ ...current, [message.id]: !isOpen(message.id) }))}
            onContact={onContact}
            now={now}
          />
        ))}
      </ol>
    </div>
  );
}

// Le retour à la liste n'existe que là où la liste a disparu : sur un téléphone.
function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <Button size="xs" variant="ghost" className="-ml-2 self-start md:hidden" onClick={onBack}>
      <ArrowLeftIcon />
      Conversations
    </Button>
  );
}

/*
  La forme de la conversation qui arrive : l'objet, la barre d'actions, puis un
  message déplié. Le corps du dernier message peut venir du serveur de
  messagerie — c'est la seule attente de l'écran qui dépasse la seconde.
*/
function ReaderSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <BackButton onBack={onBack} />
      <div className="flex flex-col gap-2">
        <Bar hue="cyan" className="h-4 w-3/4" />
        <Bar className="h-2.5 w-1/3" />
        <div className="flex gap-1.5 pt-1">
          <Bar hue="cyan" className="h-6 w-28" />
          <Bar className="h-6 w-36" />
          <Bar className="h-6 w-28" />
        </div>
      </div>
      <div className="flex flex-col gap-2 border-t pt-4">
        {["w-full", "w-11/12", "w-full", "w-4/5", "w-2/3"].map((width, index) => (
          <Bar key={index} className={`h-2.5 ${width}`} />
        ))}
      </div>
    </div>
  );
}
