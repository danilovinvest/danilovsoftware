"use client";

import { useState } from "react";
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

const NO_INTERACTIONS: Interaction[] = [];

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
 *
 * La fiche n'en sert que la première page ; « Charger plus » lit les suivantes
 * par la route paginée, et `total` est le vrai compte, pas la longueur de ce qui
 * est affiché.
 */
export function InteractionsPanel({
  customerId,
  customerName,
  interactions,
  total,
  onChanged,
}: {
  customerId: string;
  customerName: string;
  /** La première page, servie avec la fiche. */
  interactions: Interaction[];
  /** Le nombre d'échanges de la fiche, toutes pages confondues. */
  total: number;
  onChanged: () => void;
}) {
  const canWrite = usePermission("customers:write");
  const remove = useAction((id: string) => api.deleteInteraction(id));
  const loadMore = useAction((page: number) => api.listInteractions(customerId, page));
  /*
    Les pages suivantes, avec le total sous lequel elles ont été lues. Un total
    qui a **grandi** depuis veut dire qu'un échange est apparu, et il peut
    s'intercaler n'importe où dans l'historique : ces pages ne se recollent
    plus, on repart de la première. Une suppression, elle, ne décale que vers le
    haut — le doublon qui en résulte est écarté par identifiant.
  */
  const [more, setMore] = useState<{ total: number; items: Interaction[] }>({
    total,
    items: [],
  });
  const extra = total <= more.total ? more.items : NO_INTERACTIONS;
  const seen = new Set(interactions.map((item) => item.id));
  const shown = [...interactions, ...extra.filter((item) => !seen.has(item.id))];
  const remaining = Math.max(0, total - shown.length);

  async function showMore() {
    // La page qui contient la première ligne manquante. Après une suppression,
    // elle chevauche ce qui est déjà affiché : jamais de trou, un doublon au
    // plus, écarté ci-dessus.
    const page = Math.floor(shown.length / api.INTERACTIONS_PAGE_SIZE) + 1;
    const result = await loadMore.run(page);
    if (!result) return;
    const known = new Set(shown.map((item) => item.id));
    setMore({
      total: result.total,
      items: [...extra, ...result.items.filter((item) => !known.has(item.id))],
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Ce qui est prévu vient avant ce qui a eu lieu : on ouvre une fiche pour
          savoir ce qu'on doit faire, pas pour relire ce qu'on a fait. */}
      <CustomerAgenda customerId={customerId} customerName={customerName} />

      <Card className="gap-0 py-0" data-demo="historique-echanges">
        <div className="px-5 py-3">
          <p className="text-sm font-medium">
            Historique
            {total > 0 && <span className="text-muted-foreground ml-1.5">{total}</span>}
          </p>
          <p className="text-muted-foreground text-xs">
            Appels, relances et rendez-vous déjà consignés.
          </p>
        </div>
        {shown.length === 0 ? (
          <div className="border-t">
            <EmptyState
              title="Aucun échange"
              description="Les relances et les échanges consignés apparaîtront ici."
            />
          </div>
        ) : (
          <ol className="divide-y border-t">
            {shown.map((item) => (
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
                      if ((await remove.run(item.id)) === null) return;
                      setMore((current) => ({
                        ...current,
                        items: current.items.filter((entry) => entry.id !== item.id),
                      }));
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
        {remaining > 0 && (
          <div className="flex items-center justify-between gap-3 border-t px-5 py-3">
            <p className="text-muted-foreground text-xs">
              {shown.length} sur {total} échanges affichés
            </p>
            <Button
              size="sm"
              variant="outline"
              disabled={loadMore.pending}
              onClick={showMore}
            >
              {loadMore.pending ? "Chargement…" : "Charger plus"}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
