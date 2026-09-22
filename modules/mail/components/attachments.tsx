"use client";

import { useEffect, useState } from "react";
import { DownloadIcon, EyeIcon, FileIcon, LoaderCircleIcon } from "lucide-react";
import { PreviewDialog, type PreviewSource } from "@/modules/files";
import { errorMessage } from "@/shared/api/errors";
import { canSaveFiles, saveBlob } from "@/shared/lib/save-blob";
import * as api from "../lib/api";
import type { MailAttachment } from "../lib/types";

/** « 214 ko », « 1,3 Mo » — la taille telle qu'on la dit. */
function weight(bytes: number): string {
  if (bytes === 0) return "non copiée";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} ko`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;
}

const IMAGE_EXTENSIONS: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

/**
 * Le type à montrer, ou `null` si la fenêtre d'aperçu ne sait pas le dessiner.
 *
 * Le type déclaré par l'expéditeur d'abord, l'extension à défaut : bien des
 * messageries envoient un PDF en `application/octet-stream`.
 */
function previewType(attachment: MailAttachment): string | null {
  const mime = attachment.mime_type.toLowerCase();
  if (mime === "application/pdf") return mime;
  if (Object.values(IMAGE_EXTENSIONS).includes(mime)) return mime;
  const extension = attachment.filename.split(".").pop()?.toLowerCase() ?? "";
  if (extension === "pdf") return "application/pdf";
  return IMAGE_EXTENSIONS[extension] ?? null;
}

/**
 * Les pièces jointes d'un message.
 *
 * Elles sont lues par `fetch`, jamais par un lien : la route exige le jeton
 * d'accès, qu'un `<a href>` ne transmet pas, et le clic rendait 401
 * (issue 61). Un PDF ou une image s'ouvre dans la fenêtre d'aperçu des
 * documents ; le reste s'enregistre sur l'ordinateur. Une pièce trop lourde a
 * été enregistrée par son nom seulement — le dire vaut mieux qu'un lien mort.
 */
export function Attachments({ messageId }: { messageId: string }) {
  const [items, setItems] = useState<MailAttachment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewSource | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  const open = (attachment: MailAttachment) => {
    setNotice(null);
    const type = previewType(attachment);
    if (type) {
      setPreview({
        key: attachment.id,
        name: attachment.filename,
        // Le type est reposé : servi en `octet-stream`, un PDF ne serait pas dessiné.
        load: (signal) =>
          api.fetchAttachment(attachment.id, signal).then((blob) => new Blob([blob], { type })),
        description: "Pièce jointe du courriel, conservée par le CRM.",
        pending: "Récupération de la pièce jointe…",
      });
      return;
    }
    if (!canSaveFiles) {
      setNotice(
        `L'application ne sait pas encore enregistrer un fichier sur l'ordinateur : seuls les PDF et les images s'ouvrent ici. Pour « ${attachment.filename} », passez par le CRM dans le navigateur ou par la messagerie.`,
      );
      return;
    }
    setSaving(attachment.id);
    api
      .fetchAttachment(attachment.id)
      .then((blob) => saveBlob(blob, attachment.filename))
      .catch((cause) => setNotice(errorMessage(cause)))
      .finally(() => setSaving(null));
  };

  return (
    <div data-demo="mail-attachments" className="mt-3 border-t pt-3">
      <ul className="flex flex-wrap gap-2">
        {items.map((attachment) => (
          <li key={attachment.id}>
            <AttachmentChip
              attachment={attachment}
              saving={saving === attachment.id}
              onOpen={() => open(attachment)}
            />
          </li>
        ))}
      </ul>
      {notice && <p className="text-muted-foreground mt-2 text-[11px]">{notice}</p>}
      <PreviewDialog source={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

function AttachmentChip({
  attachment,
  saving,
  onOpen,
}: {
  attachment: MailAttachment;
  saving: boolean;
  onOpen: () => void;
}) {
  const label = (
    <>
      <FileIcon className="size-3.5 shrink-0 opacity-60" />
      <span className="max-w-56 truncate">{attachment.filename}</span>
      <span className="text-muted-foreground/60">{weight(attachment.size_bytes)}</span>
    </>
  );

  if (attachment.size_bytes === 0) {
    return (
      <span
        title="Plus de 8 Mo : trop lourde pour être conservée, seul son nom l'a été. Elle reste dans la messagerie."
        className="bg-muted/40 text-muted-foreground/70 flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px]"
      >
        {label}
      </span>
    );
  }

  const Icon = saving ? LoaderCircleIcon : previewType(attachment) ? EyeIcon : DownloadIcon;
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={saving}
      title={previewType(attachment) ? `Aperçu de ${attachment.filename}` : `Télécharger ${attachment.filename}`}
      className="hover:bg-accent flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] transition-colors disabled:opacity-60"
    >
      {label}
      <Icon className={saving ? "size-3 shrink-0 animate-spin opacity-60" : "size-3 shrink-0 opacity-60"} />
    </button>
  );
}
