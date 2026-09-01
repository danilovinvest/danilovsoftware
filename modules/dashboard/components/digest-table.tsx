"use client";

import { useState } from "react";
import { LayoutDashboardIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  CUSTOMER_KIND,
  CUSTOMER_STATUS,
  EnumBadge,
  PROJECT_STAGE,
} from "@/modules/customers";
import { GradientAvatar } from "@/shared/ui/gradient-avatar";
import { euros, eurosShort, initials, sinceDays } from "@/shared/lib/format";
import { EmptyState } from "@/shared/ui/feedback";
import type { DigestRow, Health } from "../lib/types";
import { Panel, TONE_SOFT } from "@/shared/ui/panel";
import { HEALTH } from "../lib/labels";

/**
 * Une ligne par fiche : où elle en est, ce qu'elle pèse, ce qu'elle attend.
 *
 * C'est la vue que le tableau des fiches ne peut pas donner — il liste, il ne
 * hiérarchise pas. Ici l'ordre est celui de l'attention : ce qui presse
 * d'abord, ce qui chauffe ensuite, le reste après.
 */

const FILTERS: Array<{ value: Health | "tous"; label: string }> = [
  { value: "tous", label: "Toutes" },
  { value: "a_relancer", label: "À relancer" },
  { value: "chaud", label: "Chaudes" },
  { value: "en_cours", label: "En cours" },
  { value: "gagne", label: "Signées" },
  { value: "dormant", label: "Dormantes" },
];

export function DigestTable({ rows }: { rows: DigestRow[] }) {
  const [filter, setFilter] = useState<Health | "tous">("tous");

  const visible = filter === "tous" ? rows : rows.filter((row) => row.health === filter);
  const openAmount = visible.reduce((total, row) => total + row.amount_open, 0);

  return (
    <Panel
      title="Synthèse par fiche"
      description={`${visible.length} fiches · ${euros(openAmount)} d'affaires ouvertes`}
      icon={LayoutDashboardIcon}
      tone="neutral"
      action={
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((entry) => {
            const count =
              entry.value === "tous"
                ? rows.length
                : rows.filter((row) => row.health === entry.value).length;
            return (
              <button
                key={entry.value}
                type="button"
                onClick={() => setFilter(entry.value)}
                className={cn(
                  "rounded-[4px] px-2 py-1 text-xs transition-colors",
                  filter === entry.value
                    ? "bg-selected text-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                {entry.label}
                <span className="ml-1 tabular-nums opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      }
    >
      {visible.length === 0 ? (
        <EmptyState title="Aucune fiche dans cette catégorie" />
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[64rem] [&_thead_th]:text-muted-foreground [&_thead_th]:h-8 [&_thead_th]:text-xs [&_thead_th]:font-medium">
            <TableHeader>
              <TableRow>
                <TableHead>Fiche</TableHead>
                <TableHead>Santé</TableHead>
                <TableHead>Étape à traiter</TableHead>
                <TableHead className="text-right">En jeu</TableHead>
                <TableHead className="text-right">Signé</TableHead>
                <TableHead className="text-right">Dernier contact</TableHead>
                <TableHead>Prochaine action</TableHead>
                <TableHead>Responsable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row) => {
                const health = HEALTH[row.health];
                return (
                  <TableRow key={row.customer_id}>
                    <TableCell className="max-w-64">
                      <div className="flex items-center gap-2">
                        <GradientAvatar
                          seed={row.name}
                          text={initials(row.name)}
                          size={22}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{row.name}</p>
                          <p className="text-muted-foreground truncate text-[11px]">
                            {CUSTOMER_KIND[row.kind].label} · {row.city} ·{" "}
                            {CUSTOMER_STATUS[row.status].label}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-[4px] px-1.5 py-0.5 text-xs",
                          TONE_SOFT[health.tone],
                        )}
                      >
                        <span className="size-1.5 rounded-full bg-current" />
                        {health.label}
                      </span>
                    </TableCell>

                    <TableCell>
                      {row.stage ? (
                        <EnumBadge value={row.stage} entries={PROJECT_STAGE} />
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          Aucune affaire ouverte
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-right text-xs tabular-nums">
                      {row.open_projects > 0 ? (
                        <>
                          <span className="font-medium">
                            {eurosShort(row.amount_open)}
                          </span>
                          <span className="text-muted-foreground block text-[11px]">
                            {row.open_projects} affaire
                            {row.open_projects > 1 ? "s" : ""}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right text-xs tabular-nums">
                      {row.amount_won > 0 ? (
                        <span className="text-success font-medium">
                          {eurosShort(row.amount_won)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell
                      className={cn(
                        "text-right text-xs tabular-nums",
                        (row.days_since ?? 0) > 45 && "text-muted-foreground",
                        row.health === "a_relancer" && "text-danger font-medium",
                      )}
                    >
                      {sinceDays(row.days_since)}
                    </TableCell>

                    <TableCell className="text-xs">{row.next_action}</TableCell>

                    <TableCell className="text-muted-foreground text-xs">
                      {row.owner_name}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Panel>
  );
}
