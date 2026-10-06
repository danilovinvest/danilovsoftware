"use client";

import { useState } from "react";
import Link from "next/link";
import { SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { scopeParam, useScope } from "@/modules/group";
import { LIVE, useCached } from "@/shared/api/cache";
import { errorMessage } from "@/shared/api/errors";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { TableSkeleton } from "@/shared/ui/loading";
import { notifyError, notifySuccess } from "@/shared/ui/toaster";
import { formatAmount, formatDate, plural } from "@/shared/lib/format";
import { getCustomer } from "../lib/api";
import { AWAITING_LABEL, amountAtStake, groupAwaiting, type AwaitingRead } from "../lib/awaiting";
import { listAwaitingQuotes } from "../lib/awaiting-api";
import type { CustomerDetail, Project, Quote } from "../lib/types";
import { PieceRef } from "./piece-ref";
import { RelanceDialog } from "./relance-dialog";

/**
 * « Devis sans réponse » : les devis envoyés que le client n'a ni signés ni
 * refusés, rangés par ce qu'il faut en faire (`lib/awaiting.ts`).
 *
 * Mesuré le 01/10 : 112 devis STRUCTURE en attente, aucun jamais relancé. La
 * relance existait, cachée dans chaque affaire ; elle part d'ici, par la même
 * boîte, et remet le compteur du devis à zéro. Les fiches archivées sont
 * écartées par défaut — leur dernière trace date d'avant 2026 — et l'écran dit
 * combien.
 */
export function AwaitingQuotesView() {
  const issuer = scopeParam(useScope());
  const { data, error, isLoading, mutate } = useCached(
    `customers:awaiting:${issuer ?? ""}`,
    () => listAwaitingQuotes(issuer),
    LIVE,
  );
  const [withArchived, setWithArchived] = useState(false);
  const reload = () => void mutate();

  const all = data?.items ?? [];
  const archived = all.filter((quote) => quote.archived).length;
  const shown = withArchived ? all : all.filter((quote) => !quote.archived);
  const groups = groupAwaiting(shown, data?.today ?? "");
  const total = amountAtStake(groups.flatMap((group) => group.reads));

  return (
    <div className="flex flex-col gap-4">
      <header data-demo="awaiting-head" className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold">Devis sans réponse</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {shown.length === 0
              ? "Les devis envoyés que le client n'a ni signés ni refusés."
              : `${plural(shown.length, "devis envoyé", "devis envoyés")} · ${formatAmount(String(total))} en jeu`}
          </p>
        </div>
        {archived > 0 && (
          <div className="flex items-center gap-2">
            <Switch id="awaiting-archived" checked={withArchived} onCheckedChange={setWithArchived} />
            <Label htmlFor="awaiting-archived" className="text-muted-foreground text-xs font-normal">
              {plural(archived, "devis sur une fiche archivée", "devis sur des fiches archivées")}
            </Label>
          </div>
        )}
      </header>
      {error ? <ErrorNotice message="Devis illisibles." onRetry={reload} /> : null}
      {data && data.total > all.length ? (
        <p className="text-warning text-xs">
          {data.total} devis en attente : seuls les {all.length} plus anciens sont lus ici.
        </p>
      ) : null}
      {error && !data ? null : isLoading && !data ? (
        <TableSkeleton rows={5} columns={5} hue="indigo" />
      ) : groups.length === 0 ? (
        <EmptyState
          title="Aucun devis n'attend de réponse"
          description="Un devis entre ici quand il est envoyé, et en sort quand il est signé, refusé ou annulé, ou quand son affaire est mise en pause."
        />
      ) : (
        groups.map((group) => (
          <AwaitingGroup key={group.bucket} bucket={group.bucket} reads={group.reads} onChanged={reload} />
        ))
      )}
    </div>
  );
}

function AwaitingGroup({
  bucket,
  reads,
  onChanged,
}: {
  bucket: keyof typeof AWAITING_LABEL;
  reads: AwaitingRead[];
  onChanged: () => void;
}) {
  const { label, hint } = AWAITING_LABEL[bucket];
  return (
    <section className="flex flex-col gap-2" data-demo={`awaiting-${bucket}`}>
      <div>
        <h2 className="text-sm font-semibold">
          {label} <span className="text-muted-foreground font-normal tabular-nums">· {reads.length}</span>
          <span className="text-muted-foreground font-normal"> · {formatAmount(String(amountAtStake(reads)))}</span>
        </h2>
        <p className="text-muted-foreground text-xs">{hint}</p>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[720px] text-sm">
          <caption className="sr-only">{label}</caption>
          <thead className="text-muted-foreground bg-muted/40 text-xs">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Client et devis</th>
              <th className="px-3 py-2 text-right font-medium">Montant</th>
              <th className="px-3 py-2 text-left font-medium">Envoyé</th>
              <th className="px-3 py-2 text-left font-medium">Dernière relance</th>
              <th className="px-3 py-2" aria-label="Actions" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {reads.map((read) => (
              <AwaitingRow key={read.quote.quote_id} read={read} onChanged={onChanged} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AwaitingRow({ read, onChanged }: { read: AwaitingRead; onChanged: () => void }) {
  const { quote, waiting, sinceRelance } = read;
  const amount = quote.amount_ttc ?? quote.amount_ht;
  return (
    <tr className="align-top">
      <td className="px-3 py-2">
        <Link
          href={`/customers/${quote.customer_id}?affaire=${quote.project_id}&onglet=devis`}
          className="font-medium hover:underline"
        >
          {quote.customer_name}
        </Link>
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
          <PieceRef issuer={quote.issuer} reference={quote.reference} />
          <span className="truncate">{quote.label || quote.project_label}</span>
        </div>
      </td>
      <td className="px-3 py-2 text-right font-medium tabular-nums">
        {amount ? formatAmount(amount) : "—"}
        {amount && !quote.amount_ttc && <div className="text-muted-foreground text-xs font-normal">HT</div>}
      </td>
      <td className="px-3 py-2 tabular-nums">
        {quote.issued_at ? formatDate(quote.issued_at) : "—"}
        {waiting !== null && (
          <div className="text-muted-foreground text-xs">{plural(waiting, "jour")} d&apos;attente</div>
        )}
      </td>
      <td className="px-3 py-2">
        {quote.last_relance_at ? (
          <>
            <span className="tabular-nums">il y a {plural(sinceRelance ?? 0, "jour")}</span>
            <div className="text-muted-foreground text-xs">
              {[quote.last_relance_summary, quote.relances > 1 && `${quote.relances} relances`]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </>
        ) : (
          <span className="text-muted-foreground">Jamais relancé</span>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        <RelanceButton read={read} onChanged={onChanged} />
      </td>
    </tr>
  );
}

/**
 * La relance part de la boîte de toujours, qui a besoin de la fiche, de
 * l'affaire et de ses devis : la fiche se charge au clic, pas pour chaque ligne.
 */
function RelanceButton({ read, onChanged }: { read: AwaitingRead; onChanged: () => void }) {
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState<{ customer: CustomerDetail; project: Project; quotes: Quote[] } | null>(
    null,
  );

  async function open() {
    setLoading(true);
    try {
      const customer = await getCustomer(read.quote.customer_id);
      const project = customer.projects.find((p) => p.id === read.quote.project_id);
      if (!project) {
        notifyError("Cette affaire n'est plus sur la fiche.", onChanged);
        return;
      }
      // Le seul devis de la ligne : la boîte nomme celui qu'elle reçoit
      // (`leadQuote`), et une affaire peut en porter un signé à côté.
      const quotes = customer.quotes.filter((q) => q.id === read.quote.quote_id);
      setTarget({ customer, project, quotes });
    } catch (err) {
      notifyError(errorMessage(err), () => void open());
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" disabled={loading} onClick={() => void open()}>
        <SendIcon />
        Relancer
      </Button>
      {target && (
        <RelanceDialog
          customer={target.customer}
          project={target.project}
          quotes={target.quotes}
          open
          onOpenChange={(next) => {
            if (!next) setTarget(null);
          }}
          onSaved={() => {
            notifySuccess(`Relance de ${read.quote.customer_name} enregistrée.`);
            onChanged();
          }}
        />
      )}
    </>
  );
}
