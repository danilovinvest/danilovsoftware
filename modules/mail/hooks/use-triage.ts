"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyedMutator } from "swr";
import { errorMessage } from "@/shared/api/errors";
import { notifyError, notifySuccess } from "@/shared/ui/toaster";
import * as api from "../lib/api";
import type { MailThread, MailView, ThreadPage, ThreadSummary } from "../lib/types";

/** Ce qu'il faut savoir d'une conversation pour la trier. */
export type TriageTarget = { id: string; key: string; accountId: string; done: boolean };

export function targetOf(thread: Pick<ThreadSummary, "id" | "key" | "account_id" | "todo" | "done_at">): TriageTarget {
  return {
    id: thread.id,
    key: thread.key,
    accountId: thread.account_id,
    done: !thread.todo && thread.done_at !== null,
  };
}

const same = (item: ThreadSummary, target: TriageTarget) =>
  item.key === target.key && item.account_id === target.accountId;

/*
  Ce que l'écran montre avant que le serveur ne réponde.

  Dans « À traiter », la conversation traitée **quitte la liste** tout de suite :
  trier trente courriels ne doit pas attendre trente allers-retours. Ailleurs,
  elle reste à sa place, marquée. La liste est relue ensuite de toute façon —
  c'est le serveur qui dit ce qui est à traiter.
*/
function optimistic(page: ThreadPage | undefined, target: TriageTarget, view: MailView): ThreadPage | undefined {
  if (!page) return page;
  const item = page.items.find((entry) => same(entry, target));
  if (!item) return page;
  const done = !target.done;
  // Rouvrir remet « à traiter » ce dont le dernier mot est celui d'un
  // correspondant : la même règle que le serveur, en attendant sa réponse.
  const reopenedTodo = !item.last_outgoing && !item.bulk;
  const todoDelta = done ? (item.todo ? -1 : 0) : reopenedTodo && !item.todo ? 1 : 0;
  const counts = { ...page.counts, a_traiter: Math.max(page.counts.a_traiter + todoDelta, 0) };
  if (done && view === "a_traiter") {
    return {
      ...page,
      counts,
      total: Math.max(page.total - 1, 0),
      items: page.items.filter((entry) => !same(entry, target)),
    };
  }
  const now = new Date().toISOString();
  return {
    ...page,
    counts,
    items: page.items.map((entry) =>
      same(entry, target) ? { ...entry, todo: done ? false : reopenedTodo, done_at: done ? now : null } : entry,
    ),
  };
}

/**
 * Marquer traité, et l'annuler.
 *
 * Le toast propose « Annuler » : un `e` de trop ne doit coûter qu'un clic.
 * `onLeave` est appelé quand la conversation quitte la liste, pour que l'écran
 * passe à la suivante — c'est le rythme du tri : lire, traiter, suivante.
 */
export function useTriage({
  view,
  mutateList,
  mutateThread,
  onLeave,
}: {
  view: MailView;
  mutateList: KeyedMutator<ThreadPage>;
  /** La conversation ouverte, remplacée par ce que le serveur rend. */
  mutateThread: (thread: MailThread) => void;
  onLeave: (target: TriageTarget) => void;
}) {
  const [pending, setPending] = useState(false);
  // Lus au moment du geste : le toast « Annuler » rejoue plus tard.
  const latest = useRef({ view, mutateList, mutateThread, onLeave });
  useEffect(() => {
    latest.current = { view, mutateList, mutateThread, onLeave };
  });

  const toggle = useCallback(async function run(target: TriageTarget): Promise<void> {
    const { view: currentView, mutateList: mutate, mutateThread: replace, onLeave: leave } = latest.current;
    const marking = !target.done;
    if (marking && currentView === "a_traiter") leave(target);
    void mutate((page) => optimistic(page, target, currentView), { revalidate: false });
    setPending(true);
    try {
      const thread = marking ? await api.markThreadDone(target.id) : await api.clearThreadDone(target.id);
      replace(thread);
      if (marking) {
        notifySuccess("Conversation traitée", {
          label: "Annuler",
          onClick: () => void run({ ...target, done: true }),
        });
      }
    } catch (cause) {
      notifyError(errorMessage(cause), () => void run(target));
    } finally {
      setPending(false);
      void mutate();
    }
  }, []);

  return { toggle, pending };
}
