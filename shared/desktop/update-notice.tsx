"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DownloadIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/shared/ui/feedback";
import { checkForUpdate, type AvailableUpdate } from "./updates";
import { UpdateProgressBar, useUpdateInstall } from "./update-progress";

/** Le premier regard attend que l'écran soit posé : la session passe d'abord. */
const FIRST_CHECK_MS = 10_000;
/** Une application qu'on ne ferme jamais doit aussi apprendre qu'une version attend. */
const CHECK_EVERY_MS = 4 * 60 * 60 * 1000;
/** Revenir sur la fenêtre regarde aussi, mais pas plus d'une fois par quart d'heure. */
const FOCUS_THROTTLE_MS = 15 * 60 * 1000;
/** « Plus tard » veut dire plus tard, pas jamais : l'avis revient passé ce délai. */
const SNOOZE_MS = 4 * 60 * 60 * 1000;

type Dismissal = { version: string; until: number };

/**
 * « Une nouvelle version est prête », en bas à droite, jusqu'au clic.
 *
 * **La relance n'est jamais imposée** : elle ferait perdre une saisie en cours,
 * un devis à moitié rempli. La carte reste discrète et se ferme — pour quatre
 * heures, pas pour la session : une fermeture valait jusqu'ici jusqu'au
 * redémarrage, et une application qu'on ne quitte jamais n'en reparlait plus
 * (issue 69). La vérification suivante qui retrouve la version, une fois ce
 * délai passé, la remontre.
 *
 * On vérifie au lancement, toutes les quatre heures, et au retour sur la
 * fenêtre au plus une fois par quart d'heure : c'est le moment où l'on regarde
 * l'écran. Un échec de vérification se dit **discrètement** — une ligne, qui
 * s'efface d'elle-même au succès suivant : il se taisait, et une application
 * coupée du relais se croyait à jour. Un échec d'installation, lui, se dit dans
 * la carte, puisqu'on a cliqué.
 */
export function UpdateNotice() {
  const [update, setUpdate] = useState<AvailableUpdate | null>(null);
  const [dismissed, setDismissed] = useState<Dismissal | null>(null);
  const [checkFailed, setCheckFailed] = useState(false);
  const { installing, progress, error, install } = useUpdateInstall();
  const lastCheckRef = useRef(0);
  const inFlightRef = useRef(false);

  const look = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    lastCheckRef.current = Date.now();
    try {
      const found = await checkForUpdate();
      setUpdate(found);
      setCheckFailed(false);
      // Le délai est écoulé : la fermeture ne vaut plus, la version revient.
      setDismissed((current) => (current && Date.now() >= current.until ? null : current));
    } catch (cause: unknown) {
      console.warn("Vérification des mises à jour :", cause);
      setCheckFailed(true);
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(() => void look(), FIRST_CHECK_MS);
    const every = setInterval(() => void look(), CHECK_EVERY_MS);
    function onReturn() {
      if (document.visibilityState === "hidden") return;
      if (lastCheckRef.current === 0) return; // le premier regard n'a pas eu lieu
      if (Date.now() - lastCheckRef.current < FOCUS_THROTTLE_MS) return;
      void look();
    }
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      clearTimeout(first);
      clearInterval(every);
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
    };
  }, [look]);

  const hidden = !update || dismissed?.version === update.version;

  if (hidden) {
    if (!checkFailed) return null;
    return (
      <p
        role="status"
        className="bg-card text-muted-foreground fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs shadow-sm"
      >
        Mises à jour : vérification impossible.
        <button
          type="button"
          onClick={() => void look()}
          className="hover:text-foreground font-medium underline underline-offset-2"
        >
          Réessayer
        </button>
        <button
          type="button"
          aria-label="Masquer"
          onClick={() => setCheckFailed(false)}
          className="hover:text-foreground"
        >
          <XIcon className="size-3.5" />
        </button>
      </p>
    );
  }

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
          onClick={() => setDismissed({ version: update.version, until: Date.now() + SNOOZE_MS })}
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
