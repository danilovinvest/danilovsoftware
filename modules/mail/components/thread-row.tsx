"use client";

import type { Ref } from "react";
import { CheckIcon, CornerUpLeftIcon, MegaphoneIcon, PaperclipIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { GradientAvatar } from "@/shared/ui/gradient-avatar";
import { HUE } from "@/shared/ui/hue";
import { initials } from "@/shared/lib/format";
import { correspondentsLabel, listDate } from "../lib/display";
import type { ThreadSummary } from "../lib/types";

/**
 * Une conversation dans la liste.
 *
 * Trois étages, dans l'ordre où on les lit : **qui** (les correspondants, et
 * combien de messages), **de quoi** (l'objet), **où on en est** (le dernier
 * extrait, puis les pastilles). Une conversation à traiter est en gras, avec un
 * point cyan : c'est le seul signal qu'on cherche en parcourant la liste, il
 * doit se voir sans lire.
 *
 * Les pastilles ne s'affichent que lorsqu'elles disent quelque chose : la
 * fiche, la boîte quand il y en a plusieurs, les pièces jointes, « répondu »
 * quand le dernier mot est le nôtre.
 */
export function ThreadRow({
  thread,
  active,
  cursor,
  showAccount,
  now,
  onOpen,
  ref,
}: {
  thread: ThreadSummary;
  active: boolean;
  cursor: boolean;
  showAccount: boolean;
  now: number;
  onOpen: () => void;
  ref?: Ref<HTMLButtonElement>;
}) {
  const who = correspondentsLabel(thread);
  const seed = thread.correspondents[0] ?? thread.key;
  const reopened = thread.todo && thread.done_at !== null;

  return (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      aria-current={active ? "true" : undefined}
      data-demo={thread.attachment_count > 0 ? "mail-row-with-attachments" : undefined}
      className={cn(
        "relative flex w-full min-w-0 items-start gap-2.5 px-3 py-2.5 text-left transition-colors",
        active ? "bg-muted" : "hover:bg-muted/50",
        // Le curseur du clavier se voit sans déplacer une ligne : un liseré,
        // pas une bordure qui changerait la largeur.
        cursor && !active && "ring-ring/50 ring-2 ring-inset",
      )}
    >
      {thread.todo && (
        <span
          aria-label="À traiter"
          className={cn("absolute top-4 left-1 size-1.5 rounded-full", HUE.cyan.solid)}
        />
      )}
      <GradientAvatar seed={seed} text={initials(who)} size={28} className="mt-0.5 shrink-0" />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className={cn("min-w-0 flex-1 truncate text-xs", thread.todo ? "font-semibold" : "font-medium")}>
            {who}
            {thread.message_count > 1 && (
              <span className="text-muted-foreground ml-1 font-normal tabular-nums">
                {thread.message_count}
              </span>
            )}
          </span>
          <span className="text-muted-foreground/80 shrink-0 text-[0.7rem] whitespace-nowrap tabular-nums">
            {listDate(thread.last_at, now)}
          </span>
        </div>

        <div className={cn("truncate text-sm", thread.todo && "font-medium")}>
          {thread.subject || "(sans objet)"}
        </div>
        {thread.snippet && thread.snippet !== thread.subject && (
          <div className="text-muted-foreground truncate text-xs">{thread.snippet}</div>
        )}

        <Badges thread={thread} showAccount={showAccount} reopened={reopened} />
      </div>
    </button>
  );
}

function Badges({
  thread,
  showAccount,
  reopened,
}: {
  thread: ThreadSummary;
  showAccount: boolean;
  reopened: boolean;
}) {
  const chip = "rounded-sm px-1.5 py-0.5 text-[0.65rem]";
  const done = !thread.todo && thread.done_at !== null;
  const any =
    thread.customer_name || showAccount || thread.attachment_count > 0 || thread.last_outgoing ||
    thread.bulk || done || reopened;
  if (!any) return null;

  return (
    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      {thread.customer_name && (
        <span className={cn(chip, "bg-success-soft text-success max-w-40 truncate")}>
          {thread.customer_name}
        </span>
      )}
      {showAccount && thread.account && (
        <span className={cn(chip, "bg-muted text-muted-foreground max-w-44 truncate")}>
          {thread.account}
        </span>
      )}
      {thread.last_outgoing && (
        <span className="text-info flex items-center gap-0.5 text-[0.65rem]" title="Le dernier mot est le nôtre">
          <CornerUpLeftIcon className="size-2.5" />
          Répondu
        </span>
      )}
      {done && (
        <span className="text-muted-foreground flex items-center gap-0.5 text-[0.65rem]">
          <CheckIcon className="size-2.5" />
          Traité
        </span>
      )}
      {reopened && (
        <span className={cn(chip, HUE.cyan.soft, HUE.cyan.text)} title="Un message est arrivé après le tri">
          Rouvert
        </span>
      )}
      {thread.bulk && (
        <span className="text-muted-foreground/80 flex items-center gap-0.5 text-[0.65rem]">
          <MegaphoneIcon className="size-2.5" />
          Envoi en masse
        </span>
      )}
      {thread.attachment_count > 0 && (
        <span className="text-muted-foreground/80 flex items-center gap-0.5 text-[0.65rem]">
          <PaperclipIcon className="size-2.5" />
          {thread.attachment_count}
        </span>
      )}
    </div>
  );
}
