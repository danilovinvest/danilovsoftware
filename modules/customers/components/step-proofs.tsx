"use client";

import { useEffect, useState } from "react";
import {
  ExternalLinkIcon,
  FileTextIcon,
  FolderIcon,
  MailIcon,
  PaperclipIcon,
  StickyNoteIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { browse, type DriveItem } from "@/modules/files";
import { listCustomerMail, type MailMessage } from "@/modules/mail";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/shared/api/errors";
import { formatDate, formatDateTime } from "@/shared/lib/format";
import { cn } from "@/lib/utils";
import type { AutoProof } from "../lib/proofs";
import type { StepProof, StepProofInput } from "../lib/types";

/**
 * Les preuves d'un cran : ce qui le prouve déjà, et ce qu'on y joint.
 *
 * Cocher sans rien joindre ne prouvait rien, et c'est ce qui a été reproché. Le
 * panneau montre d'abord ce que l'affaire porte déjà — le PDF du devis, la
 * facture — puis propose d'ajouter un document du dossier OneDrive, un courriel
 * de la fiche, une note, et la date où c'est vraiment arrivé.
 *
 * **Une preuve ne coche pas le cran.** L'état du cran reste celui des faits et
 * des marques : joindre un courriel d'accord ne dit pas à lui seul que le devis
 * est signé, et une seconde vérité sur le même cran divergerait au premier
 * oubli.
 */
export function StepProofs({
  automatic,
  proofs,
  customerId,
  drivePath,
  canWrite,
  pending,
  onAdd,
  onRemove,
}: {
  automatic: AutoProof[];
  proofs: StepProof[];
  customerId: string;
  /** Le dossier OneDrive de l'affaire, vide quand aucun n'est relié. */
  drivePath: string;
  canWrite: boolean;
  pending?: boolean;
  onAdd: (input: StepProofInput) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div data-demo="step-proofs" className="flex flex-col gap-2 border-t pt-3">
      <p className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase">
        <PaperclipIcon className="size-3" />
        Preuves
      </p>

      {automatic.length === 0 && proofs.length === 0 && (
        <p className="text-muted-foreground/70 text-[11px]">Rien ne prouve encore ce cran.</p>
      )}

      <ul className="flex flex-col gap-1.5">
        {automatic.map((proof, index) => (
          <li key={`auto-${index}`} className="flex items-start gap-2 text-xs">
            <FileTextIcon className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
            <span className="min-w-0 flex-1">
              {proof.href ? (
                <a
                  href={proof.href}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-primary inline-flex items-center gap-1 font-medium"
                >
                  {proof.label}
                  <ExternalLinkIcon className="size-3" />
                </a>
              ) : (
                <span className="font-medium">{proof.label}</span>
              )}
              {proof.at && (
                <span className="text-muted-foreground"> · {formatDate(proof.at)}</span>
              )}
              <span className="text-muted-foreground/60 block text-[10px]">porté par l&apos;affaire</span>
            </span>
          </li>
        ))}
        {proofs.map((proof) => (
          <ProofRow key={proof.id} proof={proof} canWrite={canWrite} pending={pending} onRemove={onRemove} />
        ))}
      </ul>

      {canWrite &&
        (adding ? (
          <ProofForm
            customerId={customerId}
            drivePath={drivePath}
            pending={pending}
            onCancel={() => setAdding(false)}
            onSave={async (input) => {
              const ok = await onAdd(input);
              if (ok) setAdding(false);
              return ok;
            }}
          />
        ) : (
          <Button size="xs" variant="outline" className="self-start" onClick={() => setAdding(true)}>
            <PaperclipIcon />
            Joindre une preuve
          </Button>
        ))}
    </div>
  );
}

function ProofRow({
  proof,
  canWrite,
  pending,
  onRemove,
}: {
  proof: StepProof;
  canWrite: boolean;
  pending?: boolean;
  onRemove: (id: string) => Promise<boolean>;
}) {
  return (
    <li className="group flex items-start gap-2 text-xs">
      {proof.mail_message_id ? (
        <MailIcon className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
      ) : proof.drive_url ? (
        <FileTextIcon className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
      ) : (
        <StickyNoteIcon className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
      )}
      <span className="min-w-0 flex-1">
        {proof.drive_url && (
          <a
            href={proof.drive_url}
            target="_blank"
            rel="noreferrer"
            className="hover:text-primary inline-flex items-center gap-1 font-medium break-all"
          >
            {proof.drive_name || "Document"}
            <ExternalLinkIcon className="size-3 shrink-0" />
          </a>
        )}
        {proof.mail_message_id && (
          <span className="block font-medium">
            {proof.mail_subject || "(sans objet)"}
            <span className="text-muted-foreground font-normal"> · {proof.mail_from}</span>
          </span>
        )}
        {proof.note && <span className="block whitespace-pre-line">{proof.note}</span>}
        <span className="text-muted-foreground/70 block text-[10px]">
          {proof.occurred_at ? formatDate(proof.occurred_at) : "date inconnue"}
          {proof.created_by_name && ` · joint par ${proof.created_by_name}`}
        </span>
      </span>
      {canWrite && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm("Retirer cette preuve ?")) void onRemove(proof.id);
          }}
          className="text-muted-foreground hover:text-destructive rounded p-0.5 opacity-60 group-hover:opacity-100"
          aria-label="Retirer la preuve"
        >
          <Trash2Icon className="size-3" />
        </button>
      )}
    </li>
  );
}

type Picker = "none" | "document" | "mail";

function ProofForm({
  customerId,
  drivePath,
  pending,
  onCancel,
  onSave,
}: {
  customerId: string;
  drivePath: string;
  pending?: boolean;
  onCancel: () => void;
  onSave: (input: StepProofInput) => Promise<boolean>;
}) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [document, setDocument] = useState<DriveItem | null>(null);
  const [mail, setMail] = useState<MailMessage | null>(null);
  const [picker, setPicker] = useState<Picker>("none");
  const empty = note.trim() === "" && !document && !mail;

  return (
    <div className="bg-muted/40 flex flex-col gap-2 rounded-lg border p-2">
      <label className="text-muted-foreground flex items-center justify-between gap-2 text-[11px]">
        Quand c&apos;est arrivé
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="bg-background h-7 rounded-md border px-1.5 text-xs"
        />
      </label>

      <Textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Ce qui s'est passé : accord par téléphone, visite faite avec l'architecte…"
        rows={2}
        maxLength={4000}
        className="text-xs"
      />

      <div className="flex flex-wrap gap-1.5">
        <Chip
          icon={FolderIcon}
          active={picker === "document"}
          disabled={!drivePath}
          title={drivePath ? undefined : "Aucun dossier OneDrive n'est relié à cette affaire"}
          onClick={() => setPicker(picker === "document" ? "none" : "document")}
        >
          {document ? document.name : "Document OneDrive"}
        </Chip>
        <Chip
          icon={MailIcon}
          active={picker === "mail"}
          onClick={() => setPicker(picker === "mail" ? "none" : "mail")}
        >
          {mail ? mail.subject || "(sans objet)" : "Courriel de la fiche"}
        </Chip>
        {(document || mail) && (
          <button
            type="button"
            onClick={() => {
              setDocument(null);
              setMail(null);
            }}
            className="text-muted-foreground hover:text-foreground text-[11px] underline"
          >
            retirer la pièce
          </button>
        )}
      </div>

      {picker === "document" && drivePath && (
        <DocumentPicker
          root={drivePath}
          onPick={(item) => {
            setDocument(item);
            setMail(null);
            setPicker("none");
          }}
        />
      )}
      {picker === "mail" && (
        <MailPicker
          customerId={customerId}
          onPick={(message) => {
            setMail(message);
            setDocument(null);
            setPicker("none");
            if (!note.trim()) setDate(message.sent_at.slice(0, 10));
          }}
        />
      )}

      <div className="flex justify-end gap-1.5">
        <Button size="xs" variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
        <Button
          size="xs"
          disabled={pending || empty}
          onClick={() =>
            void onSave({
              occurred_at: date ? new Date(`${date}T12:00:00`).toISOString() : null,
              note: note.trim(),
              drive_item_id: document?.id ?? "",
              drive_name: document?.name ?? "",
              drive_url: document?.web_url ?? "",
              mail_message_id: mail?.id ?? null,
            })
          }
        >
          Joindre
        </Button>
      </div>
    </div>
  );
}

function Chip({
  icon: Icon,
  active,
  disabled,
  title,
  onClick,
  children,
}: {
  icon: typeof MailIcon;
  active: boolean;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={cn(
        "inline-flex max-w-full items-center gap-1 truncate rounded-md border px-1.5 py-0.5 text-[11px] transition-colors disabled:opacity-40",
        active ? "border-primary/50 bg-background text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-3 shrink-0" />
      <span className="truncate">{children}</span>
    </button>
  );
}

/**
 * Le dossier de l'affaire, parcouru en direct : les fichiers récents d'abord,
 * et les sous-dossiers s'ouvrent. Rien n'est recopié — on garde le lien.
 */
function DocumentPicker({ root, onPick }: { root: string; onPick: (item: DriveItem) => void }) {
  const [path, setPath] = useState(root);
  const [result, setResult] = useState<{ path: string; items: DriveItem[]; error: string | null } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    browse(path, controller.signal)
      .then((listing) => setResult({ path, items: listing.items, error: null }))
      .catch((cause) => {
        if (!controller.signal.aborted) setResult({ path, items: [], error: errorMessage(cause) });
      });
    return () => controller.abort();
  }, [path]);

  const loading = result?.path !== path;
  const items = loading ? [] : [...(result?.items ?? [])].sort(
    (a, b) => Number(b.folder) - Number(a.folder) || b.modified_at.localeCompare(a.modified_at),
  );

  return (
    <div className="bg-background max-h-56 overflow-y-auto rounded-md border text-xs">
      {path !== root && (
        <button
          type="button"
          onClick={() => setPath(path.split("/").slice(0, -1).join("/") || root)}
          className="hover:bg-muted w-full px-2 py-1 text-left text-[11px]"
        >
          ← dossier parent
        </button>
      )}
      {loading && <p className="text-muted-foreground px-2 py-2">Lecture du dossier…</p>}
      {result?.error && !loading && <p className="text-danger px-2 py-2">{result.error}</p>}
      {!loading && !result?.error && items.length === 0 && (
        <p className="text-muted-foreground px-2 py-2">Dossier vide.</p>
      )}
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => (item.folder ? setPath(item.path) : onPick(item))}
          className="hover:bg-muted flex w-full items-center gap-2 px-2 py-1 text-left"
        >
          {item.folder ? (
            <FolderIcon className="text-muted-foreground size-3.5 shrink-0" />
          ) : (
            <FileTextIcon className="text-muted-foreground size-3.5 shrink-0" />
          )}
          <span className="min-w-0 flex-1 truncate">{item.name}</span>
          <span className="text-muted-foreground/70 shrink-0 text-[10px]">
            {item.folder ? `${item.child_count}` : formatDate(item.modified_at)}
          </span>
        </button>
      ))}
    </div>
  );
}

/** Les courriels de la fiche, du plus récent au plus ancien. */
function MailPicker({ customerId, onPick }: { customerId: string; onPick: (message: MailMessage) => void }) {
  const [result, setResult] = useState<{ items: MailMessage[]; error: string | null } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    listCustomerMail(customerId, 50, controller.signal)
      .then((response) => setResult({ items: response.items, error: null }))
      .catch((cause) => {
        if (!controller.signal.aborted) setResult({ items: [], error: errorMessage(cause) });
      });
    return () => controller.abort();
  }, [customerId]);

  return (
    <div className="bg-background max-h-56 overflow-y-auto rounded-md border text-xs">
      {!result && <p className="text-muted-foreground px-2 py-2">Lecture des courriels…</p>}
      {result?.error && <p className="text-danger px-2 py-2">{result.error}</p>}
      {result && !result.error && result.items.length === 0 && (
        <p className="text-muted-foreground px-2 py-2">Aucun courriel rattaché à cette fiche.</p>
      )}
      {result?.items.map((message) => (
        <button
          key={message.id}
          type="button"
          onClick={() => onPick(message)}
          className="hover:bg-muted flex w-full flex-col px-2 py-1 text-left"
        >
          <span className="truncate font-medium">{message.subject || "(sans objet)"}</span>
          <span className="text-muted-foreground truncate text-[10px]">
            {message.outgoing ? "Envoyé" : message.from_name || message.from_email} · {formatDateTime(message.sent_at)}
          </span>
        </button>
      ))}
    </div>
  );
}

export { XIcon as _unusedXIcon };
