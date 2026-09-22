"use client";

import { TaskDialog } from "@/modules/tasks";
import { useColleagues } from "@/shared/hooks/use-colleagues";
import { formatDateTime, plural } from "@/shared/lib/format";
import { notifySuccess } from "@/shared/ui/toaster";
import { authorLabel } from "../lib/display";
import { AttachDialog } from "./attach-dialog";
import { ShortcutsDialog } from "./shortcuts-dialog";
import type { AttachResult, MailThread } from "../lib/types";

export type MailDialog = "task" | "attach" | "help" | null;

/**
 * Les boîtes de dialogue de la messagerie, ouvertes par un bouton ou une
 * touche. Aucune n'est propre à la messagerie : la tâche est celle du module
 * des tâches, le rattachement celui qu'on avait déjà — deux formulaires pour
 * un même objet auraient divergé au premier champ ajouté.
 */
export function MailDialogs({
  dialog,
  onClose,
  thread,
  onAttached,
}: {
  dialog: MailDialog;
  onClose: () => void;
  thread: MailThread | undefined;
  onAttached: () => void;
}) {
  const colleagues = useColleagues();
  const latestIncoming = thread ? [...thread.messages].reverse().find((m) => !m.outgoing) : undefined;
  const last = thread?.messages[thread.messages.length - 1];

  return (
    <>
      <ShortcutsDialog open={dialog === "help"} onOpenChange={(open) => !open && onClose()} />

      {dialog === "task" && thread && last && (
        <TaskDialog
          task={null}
          open
          onOpenChange={(open) => !open && onClose()}
          onSaved={() => notifySuccess("Tâche créée — elle attend dans Tâches.")}
          colleagues={colleagues}
          defaultTarget={thread.customer_id ? { customer_id: thread.customer_id } : undefined}
          defaultTargetName={thread.customer_name}
          preset={taskPreset(thread, latestIncoming ? authorLabel(latestIncoming) : "")}
        />
      )}

      {dialog === "attach" && thread && latestIncoming && (
        <AttachDialog
          message={latestIncoming}
          // Toute la conversation suit : ses messages sont un seul échange.
          ids={thread.messages.filter((m) => !m.matched).map((m) => m.id)}
          open
          onOpenChange={(open) => !open && onClose()}
          onDone={(result) => {
            notifySuccess(describeAttach(result));
            onAttached();
          }}
        />
      )}
    </>
  );
}

/*
  La tâche née d'un courriel dit d'où elle vient : l'objet, qui a écrit, quand,
  et l'adresse de la conversation — on la rouvre depuis la tâche sans la
  chercher. Tout reste modifiable avant d'enregistrer.
*/
function taskPreset(thread: MailThread, author: string) {
  const last = thread.messages[thread.messages.length - 1];
  const subject = thread.subject || "(sans objet)";
  const title = author ? `Répondre à ${author} — ${subject}` : `Suite du courriel — ${subject}`;
  return {
    title: title.length > 140 ? `${title.slice(0, 139)}…` : title,
    body: [
      `Courriel du ${formatDateTime(last.sent_at)}, boîte ${thread.account}.`,
      last.snippet,
      `Conversation : /mail?message=${last.id}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}

/** « 3 rattachés · adresse retenue · 12 courriels de plus ont suivi ». */
function describeAttach(result: AttachResult): string {
  const parts = [plural(result.attached, "rattaché")];
  if (result.remembered.length > 0) {
    parts.push(
      result.email_set && result.remembered.length === 1
        ? "adresse retenue sur la fiche"
        : plural(result.remembered.length, "adresse retenue", "adresses retenues"),
    );
  }
  if (result.rematched > 0) {
    parts.push(`${plural(result.rematched, "courriel")} de plus ${result.rematched > 1 ? "ont" : "a"} suivi`);
  }
  return parts.join(" · ");
}
