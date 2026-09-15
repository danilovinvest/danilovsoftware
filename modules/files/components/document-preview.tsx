"use client";

import { useEffect, useState } from "react";
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[88vh] max-w-[min(1100px,96vw)] flex-col gap-3 sm:max-w-[min(1100px,96vw)]">
          {open && <Preview url={url} name={name} />}
        </DialogContent>
      </Dialog>
    </>
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

type Loaded = { url: string; objectUrl: string; type: string } | { url: string; error: string };

function Preview({ url, name }: { url: string; name: string }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";
    apiFetchBlob("/v1/files/preview", { query: { url }, signal: controller.signal })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setLoaded({ url, objectUrl, type: blob.type });
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setLoaded({ url, error: errorMessage(cause) });
      });
    return () => {
      controller.abort();
      // Le fichier ne vit que le temps de la fenêtre.
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  const ready = loaded !== null && loaded.url === url ? loaded : null;

  return (
    <>
      <DialogHeader className="flex-row items-center justify-between gap-3 space-y-0 pr-8">
        <div className="min-w-0">
          <DialogTitle className="truncate text-sm">{name}</DialogTitle>
          <DialogDescription className="text-xs">Aperçu — le document reste dans OneDrive.</DialogDescription>
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
          <Button size="xs" variant="outline" asChild>
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLinkIcon />
              Ouvrir dans OneDrive
            </a>
          </Button>
        </div>
      </DialogHeader>

      <div className="bg-muted/40 relative min-h-0 flex-1 overflow-hidden rounded-lg border">
        {!ready && (
          <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
            Récupération du document auprès de Microsoft…
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
        {ready && "objectUrl" in ready && !ready.type.startsWith("image/") && (
          <iframe src={ready.objectUrl} title={name} className="h-full w-full bg-white" />
        )}
      </div>
    </>
  );
}
