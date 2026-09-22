"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { DownloadIcon, ExternalLinkIcon, EyeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetchBlob } from "@/shared/api/client";
import { errorMessage } from "@/shared/api/errors";
import { cn } from "@/lib/utils";
import { PdfPages } from "./pdf-pages";

/**
 * Voir un document sans quitter le CRM.
 *
 * Ouvrir un devis emmenait dans OneDrive, un onglet de plus et parfois une
 * connexion Microsoft à refaire. Le serveur va chercher le fichier au moment où
 * on l'ouvre et le rend tel quel — un PDF, une image — ou converti en PDF par
 * Microsoft pour un document Word, Excel ou PowerPoint. **Rien n'est gardé** :
 * ni en base, ni sur le serveur ; le navigateur le garde le temps de la fenêtre.
 *
 * On n'intègre pas la visionneuse de Microsoft dans une fenêtre : elle exige une
 * session Microsoft dans le navigateur, et Safari bloque ce genre d'intégration.
 * Le lien vers OneDrive reste là, pour ce que l'aperçu ne sait pas montrer — un
 * plan DWG.
 */
export function PreviewLink({
  url,
  name,
  className,
  children,
}: {
  /** L'adresse du document chez Microsoft (`web_url`, `drive_url`). */
  url: string;
  name: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const source = useMemo<PreviewSource>(
    () => ({
      key: url,
      name,
      load: (signal) => apiFetchBlob("/v1/files/preview", { query: { url }, signal }),
      externalUrl: url,
      description: "Aperçu — le document reste dans OneDrive.",
      pending: "Récupération du document auprès de Microsoft…",
    }),
    [url, name],
  );

  // Sans document, rien à ouvrir : un bouton qui échouerait serait pire.
  if (!url) return <span className={className}>{children}</span>;

  return (
    <>
      <button
        type="button"
        title={`Aperçu de ${name}`}
        onClick={(event) => {
          // Posé dans une ligne cliquable, le lien ne doit pas l'ouvrir aussi.
          event.stopPropagation();
          setOpen(true);
        }}
        className={cn("hover:text-primary inline-flex items-center gap-1 text-left", className)}
      >
        {children}
      </button>
      <PreviewDialog source={open ? source : null} onClose={() => setOpen(false)} />
    </>
  );
}

/**
 * Ce que la fenêtre d'aperçu sait ouvrir : un fichier qu'on va chercher.
 *
 * Un document OneDrive passe par `/v1/files/preview`, une pièce jointe de
 * courriel par sa propre route : la fenêtre ne connaît que la façon de le
 * charger, pas d'où il vient.
 */
export type PreviewSource = {
  /** L'identité du fichier : une autre clé, un autre chargement. */
  key: string;
  name: string;
  load: (signal: AbortSignal) => Promise<Blob>;
  /** Le document chez Microsoft, quand il y vit : « Ouvrir dans OneDrive ». */
  externalUrl?: string;
  /** Sous le titre : d'où vient le fichier et où il reste. */
  description: string;
  /** Pendant le chargement. */
  pending: string;
};

/** La fenêtre d'aperçu seule, pilotée par l'appelant : ouverte tant que `source` n'est pas nul. */
export function PreviewDialog({
  source,
  onClose,
}: {
  source: PreviewSource | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={source !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex h-[88vh] max-w-[min(1100px,96vw)] flex-col gap-3 sm:max-w-[min(1100px,96vw)]">
        {source && <Preview source={source} />}
      </DialogContent>
    </Dialog>
  );
}

/** Le bouton seul, avec l'œil : pour une ligne qui a déjà son libellé. */
export function PreviewButton({ url, name }: { url: string; name: string }) {
  return (
    <PreviewLink url={url} name={name} className="text-muted-foreground rounded-md p-1">
      <EyeIcon className="size-3.5" />
      <span className="sr-only">Aperçu</span>
    </PreviewLink>
  );
}

type Loaded =
  | { key: string; objectUrl: string; type: string; blob: Blob }
  | { key: string; error: string };

function Preview({ source }: { source: PreviewSource }) {
  const { key, name, load, externalUrl, description, pending } = source;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  /** Le document que pdf.js n'a pas su lire : celui-là retombe sur le lecteur du navigateur. */
  const [illisible, setIllisible] = useState<string | null>(null);
  const echecPdf = useCallback(() => setIllisible(key), [key]);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";
    load(controller.signal)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setLoaded({ key, objectUrl, type: blob.type, blob });
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setLoaded({ key, error: errorMessage(cause) });
      });
    return () => {
      controller.abort();
      // Le fichier ne vit que le temps de la fenêtre.
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [key, load]);

  const ready = loaded !== null && loaded.key === key ? loaded : null;

  return (
    <>
      <DialogHeader className="flex-row items-center justify-between gap-3 space-y-0 pr-8">
        <div className="min-w-0">
          <DialogTitle className="truncate text-sm">{name}</DialogTitle>
          <DialogDescription className="text-xs">{description}</DialogDescription>
        </div>
        <div className="flex shrink-0 gap-1.5">
          {ready && "objectUrl" in ready && (
            <Button size="xs" variant="outline" asChild>
              <a href={ready.objectUrl} download={name}>
                <DownloadIcon />
                Télécharger
              </a>
            </Button>
          )}
          {externalUrl && (
            <Button size="xs" variant="outline" asChild>
              <a href={externalUrl} target="_blank" rel="noreferrer">
                <ExternalLinkIcon />
                Ouvrir dans OneDrive
              </a>
            </Button>
          )}
        </div>
      </DialogHeader>

      <div className="bg-muted/40 relative min-h-0 flex-1 overflow-hidden rounded-lg border">
        {!ready && (
          <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
            {pending}
          </div>
        )}
        {ready && "error" in ready && (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="text-sm font-medium">Pas d&apos;aperçu pour ce document</p>
            <p className="text-muted-foreground max-w-md text-xs">{ready.error}</p>
          </div>
        )}
        {ready && "objectUrl" in ready && ready.type.startsWith("image/") && (
          // Un fichier déjà dans le navigateur : rien à optimiser côté serveur.
          <Image src={ready.objectUrl} alt={name} fill unoptimized className="object-contain" />
        )}
        {/*
          Un PDF — ou un document Office que Microsoft a converti en PDF — est
          dessiné par pdf.js : le lecteur du navigateur est un greffon, que la
          politique de sécurité de l'application Windows bloque dans un cadre.
        */}
        {ready && "objectUrl" in ready && ready.type === "application/pdf" && illisible !== key && (
          <PdfPages blob={ready.blob} name={name} onFail={echecPdf} />
        )}
        {ready &&
          "objectUrl" in ready &&
          !ready.type.startsWith("image/") &&
          (ready.type !== "application/pdf" || illisible === key) && (
            <iframe src={ready.objectUrl} title={name} className="h-full w-full bg-white" />
          )}
      </div>
    </>
  );
}
