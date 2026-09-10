"use client";

import { useEffect, useState } from "react";
import { useDriveRuns } from "@/modules/files";
import { useLastMailRun } from "@/modules/mail";
import { formatAgo } from "@/shared/lib/format";

/**
 * « OneDrive relu il y a 3 min · boîte relue il y a 2 min ».
 *
 * Une ligne, deux faits, deux journaux qui existent déjà. Elle est au pied des
 * onglets Documents et Courriels parce que c'est là qu'on se demande si ce
 * qu'on regarde est à jour — et qu'une liste dont on ignore la fraîcheur se lit
 * comme une liste en panne.
 *
 * Ni badge coloré, ni bouton « relire » : la fraîcheur se dit ici, elle se
 * pilote dans les réglages. Le dirigeant a refusé une interface chargée il y a
 * deux jours ; une phrase grise suffit.
 */
export function SyncFooter() {
  const { runs } = useDriveRuns();
  const mail = useLastMailRun();
  const now = useNow(30_000);

  const drive = runs.find((run) => run.finished_at !== null) ?? null;
  const parts = [
    drive
      ? drive.error
        ? "OneDrive : dernière lecture en échec"
        : `OneDrive relu ${formatAgo(drive.finished_at, now)}`
      : "OneDrive jamais relu",
    mail
      ? mail.error
        ? "boîte : dernière lecture en échec"
        : `boîte relue ${formatAgo(mail.finished_at, now)}`
      : "boîte jamais relue",
  ];

  return (
    <p className="text-muted-foreground/70 px-1 pt-3 text-[11px]">
      {parts.join(" · ")} · le CRM lit, il n&apos;écrit jamais chez Microsoft ni dans
      la boîte.
    </p>
  );
}

/** L'instant, rafraîchi au pas demandé : « il y a 3 min » doit vieillir. */
function useNow(every: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), every);
    return () => clearInterval(timer);
  }, [every]);
  return now;
}
