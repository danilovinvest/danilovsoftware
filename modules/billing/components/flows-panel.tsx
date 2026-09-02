import { ArrowRightIcon, RepeatIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { euros, plural } from "@/shared/lib/format";
import { EmptyState } from "@/shared/ui/feedback";
import { Panel, TONE_SOFT } from "@/shared/ui/panel";
import { entityName } from "@/modules/group";
import { FLOW_KIND } from "../lib/labels";
import type { IntraFlow } from "../lib/types";

/**
 * Ce que les sociétés du groupe se facturent entre elles.
 *
 * Rien n'est saisi ici : le panneau est déduit des factures dont le client se
 * trouve être une autre entité. Un flux interne est une facture comme une
 * autre — elle porte une TVA, une échéance et un risque d'impayé — et la
 * traiter à part créerait deux vérités sur le même document.
 */
export function FlowsPanel({ flows }: { flows: IntraFlow[] }) {
  const total = flows.reduce((sum, flow) => sum + flow.amount_ht, 0);

  return (
    <Panel
      title="Flux internes au groupe"
      description={
        flows.length === 0
          ? "Aucun flux sur la période"
          : `${euros(total)} HT refacturés entre sociétés`
      }
      icon={RepeatIcon}
      tone="info"
      bodyClassName="divide-y"
    >
      {flows.length === 0 ? (
        <EmptyState title="Aucune facture entre sociétés sur la période" />
      ) : (
        flows.map((flow) => {
          const kind = FLOW_KIND[flow.kind];
          return (
            <div key={flow.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="font-medium">{entityName(flow.from_entity_id)}</span>
                  <ArrowRightIcon className="text-muted-foreground size-3" />
                  <span className="font-medium">{entityName(flow.to_entity_id)}</span>
                </p>
                <p className="mt-0.5 flex items-center gap-1.5">
                  <span
                    className={cn(
                      "rounded-[4px] px-1.5 py-0.5 text-[11px]",
                      TONE_SOFT[kind.tone],
                    )}
                  >
                    {kind.label}
                  </span>
                  <span className="text-muted-foreground text-[11px]">
                    {plural(flow.invoices, "facture")}
                  </span>
                </p>
              </div>
              <span className="shrink-0 text-xs font-medium tabular-nums">
                {euros(flow.amount_ht)}
              </span>
            </div>
          );
        })
      )}
      <p className="text-muted-foreground/80 px-4 py-2.5 text-[11px]">
        Loyers et honoraires de direction sont une <strong>hypothèse de
        démonstration</strong> : la répartition du capital et les conventions
        entre les sociétés ne figurent dans aucun registre public.
      </p>
    </Panel>
  );
}
