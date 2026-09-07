"use client";

import { useState } from "react";
import { LayoutDashboardIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { CUSTOMER_KIND, EnumBadge, PROJECT_STAGE } from "@/modules/customers";
import { GradientAvatar } from "@/shared/ui/gradient-avatar";
import { EmptyState } from "@/shared/ui/feedback";
import { euros, eurosShort, initials, plural, sinceDays } from "@/shared/lib/format";
import { Panel, TONE_SOFT } from "@/shared/ui/panel";
import { HEALTH } from "../lib/labels";
import type { DigestRow, Health } from "../lib/types";

/**
 * Une ligne par fiche : où elle en est, ce qu'elle pèse, ce qu'elle attend.
 *
 * C'est la vue que la liste des fiches ne peut pas donner — elle liste, elle
 * ne hiérarchise pas. Ici l'ordre est celui de l'attention : ce qui est chaud
 * d'abord, ce qui presse ensuite, le reste après.
 */

const FILTERS: Array<{ value: Health | "tous"; label: string }> = [
  { value: "tous", label: "Toutes" },
  { value: "chaud", label: "Chaudes" },
  { value: "a_relancer", label: "À relancer" },
  { value: "dormant", label: "Dormantes" },
  { value: "gagne", label: "Signées" },
];

/** Au-delà, la table cesse d'être une synthèse et redevient une liste. */
const PREVIEW = 25;

export function DigestTable({ rows }: { rows: DigestRow[] }) {
  const [filter, setFilter] = useState<Health | "tous">("tous");
  const [expanded, setExpanded] = useState(false);

  const matching = filter === "tous" ? rows : rows.filter((row) => row.health === filter);
  const visible = expanded ? matching : matching.slice(0, PREVIEW);
  const pending = matching.reduce((total, row) => total + row.amount_pending, 0);

  return (
    <Panel
      title="Synthèse par fiche"
      description={`${matching.length} fiches · ${euros(pending)} de devis en attente`}
      icon={LayoutDashboardIcon}
      tone="neutral"
      action={
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((entry) => {
            const count =
              entry.value === "tous"
                ? rows.length
                : rows.filter((row) => row.health === entry.value).length;
            if (count === 0 && entry.value !== "tous") return null;
            return (
              <button
                key={entry.value}
                type="button"
                onClick={() => {
                  setFilter(entry.value);
                  setExpanded(false);
                }}
                className={cn(
                  "rounded-md px-2 py-1 text-xs transition-colors",
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
        <>
          <div className="overflow-x-auto">
            <Table className="min-w-[62rem] [&_thead_th]:text-muted-foreground [&_thead_th]:h-8 [&_thead_th]:text-xs [&_thead_th]:font-medium">
              <TableHeader>
                <TableRow>
                  <TableHead>Fiche</TableHead>
                  <TableHead>Santé</TableHead>
                  <TableHead>Étape</TableHead>
                  <TableHead className="text-right">En attente</TableHead>
                  <TableHead className="text-right">Signé</TableHead>
                  <TableHead className="text-right">Dernier devis</TableHead>
                  <TableHead>Devis en tête</TableHead>
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
                            <p
                              className={cn(
                                "truncate text-sm font-medium",
                                !row.named && "text-muted-foreground italic",
                              )}
                            >
                              {row.name}
                            </p>
                            <p className="text-muted-foreground truncate text-[11px]">
                              {CUSTOMER_KIND[row.kind].label} ·{" "}
                              {plural(row.quotes, "devis", "devis")}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span
                          title={health.hint}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs whitespace-nowrap",
                            TONE_SOFT[health.tone],
                          )}
                        >
                          <span className="size-1.5 rounded-full bg-current" />
                          {health.label}
                        </span>
                      </TableCell>

                      <TableCell>
                        <EnumBadge value={row.stage} entries={PROJECT_STAGE} />
                      </TableCell>

                      <TableCell className="text-right text-xs tabular-nums">
                        {row.amount_pending > 0 ? (
                          <>
                            <span className="font-medium">
                              {eurosShort(row.amount_pending)}
                            </span>
                            <span className="text-muted-foreground block text-[11px]">
                              {plural(row.pending_quotes, "devis", "devis")}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell className="text-right text-xs tabular-nums">
                        {row.amount_signed > 0 ? (
                          <span className="text-success font-medium">
                            {eurosShort(row.amount_signed)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell
                        className={cn(
                          "text-right text-xs tabular-nums",
                          row.health === "a_relancer" && "text-danger font-medium",
                          row.health === "dormant" && "text-muted-foreground",
                        )}
                      >
                        {sinceDays(row.days_since)}
                      </TableCell>

                      <TableCell className="max-w-80">
                        <p className="truncate text-xs">{row.focus}</p>
                        <p className="text-muted-foreground font-mono text-[11px]">
                          {row.focus_reference}
                        </p>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {matching.length > PREVIEW && (
            <div className="border-t px-4 py-2.5 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded((value) => !value)}
              >
                {expanded
                  ? "Réduire"
                  : `Afficher les ${matching.length - PREVIEW} autres fiches`}
              </Button>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}
