import { ChartColumnIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { euros, eurosShort, plural } from "@/shared/lib/format";
import { Panel, TONE_FILL } from "@/shared/ui/panel";
import { ENTITY_ROLE } from "../lib/labels";
import type { EntityRevenue } from "../lib/types";

/**
 * Chiffre d'affaires par société, avec la part interne détachée.
 *
 * La barre est en deux segments parce que les deux montants ne se valent pas :
 * ce qu'une société facture à une autre du groupe n'est pas du chiffre
 * d'affaires pour le groupe, seulement pour elle. Les confondre gonfle le
 * total d'un argent qui n'est jamais entré.
 */
export function RevenuePanel({
  rows,
  totalBilled,
  consolidated,
}: {
  rows: EntityRevenue[];
  totalBilled: number;
  consolidated: number;
}) {
  const max = Math.max(...rows.map((row) => row.billed), 1);
  const intra = totalBilled - consolidated;

  return (
    <Panel
      title="Chiffre d'affaires par société"
      description="Facturé sur la période, part interne isolée"
      icon={ChartColumnIcon}
      tone="success"
      bodyClassName="flex flex-col"
    >
      <div className="flex flex-col gap-3 p-4">
        {rows.map((row) => {
          const role = ENTITY_ROLE[row.entity.role];
          const external = row.billed - row.intra;
          return (
            <div key={row.entity.id} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
              <span className="truncate text-xs">
                {row.entity.name}
                <span className="text-muted-foreground ml-1.5 text-[11px]">
                  {role.label}
                </span>
              </span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {plural(row.invoices, "facture")} · {eurosShort(row.billed)}
              </span>

              <div className="bg-muted col-span-2 flex h-1.5 overflow-hidden rounded-full">
                <div
                  className={cn("h-full", TONE_FILL.success)}
                  style={{ width: `${(external / max) * 100}%` }}
                  title={`${euros(external)} facturés hors groupe`}
                />
                <div
                  className={cn("h-full opacity-40", TONE_FILL.info)}
                  style={{ width: `${(row.intra / max) * 100}%` }}
                  title={`${euros(row.intra)} facturés à une autre société du groupe`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/*
        Les deux totaux côte à côte, parce que c'est leur écart qui apprend
        quelque chose : c'est exactement ce qu'un expert-comptable élimine en
        établissant les comptes du groupe.
      */}
      <div className="grid grid-cols-2 divide-x border-t">
        <div className="px-4 py-3">
          <p className="text-muted-foreground text-[11px]">Cumul des cinq sociétés</p>
          <p className="mt-0.5 text-sm font-semibold tabular-nums">
            {euros(totalBilled)}
          </p>
        </div>
        <div className="px-4 py-3">
          <p className="text-muted-foreground text-[11px]">
            Consolidé, flux internes éliminés
          </p>
          <p className="text-success mt-0.5 text-sm font-semibold tabular-nums">
            {euros(consolidated)}
          </p>
          <p className="text-muted-foreground/80 text-[11px]">
            − {euros(intra)} facturés entre sociétés
          </p>
        </div>
      </div>
    </Panel>
  );
}
