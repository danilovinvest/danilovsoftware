"use client";

import type { Ref } from "react";
import { SearchIcon, UserRoundIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { ListSkeleton } from "@/shared/ui/loading";
import { plural } from "@/shared/lib/format";
import { viewSpec } from "../lib/views";
import { ThreadRow } from "./thread-row";
import type { MailView, ThreadSummary } from "../lib/types";

/** La clé d'une conversation dans la liste : une boîte, un fil. */
export function rowKey(thread: Pick<ThreadSummary, "account_id" | "key">): string {
  return `${thread.account_id}|${thread.key}`;
}

/**
 * La liste des conversations : la recherche en tête, les lignes, « Charger
 * plus » au pied.
 *
 * « Charger plus » plutôt que des pages : on trie une liste en la descendant,
 * et une page deux qui remplace la page une fait perdre la ligne où l'on était.
 * Au-delà de trois cents, c'est la recherche qu'il faut affiner, et la liste
 * le dit.
 */
export function ThreadList({
  view,
  draft,
  onDraft,
  contact,
  onClearContact,
  items,
  total,
  loading,
  error,
  onRetry,
  activeKey,
  cursorKey,
  showAccount,
  now,
  onOpen,
  canLoadMore,
  onLoadMore,
  searchRef,
  rowRef,
}: {
  view: MailView;
  draft: string;
  onDraft: (value: string) => void;
  contact: string;
  onClearContact: () => void;
  items: ThreadSummary[] | null;
  total: number;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  activeKey: string | null;
  cursorKey: string | null;
  showAccount: boolean;
  now: number;
  onOpen: (thread: ThreadSummary) => void;
  canLoadMore: boolean;
  onLoadMore: () => void;
  searchRef: Ref<HTMLInputElement>;
  rowRef: (key: string) => (element: HTMLButtonElement | null) => void;
}) {
  const spec = viewSpec(view);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-col gap-2 border-b p-3">
        <div className="relative">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            ref={searchRef}
            type="search"
            className="h-8 pr-8 pl-8"
            placeholder="Objet, correspondant, adresse…"
            aria-label="Chercher dans la messagerie"
            value={draft}
            onChange={(event) => onDraft(event.target.value)}
            onKeyDown={(event) => {
              // Échap rend le clavier à la liste, sans effacer ce qu'on a tapé.
              if (event.key === "Escape") event.currentTarget.blur();
            }}
          />
          <kbd className="text-muted-foreground/70 pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 rounded border px-1 font-mono text-[10px] sm:block">
            /
          </kbd>
        </div>

        {contact && (
          <button
            type="button"
            onClick={onClearContact}
            className="bg-muted hover:bg-muted/70 flex max-w-full items-center gap-1.5 self-start rounded-md px-2 py-1 text-xs"
            title="Retirer ce filtre"
          >
            <UserRoundIcon className="size-3 shrink-0" />
            <span className="truncate">Avec {contact}</span>
            <XIcon className="size-3 shrink-0" />
          </button>
        )}

        {items && !error && (
          <p className="text-muted-foreground text-[11px] tabular-nums">
            {plural(total, "conversation")}
            {loading && " · mise à jour…"}
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 md:overflow-y-auto" data-demo="mail-thread-list">
        {error ? (
          <div className="p-3">
            <ErrorNotice message={error} onRetry={onRetry} />
          </div>
        ) : items === null ? (
          <ListSkeleton rows={9} hue="cyan" />
        ) : items.length === 0 ? (
          <EmptyState title={spec.empty.title} description={spec.empty.description} />
        ) : (
          <ol className="divide-y">
            {items.map((thread) => {
              const key = rowKey(thread);
              return (
                <li key={key}>
                  <ThreadRow
                    ref={rowRef(key)}
                    thread={thread}
                    active={key === activeKey}
                    cursor={key === cursorKey}
                    showAccount={showAccount}
                    now={now}
                    onOpen={() => onOpen(thread)}
                  />
                </li>
              );
            })}
          </ol>
        )}

        {items && items.length > 0 && (canLoadMore || total > items.length) && (
          <div className="flex justify-center border-t p-3">
            {canLoadMore ? (
              <Button size="sm" variant="outline" onClick={onLoadMore} disabled={loading}>
                Charger plus ({(total - items.length).toLocaleString("fr-FR")} restantes)
              </Button>
            ) : (
              <p className="text-muted-foreground text-center text-[11px]">
                {(total - items.length).toLocaleString("fr-FR")} conversations plus anciennes : affinez
                la recherche pour les retrouver.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
