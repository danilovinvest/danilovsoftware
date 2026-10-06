"use client";

import { useState } from "react";
import { Link2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/shared/api/errors";
import { notifyError, notifySuccess } from "@/shared/ui/toaster";
import { attachThreadToCustomer, dismissThread } from "../lib/api";
import type { ThreadSummary } from "../lib/types";

/**
 * Les choix d'une conversation « à classer » (29/09).
 *
 * Le routage n'a pas tranché : une adresse partagée sans indice, ou deux
 * fiches à égalité. La ligne dit pourquoi, propose les fiches en lice d'un
 * clic, et « Aucune » pour ce qui ne concerne aucune d'elles. Rattacher prend
 * **toute la conversation** et ne retient pas l'adresse : elle est partagée,
 * et la retenir sur une fiche la ferait rattacher à tort la fois suivante.
 *
 * Posée sous la ligne et non dedans : une ligne de liste est un bouton, et un
 * bouton ne se niche pas dans un autre.
 */
export function QueueChoices({
  thread,
  onDone,
}: {
  thread: ThreadSummary;
  onDone: () => void;
}) {
  const [pending, setPending] = useState<string | null>(null);

  const run = async (key: string, action: () => Promise<unknown>, success: string) => {
    setPending(key);
    try {
      await action();
      notifySuccess(success);
      onDone();
    } catch (cause) {
      notifyError(errorMessage(cause), () => void run(key, action, success));
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 px-3 pb-2.5 pl-[2.9rem]" data-demo="mail-queue-choices">
      {thread.queue_reason && (
        <p className="text-muted-foreground text-[11px] leading-snug">{thread.queue_reason}</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {thread.candidates.map((candidate) => (
          <Button
            key={candidate.id}
            size="xs"
            variant="outline"
            disabled={pending !== null}
            title={`Rattacher toute la conversation à ${candidate.name}`}
            onClick={() =>
              void run(candidate.id, () => attachThreadToCustomer(candidate.id, thread.id), `Rangé sur ${candidate.name}`)
            }
          >
            <Link2Icon />
            <span className="max-w-44 truncate">{candidate.name}</span>
          </Button>
        ))}
        <Button
          size="xs"
          variant="ghost"
          disabled={pending !== null}
          title="Ne concerne aucune de ces fiches : la conversation quitte la file"
          onClick={() => void run("none", () => dismissThread(thread.id), "Retiré de la file")}
        >
          <XIcon />
          Aucune
        </Button>
      </div>
    </div>
  );
}
