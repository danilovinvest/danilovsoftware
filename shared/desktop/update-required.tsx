"use client";

import { useState, useSyncExternalStore } from "react";
import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/shared/ui/feedback";
import { checkForUpdate, installUpdate } from "./updates";

/**
 * La version de l'application, envoyée à l'API sur chaque appel
 * (`X-App-Version`). Lue du `package.json` à la compilation.
 */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "";

/*
  L'API a répondu 426 : cette version n'est plus servie.

  Tenu hors de React parce que c'est le client HTTP qui l'apprend, loin de tout
  composant, et qu'un seul écran doit s'afficher quel que soit l'appel refusé.
*/
let required: string | null = null;
const listeners = new Set<() => void>();

export function markUpdateRequired(minVersion: string): void {
  if (required !== null) return;
  required = minVersion || "?";
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * L'écran qui bloque une version trop ancienne.
 *
 * L'avis ordinaire (`UpdateNotice`) laisse choisir le moment : il ne faut pas
 * perdre une saisie. Celui-ci ne le laisse pas, parce qu'il n'y a plus rien à
 * perdre — l'API refuse déjà les écritures de cette version. Il installe la
 * mise à jour, que la coque vérifie par sa signature comme toujours.
 */
export function UpdateRequired() {
  const minimum = useSyncExternalStore(subscribe, () => required, () => null);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (minimum === null) return null;

  async function install() {
    setInstalling(true);
    setError(null);
    try {
      // La coque ne sait installer que ce qu'elle vient de trouver.
      const found = await checkForUpdate();
      if (!found) {
        setError("Aucune mise à jour n'est encore disponible au téléchargement. Réessayez dans quelques minutes.");
        setInstalling(false);
        return;
      }
      await installUpdate();
    } catch (cause) {
      setError(typeof cause === "string" ? cause : "L'installation a échoué.");
      setInstalling(false);
    }
  }

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="update-required-title"
      className="bg-background/95 fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-sm"
    >
      <div className="bg-card flex max-w-sm flex-col gap-3 rounded-xl border p-6 text-center shadow-lg">
        <p id="update-required-title" className="text-base font-semibold">
          Mise à jour nécessaire
        </p>
        <p className="text-muted-foreground text-sm">
          Cette version ({APP_VERSION || "inconnue"}) n&apos;est plus prise en charge par le CRM
          {minimum !== "?" && <> : il faut au moins la {minimum}</>}. Installez la mise à jour,
          l&apos;application redémarrera d&apos;elle-même.
        </p>
        {error && <p className="text-danger text-xs">{error}</p>}
        <Button onClick={install} disabled={installing} className="self-center">
          {installing ? <Spinner className="size-4" /> : <DownloadIcon />}
          {installing ? "Installation…" : "Mettre à jour"}
        </Button>
      </div>
    </div>
  );
}
