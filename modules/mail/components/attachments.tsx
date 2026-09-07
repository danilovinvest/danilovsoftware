"use client";

import { useEffect, useState } from "react";
import { DownloadIcon, FileIcon } from "lucide-react";
import { errorMessage } from "@/shared/api/errors";
import * as api from "../lib/api";
import type { MailAttachment } from "../lib/types";

/** « 214 ko », « 1,3 Mo » — la taille telle qu'on la dit. */
function weight(bytes: number): string {
  if (bytes === 0) return "non copiée";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} ko`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;
}

/**
 * Les pièces jointes d'un message.
 *
 * Le lien est un vrai lien, pas un `fetch` : c'est le navigateur qui télécharge,
 * avec le nom de fichier que le serveur donne. Une pièce trop lourde a été
 * enregistrée par son nom seulement — le dire vaut mieux qu'un lien mort.
 */
export function Attachments({ messageId }: { messageId: string }) {
  const [items, setItems] = useState<MailAttachment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    api
      .listAttachments(messageId, controller.signal)
      .then((data) => setItems(data.items))
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setError(errorMessage(cause));
      });
    return () => controller.abort();
  }, [messageId]);

  if (error) return <p className="text-danger mt-2 text-[11px]">{error}</p>;
  if (!items || items.length === 0) return null;

  return (
    <ul className="mt-3 flex flex-wrap gap-2 border-t pt-3">
      {items.map((attachment) => {
        const missing = attachment.size_bytes === 0;
        const label = (
          <>
            <FileIcon className="size-3.5 shrink-0 opacity-60" />
            <span className="max-w-56 truncate">{attachment.filename}</span>
            <span className="text-muted-foreground/60">{weight(attachment.size_bytes)}</span>
          </>
        );
        return (
          <li key={attachment.id}>
            {missing ? (
              <span
                title="Trop lourde pour être conservée : seul son nom l'a été."
                className="bg-muted/40 text-muted-foreground/70 flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px]"
              >
                {label}
              </span>
            ) : (
              <a
                href={api.attachmentUrl(attachment.id)}
                target="_blank"
                rel="noreferrer"
                className="hover:bg-accent flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-colors"
              >
                {label}
                <DownloadIcon className="size-3 shrink-0 opacity-60" />
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
