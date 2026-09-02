"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { activityName } from "@/modules/group";
import { eurosShort, formatDate } from "@/shared/lib/format";
import { TONE_SOFT, TONE_TEXT } from "@/shared/ui/panel";
import { WORKSITE_STATUS, marginTone } from "../lib/labels";
import type { Worksite } from "../lib/types";

/** La même matière que le tableau, dense et triable à l'œil. */
export function WorksiteList({
  worksites,
  onSelect,
}: {
  worksites: Worksite[];
  onSelect: (worksite: Worksite) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[64rem] [&_thead_th]:text-muted-foreground [&_thead_th]:h-8 [&_thead_th]:text-xs [&_thead_th]:font-medium">
        <TableHeader>
          <TableRow>
            <TableHead>Chantier</TableHead>
            <TableHead>État</TableHead>
            <TableHead>Métier</TableHead>
            <TableHead className="text-right">Devisé HT</TableHead>
            <TableHead className="text-right">Marge</TableHead>
            <TableHead className="text-right">Période</TableHead>
            <TableHead>Reste à faire</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {worksites.map((worksite) => {
            const status = WORKSITE_STATUS[worksite.status];
            const missing: string[] = [];
            if (worksite.completed_at !== null && worksite.pv_signed_at === null)
              missing.push("PV à signer");
            if (worksite.balance !== null && worksite.balance.invoiced_at === null)
              missing.push("solde à facturer");
            else if (worksite.balance !== null && worksite.balance.paid_at === null)
              missing.push("solde à encaisser");
            if (worksite.status === "cloture" && worksite.review_requested_at === null)
              missing.push("avis à demander");

            return (
              <TableRow
                key={worksite.id}
                className="cursor-pointer"
                onClick={() => onSelect(worksite)}
              >
                <TableCell className="max-w-72">
                  <p className="truncate text-sm font-medium">
                    {worksite.customer_name}
                    {worksite.internal && (
                      <span className="text-info ml-1.5 text-[11px] font-normal">
                        interne
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground truncate text-[11px]">
                    {worksite.reference} · {worksite.label}
                  </p>
                </TableCell>

                <TableCell>
                  <span
                    className={cn(
                      "rounded-[4px] px-1.5 py-0.5 text-xs whitespace-nowrap",
                      TONE_SOFT[status.tone],
                    )}
                  >
                    {status.label}
                  </span>
                  {worksite.days_late > 0 && (
                    <span className="text-danger block text-[11px]">
                      {worksite.days_late} j de retard
                    </span>
                  )}
                </TableCell>

                <TableCell className="text-muted-foreground text-xs">
                  {activityName(worksite.activity_id)}
                </TableCell>

                <TableCell className="text-right text-xs tabular-nums">
                  {eurosShort(worksite.amount_ht)}
                </TableCell>

                <TableCell className="text-right text-xs tabular-nums">
                  {worksite.cost_total > 0 ? (
                    <>
                      <span
                        className={cn(
                          "font-medium",
                          TONE_TEXT[marginTone(worksite.margin_rate)],
                        )}
                      >
                        {worksite.margin_rate} %
                      </span>
                      <span className="text-muted-foreground block text-[11px]">
                        {eurosShort(worksite.margin)}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                <TableCell className="text-muted-foreground text-right text-[11px] tabular-nums">
                  {worksite.starts_at === null ? (
                    "non planifié"
                  ) : (
                    <>
                      {formatDate(worksite.starts_at)}
                      <span className="block">→ {formatDate(worksite.ends_at)}</span>
                    </>
                  )}
                </TableCell>

                <TableCell className="text-xs">
                  {missing.length === 0 ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <span className="text-warning">{missing.join(" · ")}</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
