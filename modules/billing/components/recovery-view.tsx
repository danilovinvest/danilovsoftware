"use client";

import { scopeParam, useScope } from "@/modules/group";
import { RecoveryList, listRecovery } from "@/modules/customers";
import { LIVE, useCached } from "@/shared/api/cache";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { TableSkeleton } from "@/shared/ui/loading";
import { formatAmount, plural } from "@/shared/lib/format";

/**
 * « Recouvrement » : les factures dues de toutes les fiches, et où en est la
 * relance de chacune (migration 109).
 *
 * Réelle, comme « À affecter » : elle lit la base. Le reste dû est recalculé
 * par le serveur à chaque lecture — avoirs et virements compris — et c'est ce
 * montant-là qu'on transmet à un huissier, jamais celui d'une lettre ancienne.
 * Le périmètre de la société s'applique côté serveur.
 */
export function RecoveryView() {
  const issuer = scopeParam(useScope());
  const { data, error, isLoading, mutate } = useCached(
    `billing:recovery:${issuer ?? ""}`,
    () => listRecovery(issuer),
    LIVE,
  );
  const items = data ?? [];
  const total = items.reduce((sum, item) => sum + Number(item.remaining), 0);
  const stale = items.filter((item) => item.stale).length;
  const reload = () => void mutate();

  return (
    <div className="flex flex-col gap-4">
      <header data-demo="recovery-head">
        <h1 className="text-base font-semibold">Recouvrement</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {items.length === 0
            ? "Les factures dues et leurs relances se suivent ici."
            : `${plural(items.length, "facture due", "factures dues")} · ${formatAmount(String(total))}` +
              (stale > 0 ? ` · ${plural(stale, "montant réclamé périmé", "montants réclamés périmés")}` : "")}
        </p>
      </header>
      {error ? <ErrorNotice message="Recouvrement illisible." onRetry={reload} /> : null}
      {isLoading && !data ? (
        <TableSkeleton rows={4} columns={6} hue="jade" />
      ) : items.length === 0 ? (
        <EmptyState
          title="Rien à recouvrer"
          description="Une facture entre ici tant qu'il lui reste un montant dû, et en sort quand elle est soldée."
        />
      ) : (
        <RecoveryList items={items} onChanged={reload} demo="recovery-list" />
      )}
    </div>
  );
}
