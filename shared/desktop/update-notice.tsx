"use client";

import { useEffect, useState } from "react";
import { DownloadIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/shared/ui/feedback";
import { checkForUpdate, type AvailableUpdate } from "./updates";
import { UpdateProgressBar, useUpdateInstall } from "./update-progress";

/** Le premier regard attend que l'écran soit posé : la session passe d'abord. */
const FIRST_CHECK_MS = 10_000;
/** Une application qu'on ne ferme jamais doit aussi apprendre qu'une version attend. */
const CHECK_EVERY_MS = 4 * 60 * 60 * 1000;

/**
 * « Une nouvelle version est prête », en bas à droite, jusqu'au clic.
 *
 * **La relance n'est jamais imposée** : elle ferait perdre une saisie en cours,
 * un devis à moitié rempli. La carte reste discrète, se ferme, et revient à la
 * vérification suivante. Un échec de vérification se tait — le relais peut être
 * éteint, la connexion coupée, et rien de cela n'est l'affaire de la personne ;
 * un échec d'installation, lui, se dit, puisqu'elle a cliqué.
 */
export function UpdateNotice() {
  const [update, setUpdate] = useState<AvailableUpdate | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const { installing, progress, error, install } = useUpdateInstall();

  useEffect(() => {
    let alive = true;
    const look = () =>
      checkForUpdate()
        .then((found) => {
          if (alive) setUpdate(found);
        })
        .catch((cause: unknown) => console.warn("Vérification des mises à jour :", cause));

    const first = setTimeout(look, FIRST_CHECK_MS);
    const every = setInterval(look, CHECK_EVERY_MS);
    return () => {
      alive = false;
      clearTimeout(first);
      clearInterval(every);
    };
  }, []);

  if (!update || dismissed === update.version) return null;

  return (
    <div
      role="status"
      className="bg-card fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2 rounded-xl border p-4 shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold">Version {update.version} disponible</p>
        <button
          type="button"
          aria-label="Plus tard"
          disabled={installing}
          onClick={() => setDismissed(update.version)}
          className="text-muted-foreground hover:text-foreground -mt-0.5"
        >
          <XIcon className="size-4" />
        </button>
      </div>
      {update.notes && (
        <p className="text-muted-foreground line-clamp-4 text-xs whitespace-pre-line">
          {update.notes}
        </p>
      )}
      {error && <p className="text-danger text-xs">{error}</p>}
      {installing && <UpdateProgressBar progress={progress} />}
      <Button size="sm" disabled={installing} onClick={install}>
        {installing ? <Spinner /> : <DownloadIcon />}
        {installing ? "Installation…" : "Installer et redémarrer"}
      </Button>
    </div>
  );
}
