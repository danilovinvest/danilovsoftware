import { PercentIcon } from "lucide-react";
import { euros, formatDate } from "@/shared/lib/format";
import { Panel } from "@/shared/ui/panel";
import { entityName } from "../lib/entities";
import type { VatRow } from "../lib/types";

/**
 * TVA collectée, société par société.
 *
 * Une seule colonne, et c'est volontaire : **le CRM ne connaît que ce qu'il
 * facture**. La TVA déductible vient des achats, qui vivent en comptabilité ;
 * afficher un « à décaisser » ici reviendrait à inventer la moitié du calcul
 * et à laisser croire que la déclaration peut se préparer depuis cet écran.
 */
export function VatPanel({ rows }: { rows: VatRow[] }) {
  const total = rows.reduce((sum, row) => sum + row.collected, 0);

  return (
    <Panel
      title="TVA collectée"
      description={`${euros(total)} sur la période de déclaration en cours`}
      icon={PercentIcon}
      tone="warning"
      bodyClassName="divide-y"
    >
      {rows.map((row) => (
        <div key={row.entity_id} className="flex items-center gap-3 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{entityName(row.entity_id)}</p>
            <p className="text-muted-foreground text-[11px]">
              {row.period_label} · régime {row.regime} · dépôt au{" "}
              {formatDate(row.next_declaration)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs font-medium tabular-nums">{euros(row.collected)}</p>
            <p className="text-muted-foreground text-[11px] tabular-nums">
              sur {euros(row.base)} HT
            </p>
          </div>
        </div>
      ))}
      <p className="text-muted-foreground/80 px-4 py-2.5 text-[11px]">
        La TVA déductible provient des achats et n&apos;est pas suivie ici : ce
        montant est une base de contrôle, pas une d&eacute;claration.
      </p>
    </Panel>
  );
}
