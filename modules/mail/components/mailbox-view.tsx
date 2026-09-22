"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { KeyboardIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSetPageTitle } from "@/modules/shell";
import { usePermission } from "@/modules/auth";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { errorMessage } from "@/shared/api/errors";
import { MailSyncBadge } from "./mail-sync-badge";
import { MailRail } from "./mail-rail";
import { ThreadList, rowKey } from "./thread-list";
import { ThreadReader } from "./thread-reader";
import { MailDialogs, type MailDialog } from "./mail-dialogs";
import { useMailbox, useMailPulse } from "../hooks/use-mail";
import { threadCacheKey, useThread, useThreads } from "../hooks/use-threads";
import { useMailQuery } from "../hooks/use-mail-query";
import { useMailKeyboard } from "../hooks/use-mail-keyboard";
import { targetOf, useTriage, type TriageTarget } from "../hooks/use-triage";
import { useSearchDraft } from "../hooks/use-search-draft";
import { mainContact } from "../lib/display";
import type { MailThread, MailView } from "../lib/types";

/**
 * La boîte de l'entreprise, conversation par conversation (issue 87).
 *
 * Trois zones sur un grand écran — les vues, la liste, la conversation —, deux
 * sur une tablette, une seule sur un téléphone où la conversation prend tout
 * l'écran et se referme par « Conversations » ou par le bouton Retour.
 *
 * L'écran s'ouvre sur **« À traiter »** : ce qui attend une réponse, et rien
 * d'autre. On lit, on traite (`e`), la suivante s'ouvre. Une conversation
 * traitée revient d'elle-même quand un nouveau message arrive.
 *
 * L'adresse porte tout ce qu'on regarde — la vue, la recherche, le contact, la
 * boîte, la conversation ouverte —, si bien qu'un lien se partage et que ⌘K
 * mène exactement où il dit.
 */
const PAGE = 50;

export function MailboxView() {
  useSetPageTitle("Messagerie");
  const mailbox = useMailbox();

  if (mailbox.error && mailbox.accounts.length === 0) {
    return <ErrorNotice message={mailbox.error} onRetry={mailbox.reload} />;
  }
  if (!mailbox.loading && mailbox.accounts.length === 0) {
    return (
      <Card>
        <EmptyState
          title="Aucune boîte raccordée"
          description="Raccordez la messagerie de l'entreprise pour retrouver ici tous les échanges."
          action={
            <Button asChild size="sm">
              <Link href="/settings/messagerie">Raccorder une boîte</Link>
            </Button>
          }
        />
      </Card>
    );
  }
  return <MailWorkspace mailbox={mailbox} />;
}

function MailWorkspace({ mailbox }: { mailbox: ReturnType<typeof useMailbox> }) {
  const nav = useMailQuery();
  const { query } = nav;
  const { mutate: mutateCache } = useSWRConfig();
  const pulse = useMailPulse();
  const canTask = usePermission("tasks:write");
  const [dialog, setDialog] = useState<MailDialog>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const gmailRef = useRef<HTMLAnchorElement>(null);
  const rows = useRef(new Map<string, HTMLButtonElement>());

  const filters = { view: query.view, search: query.search, contact: query.contact, account: query.account };
  // « Charger plus » vaut pour la recherche en cours : en changer repart de
  // cinquante, sans effet qui remettrait le compteur à zéro après coup.
  const signature = JSON.stringify(filters);
  const [more, setMore] = useState({ signature, limit: PAGE });
  const limit = more.signature === signature ? more.limit : PAGE;

  const threads = useThreads(filters, limit, pulse);
  const opened = useThread(query.message, pulse);
  const items = threads.data?.items ?? null;
  const thread = opened.data;

  // La ligne ouverte se reconnaît à sa conversation, pas à son message : un
  // courriel arrivé depuis a changé le dernier message de la ligne.
  const openedRow = items?.find((t) => t.id === query.message);
  const activeKey = thread ? rowKey(thread) : openedRow ? rowKey(openedRow) : null;
  const pointer = activeKey ?? cursor;
  const index = items ? items.findIndex((t) => rowKey(t) === pointer) : -1;

  const draft = useSearchDraft(query.search, (search) =>
    // Chercher, c'est chercher partout : la boîte choisie restait appliquée
    // pendant qu'on tapait, et un client écrit à l'autre boîte ne remontait pas.
    nav.go(search ? { search, account: "" } : { search }),
  );

  // Le curseur est un vrai focus, pas seulement un liseré : un lecteur d'écran
  // annonce la ligne, et Tab repart de là où j et k ont mené.
  const reveal = useCallback((key: string) => {
    const row = rows.current.get(key);
    row?.focus({ preventScroll: true });
    row?.scrollIntoView({ block: "nearest" });
  }, []);

  // Passer à la conversation voisine : ouverte si une conversation l'est déjà,
  // sinon seulement désignée — Entrée l'ouvrira.
  const move = (delta: number) => {
    if (!items || items.length === 0) return;
    const next = items[index < 0 ? 0 : Math.min(Math.max(index + delta, 0), items.length - 1)];
    setCursor(rowKey(next));
    if (query.message) nav.open(next.id);
    reveal(rowKey(next));
  };

  const onLeave = (target: TriageTarget) => {
    if (!items) return;
    const at = items.findIndex((t) => t.key === target.key && t.account_id === target.accountId);
    const next = items[at + 1] ?? items[at - 1];
    if (next) setCursor(rowKey(next));
    if (!query.message || !thread || thread.key !== target.key) return;
    if (next) nav.open(next.id);
    else nav.close();
  };

  const triage = useTriage({
    view: query.view,
    mutateList: threads.mutate,
    mutateThread: (fresh: MailThread) => {
      const last = fresh.messages[fresh.messages.length - 1];
      if (last) void mutateCache(threadCacheKey(last.id), fresh, { revalidate: false });
      if (thread && rowKey(thread) === rowKey(fresh)) void opened.mutate(fresh, { revalidate: false });
    },
    onLeave,
  });

  const triageCurrent = () => {
    if (thread) return void triage.toggle(targetOf({ ...thread, id: query.message ?? "" }));
    const row = index >= 0 && items ? items[index] : null;
    if (row) void triage.toggle(targetOf(row));
  };

  useMailKeyboard({
    j: () => move(1),
    k: () => move(-1),
    Enter: () => index >= 0 && items && nav.open(items[index].id),
    o: () => index >= 0 && items && nav.open(items[index].id),
    e: triageCurrent,
    u: () => query.message && nav.close(),
    "/": () => searchRef.current?.focus(),
    "?": () => setDialog("help"),
    r: () => gmailRef.current?.click(),
    t: () => thread && canTask && setDialog("task"),
  });

  const contact = thread ? mainContact(thread.messages, thread.account) : "";
  const filterContact = (email: string) => nav.go({ contact: email, view: "tous" as MailView });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h1 className="text-base font-semibold">Messagerie</h1>
          <p className="text-muted-foreground mt-0.5 truncate text-sm">
            {mailbox.accounts.length === 0
              ? "La boîte de l'entreprise"
              : mailbox.accounts.length === 1
                ? mailbox.accounts[0].email
                : `${mailbox.accounts.length} boîtes`}{" "}
            · le CRM lit, on répond dans Gmail.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <MailSyncBadge running={mailbox.running} last={mailbox.last} now={mailbox.now} onDone={mailbox.reload} />
          <Button variant="ghost" size="icon-sm" className="hidden sm:inline-flex" onClick={() => setDialog("help")} aria-label="Raccourcis clavier" title="Raccourcis clavier (?)">
            <KeyboardIcon />
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/settings/messagerie">Réglages</Link>
          </Button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)] lg:grid-cols-[10.5rem_minmax(0,22rem)_minmax(0,1fr)] xl:grid-cols-[12rem_minmax(0,26rem)_minmax(0,1fr)]">
        <div className="hidden min-h-0 lg:flex">
          <MailRail orientation="column" view={query.view} counts={threads.data?.counts ?? null} accounts={mailbox.accounts} account={query.account} onView={(view) => nav.go({ view })} onAccount={(account) => nav.go({ account })} />
        </div>

        <Card className={`min-h-0 min-w-0 flex-col gap-0 overflow-hidden py-0 ${query.message ? "hidden md:flex" : "flex"}`}>
          <div className="border-b px-3 pt-3 lg:hidden">
            <MailRail orientation="strip" view={query.view} counts={threads.data?.counts ?? null} accounts={mailbox.accounts} account={query.account} onView={(view) => nav.go({ view })} onAccount={(account) => nav.go({ account })} />
          </div>
          <ThreadList
            view={query.view}
            draft={draft.value}
            onDraft={draft.set}
            contact={query.contact}
            onClearContact={() => nav.go({ contact: "" })}
            items={items}
            total={threads.data?.total ?? 0}
            loading={threads.isValidating}
            error={threads.error && !threads.data ? errorMessage(threads.error) : null}
            onRetry={() => void threads.mutate()}
            activeKey={activeKey}
            cursorKey={pointer}
            showAccount={mailbox.accounts.length > 1}
            now={mailbox.now}
            onOpen={(row) => {
              setCursor(rowKey(row));
              nav.open(row.id);
            }}
            canLoadMore={!!items && items.length < (threads.data?.total ?? 0) && limit < 300}
            onLoadMore={() => setMore({ signature, limit: Math.min(limit + PAGE, 300) })}
            searchRef={searchRef}
            rowRef={(key) => (element) => {
              if (element) rows.current.set(key, element);
              else rows.current.delete(key);
            }}
          />
        </Card>

        <Card className={`min-h-0 min-w-0 gap-0 py-0 md:overflow-y-auto ${query.message ? "flex" : "hidden md:flex"} flex-col`}>
          <ThreadReader
            thread={thread}
            error={opened.error ? errorMessage(opened.error) : null}
            onRetry={() => void opened.mutate()}
            anchorId={query.message}
            showAccount={mailbox.accounts.length > 1}
            now={mailbox.now}
            contact={contact}
            gmailRef={gmailRef}
            pending={triage.pending}
            onBack={nav.close}
            onToggleDone={triageCurrent}
            onTask={() => setDialog("task")}
            onAttach={() => setDialog("attach")}
            onContact={filterContact}
          />
        </Card>
      </div>

      <MailDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        thread={thread}
        onAttached={() => {
          void opened.mutate();
          void threads.mutate();
        }}
      />
    </div>
  );
}
