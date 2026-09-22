"use client";

import { useState } from "react";
import { installUpdate, type UpdateProgress } from "./updates";

/**
 * L'installation d'une mise à jour, vue de la page : le geste, sa progression
 * et son échec. Partagée par l'avis ordinaire et l'écran bloquant, qui
 * divergeraient sinon au premier ajustement.
 *
 * `prepare` s'exécute avant l'installation et peut l'annuler en rendant un
 * message : l'écran bloquant y cherche d'abord la version, la coque ne sachant
 * installer que ce qu'elle vient de trouver.
 */
export function useUpdateInstall(prepare?: () => Promise<string | null>) {
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function install() {
    setInstalling(true);
    setProgress(null);
    setError(null);
    try {
      const refused = prepare ? await prepare() : null;
      if (refused) {
        setError(refused);
        setInstalling(false);
        return;
      }
      // Ne se résout que si l'installation échoue : sinon l'application relance.
      await installUpdate(setProgress);
    } catch (cause) {
      setError(typeof cause === "string" ? cause : "L'installation a échoué.");
      setInstalling(false);
      setProgress(null);
    }
  }

  return { installing, progress, error, install };
}

const MB = 1024 * 1024;

function megabytes(bytes: number): string {
  return (bytes / MB).toLocaleString("fr-FR", { maximumFractionDigits: 1 });
}

/**
 * La barre de téléchargement. Sans taille annoncée par le serveur, elle dit
 * combien est arrivé plutôt que d'inventer un pourcentage ; une fois les octets
 * reçus, elle dit que la signature se vérifie — l'étape qui suit dure quelques
 * secondes, et une barre pleine immobile se lirait comme un blocage.
 */
export function UpdateProgressBar({ progress }: { progress: UpdateProgress | null }) {
  const finished = progress?.event === "finished";
  const downloaded = progress?.event === "downloading" ? progress.downloaded : 0;
  const total = progress?.event === "downloading" ? progress.total : null;
  const percent = finished ? 100 : total ? Math.min(100, Math.round((downloaded / total) * 100)) : null;

  const label = finished
    ? "Vérification et installation…"
    : progress === null
      ? "Préparation du téléchargement…"
      : total
        ? `Téléchargement : ${percent} % (${megabytes(downloaded)} / ${megabytes(total)} Mo)`
        : `Téléchargement : ${megabytes(downloaded)} Mo`;

  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="progressbar"
        aria-label="Téléchargement de la mise à jour"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? undefined}
        aria-valuetext={label}
        className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
      >
        <div
          className={
            percent === null
              ? "bg-foreground/60 h-full w-1/3 animate-pulse rounded-full"
              : "bg-foreground h-full rounded-full transition-[width] duration-300"
          }
          style={percent === null ? undefined : { width: `${percent}%` }}
        />
      </div>
      <p className="text-muted-foreground text-xs tabular-nums">
        {label}
      </p>
    </div>
  );
}
