"use client";

import { useState } from "react";
import { AlertTriangleIcon, FileUpIcon, ShieldCheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/modules/auth";
import { LIVE, revalidatePrefixes, useCached } from "@/shared/api/cache";
import { askConfirm } from "@/shared/ui/confirm";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { TableSkeleton } from "@/shared/ui/loading";
import { formatAmount, formatDate, plural } from "@/shared/lib/format";
import { cn } from "@/lib/utils";
import { useAction } from "../hooks/use-customers";
import {
  bankOverview,
  coverageAlerts,
  listBankLines,
  reconcileSure,
  sureCount,
  type BankAccountState,
  type BankLineStatus,
} from "../lib/bank";
import { BankImportDialog } from "./bank-import-dialog";
import { BankLineRow } from "./bank-line-row";

const STATUSES: { value: BankLineStatus; label: string }[] = [
  { value: "a_rapprocher", label: "À rapprocher" },
  { value: "rapproche", label: "Rapprochées" },
  { value: "ignore", label: "Écartées" },
];

/**
 * Le rapprochement bancaire (migration 114) : où en est chaque compte, puis
 * les crédits de ses relevés, un état à la fois.
 *
 * Un compte se choisit en cliquant sa carte — la carte **est** le filtre, et
 * c'est elle qui dit ce qui manque : un relevé jamais importé, un trou entre
 * deux relevés, rien depuis trop longtemps.
 */
export function BankReconciliation() {
  const canWrite = usePermission("quotes:write");
  const [account, setAccount] = useState<string | null>(null);
  const [status, setStatus] = useState<BankLineStatus>("a_rapprocher");
  const [importing, setImporting] = useState(false);
  const overview = useCached("bank:overview", () => bankOverview(), LIVE);
  const lines = useCached(
    `bank:lines:${status}:${account ?? "tous"}`,
    () => listBankLines(status, account),
    LIVE,
  );
  const bulk = useAction(reconcileSure, {
    success: (result) =>
      `${plural(result.reconciled, "ligne rapprochée", "lignes rapprochées")}.`,
  });

  // Un rapprochement inscrit un encaissement : les fiches, « À affecter » et
  // le recouvrement qu'on a déjà lus sont périmés.
  const reload = () =>
    revalidatePrefixes("bank:", "receipts:", "customers:", "billing:recovery");
  const rows = lines.data ?? [];
  const sure = status === "a_rapprocher" ? sureCount(rows) : 0;

  async function validateSure() {
    const ok = await askConfirm({
      title: `Valider ${plural(sure, "proposition sûre", "propositions sûres")}`,
      description:
        (rows.length >= 300
          ? "Toutes les propositions sûres du compte sont prises, au-delà des lignes affichées. "
          : "") +
        "Chaque ligne pointe le virement déjà saisi du même montant, ou inscrit l'encaissement sur la facture que son libellé cite, quand le montant est exactement ce qui reste dû.",
      confirmLabel: "Valider",
    });
    if (ok && (await bulk.run(account)) !== null) reload();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canWrite && sure > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => void validateSure()}
            disabled={bulk.pending}
            data-demo="bank-sure"
          >
            <ShieldCheckIcon />
            Valider les {sure} sûre{sure > 1 ? "s" : ""}
          </Button>
        )}
        {canWrite && (
          <Button
            size="sm"
            onClick={() => setImporting(true)}
            data-demo="bank-import"
          >
            <FileUpIcon />
            Importer un relevé
          </Button>
        )}
      </div>

      {overview.error ? (
        <ErrorNotice message="Comptes illisibles." onRetry={reload} />
      ) : null}
      <div
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        data-demo="bank-accounts"
      >
        {(overview.data ?? []).map((state) => (
          <AccountCard
            key={state.account.id}
            state={state}
            selected={account === state.account.id}
            onSelect={() =>
              setAccount(account === state.account.id ? null : state.account.id)
            }
          />
        ))}
      </div>

      <div
        className="flex gap-1 overflow-x-auto"
        role="group"
        aria-label="État des lignes"
      >
        {STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            aria-pressed={status === s.value}
            onClick={() => setStatus(s.value)}
            className={cn(
              "rounded-md px-2.5 py-1 text-sm whitespace-nowrap",
              status === s.value
                ? "bg-muted font-medium"
                : "text-muted-foreground hover:bg-muted/60",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {lines.error ? (
        <ErrorNotice message="Lignes de relevé illisibles." onRetry={reload} />
      ) : null}
      <div data-demo="bank-lines">
        {lines.isLoading && !lines.data ? (
          <TableSkeleton rows={5} columns={4} hue="jade" />
        ) : rows.length > 0 ? (
          <ul className="divide-y rounded-xl border">
            {rows.map((line) => (
              <BankLineRow
                key={`${line.id}:${line.status}`}
                line={line}
                canWrite={canWrite}
                onChanged={reload}
              />
            ))}
          </ul>
        ) : lines.error ? null : (
          <EmptyState
            title={
              status === "a_rapprocher" ? "Rien à rapprocher" : "Aucune ligne"
            }
            description={
              status === "a_rapprocher"
                ? "Chaque crédit des relevés importés a son virement, ou a été écarté."
                : "Les lignes tranchées paraissent ici, et s'y rouvrent."
            }
          />
        )}
      </div>
      {rows.length >= 300 && (
        <p className="text-muted-foreground text-xs">
          Les trois cents lignes les plus récentes. Choisir un compte resserre
          la liste.
        </p>
      )}
      {importing && (
        <BankImportDialog
          accountId={account}
          onClose={() => setImporting(false)}
          onDone={reload}
        />
      )}
    </div>
  );
}

function AccountCard({
  state,
  selected,
  onSelect,
}: {
  state: BankAccountState;
  selected: boolean;
  onSelect: () => void;
}) {
  const alerts = coverageAlerts(state.coverage);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex flex-col gap-1 rounded-xl border p-3 text-left text-sm transition-colors",
        selected ? "border-foreground bg-muted/60" : "hover:bg-muted/40",
      )}
    >
      <span className="font-semibold">{state.account.label}</span>
      <span className="text-muted-foreground text-xs">
        {state.coverage.covered_until
          ? `Relevés jusqu'au ${formatDate(state.coverage.covered_until)}`
          : "Compte jamais rapproché"}
      </span>
      {state.coverage.covered_until && (
        <span
          className={cn(
            "tabular-nums",
            state.to_reconcile > 0 && "font-medium",
          )}
        >
          {state.to_reconcile > 0
            ? `${plural(state.to_reconcile, "crédit")} à rapprocher · ${formatAmount(state.to_reconcile_total)}`
            : "Tout est rapproché"}
        </span>
      )}
      {alerts.map((alert) => (
        <span
          key={alert.text}
          className={cn(
            "flex items-start gap-1 text-xs",
            alert.tone === "danger" ? "text-danger" : "text-warning",
          )}
          data-demo="bank-missing"
        >
          <AlertTriangleIcon className="mt-0.5 size-3 shrink-0" />
          {alert.text}
        </span>
      ))}
    </button>
  );
}
