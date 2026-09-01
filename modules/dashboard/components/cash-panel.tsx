import { ReceiptEuroIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/shared/ui/feedback";
import type { CashRow } from "../lib/types";
import { euros, eurosShort, sinceDays } from "@/shared/lib/format";
import { Panel, TONE_SOFT } from "@/shared/ui/panel";
import { WAITING } from "../lib/labels";

/**
 * Ce que l'argent attend : une réponse, un acompte, un solde.
 *
 * Les trois sont distincts parce que l'action l'est aussi — on relance un
 * client pour une réponse, on relance une comptabilité pour un règlement.
 */
export function CashPanel({ rows }: { rows: CashRow[] }) {
  const totals = {
    reponse: rows.filter((r) => r.waiting_for === "reponse"),
    acompte: rows.filter((r) => r.waiting_for === "acompte"),
    solde: rows.filter((r) => r.waiting_for === "solde"),
  };
  const sum = (list: CashRow[]) => list.reduce((total, row) => total + row.amount, 0);

  return (
    <Panel
      title="En attente"
      description={`${euros(sum(rows))} bloqués sur ${rows.length} devis`}
      icon={ReceiptEuroIcon}
      tone="warning"
    >
      <div className="grid grid-cols-3 divide-x border-b">
        {(["reponse", "acompte", "solde"] as const).map((key) => (
          <div key={key} className="px-3 py-2.5">
            <p className="text-muted-foreground truncate text-[11px]">
              {WAITING[key].label}
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums">
              {eurosShort(sum(totals[key]))}
            </p>
            <p className="text-muted-foreground/70 text-[11px]">
              {totals[key].length} devis
            </p>
          </div>
        ))}
      </div>

      <div className="divide-y">
        {rows.length === 0 ? (
          <EmptyState title="Rien en attente" />
        ) : (
          rows.slice(0, 6).map((row) => (
            <div key={row.quote_id} className="flex items-center gap-2 px-4 py-2">
              <span
                className={cn(
                  "rounded-[4px] px-1.5 py-0.5 text-[11px]",
                  TONE_SOFT[WAITING[row.waiting_for].tone],
                )}
              >
                {WAITING[row.waiting_for].label}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{row.customer_name}</p>
                <p className="text-muted-foreground truncate text-[11px]">
                  {row.reference} · {row.label}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-medium tabular-nums">
                  {eurosShort(row.amount)}
                </p>
                <p className="text-muted-foreground text-[11px]">
                  depuis {sinceDays(row.days_since)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}
