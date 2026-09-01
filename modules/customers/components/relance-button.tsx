"use client";

import { PhoneOutgoingIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/shared/lib/format";
import { cn } from "@/lib/utils";
import * as api from "../lib/api";
import { useAction } from "../hooks/use-customers";

/**
 * Enregistre une relance en un clic. La date et l'heure sont posées par le
 * serveur, pas par le navigateur : une horloge de poste décalée ne fausse pas
 * le suivi. Chaque clic ajoute une ligne à l'historique des échanges — rien
 * n'est écrasé, on garde toutes les relances successives.
 */
export function RelanceButton({
  projectId,
  lastReminderAt,
  onDone,
  className,
}: {
  projectId: string;
  lastReminderAt: string | null;
  onDone: () => void;
  className?: string;
}) {
  const relance = useAction(() => api.logReminder(projectId));

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-muted-foreground text-xs whitespace-nowrap">
        {lastReminderAt ? formatDateTime(lastReminderAt) : "jamais relancé"}
      </span>
      <Button
        size="xs"
        variant="outline"
        disabled={relance.pending}
        title={relance.error ?? "Horodate une relance maintenant"}
        onClick={async () => {
          if (await relance.run()) onDone();
        }}
      >
        <PhoneOutgoingIcon />
        Relance effectuée
      </Button>
    </div>
  );
}
