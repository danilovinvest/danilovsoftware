"use client";

import { Trash2Icon } from "lucide-react";
import { usePermission } from "@/modules/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/shared/ui/feedback";
import { formatDateTime } from "@/shared/lib/format";
import * as api from "../lib/api";
import { INTERACTION_KIND } from "../lib/labels";
import { useAction } from "../hooks/use-customers";
import { CustomerAgenda } from "./customer-agenda";
import { EnumBadge } from "./enum-badge";
import type { Interaction } from "../lib/types";
import { askConfirm } from "@/shared/ui/confirm";

/**
 * Onglet « Échanges ».
 *
 * Deux moitiés, et la distinction est tout le dispositif : **ce qui est prévu**
 * — des événements d'agenda rattachés à la fiche — puis **ce qui a eu lieu**,
 * l'historique.
 *
 * Il n'y a plus qu'une seule façon de noter un échange, et c'est le formulaire
 * d'agenda : un échange daté d'hier est un échange qui a eu lieu, un échange
 * daté de mardi est un échange prévu. Deux boutons côte à côte pour la même
 * chose faisaient hésiter sur lequel prendre — et le second n'écrivait pas au
 * même endroit que le premier, donc le choix était piégeux.
 *
 * L'historique, lui, reste : les relances y écrivent, et l'import Excel y a
 * déposé la prospection reprise du classeur.
 */
export function InteractionsPanel({
  customerId,
  customerName,
  interactions,
  onChanged,
}: {
  customerId: string;
  customerName: string;
  interactions: Interaction[];
  onChanged: () => void;
}) {
  const canWrite = usePermission("customers:write");
  const remove = useAction((id: string) => api.deleteInteraction(id));

  return (
    <div className="flex flex-col gap-4">
      {/* Ce qui est prévu vient avant ce qui a eu lieu : on ouvre une fiche pour
          savoir ce qu'on doit faire, pas pour relire ce qu'on a fait. */}
      <CustomerAgenda customerId={customerId} customerName={customerName} />

      <Card className="gap-0 py-0">
        <div className="px-5 py-3">
          <p className="text-sm font-medium">Historique</p>
          <p className="text-muted-foreground text-xs">
            Appels, relances et rendez-vous déjà consignés.
          </p>
        </div>
        {interactions.length === 0 ? (
          <div className="border-t">
            <EmptyState
              title="Aucun échange"
              description="Les relances et les échanges consignés apparaîtront ici."
            />
          </div>
        ) : (
          <ol className="divide-y border-t">
            {interactions.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-4 px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <EnumBadge value={item.kind} entries={INTERACTION_KIND} />
                    <span className="font-medium">{item.summary}</span>
                  </p>
                  {item.details && (
                    <p className="text-muted-foreground mt-1 text-sm whitespace-pre-line">
                      {item.details}
                    </p>
                  )}
                  <p className="text-muted-foreground mt-1 text-xs">
                    {formatDateTime(item.occurred_at)}
                    {item.author_name && ` · ${item.author_name}`}
                  </p>
                </div>
                {canWrite && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Supprimer l'échange"
                    disabled={remove.pending}
                    onClick={async () => {
                      const ok = await askConfirm({
                        title: "Supprimer cet échange",
                        description: `« ${item.summary || INTERACTION_KIND[item.kind].label} » disparaît de l'historique de la fiche, définitivement.`,
                        confirmLabel: "Supprimer",
                      });
                      if (!ok) return;
                      await remove.run(item.id);
                      onChanged();
                    }}
                  >
                    <Trash2Icon />
                  </Button>
                )}
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
