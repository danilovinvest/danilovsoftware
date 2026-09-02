"use client";

import { CheckIcon } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { EnumBadge } from "@/modules/customers";
import { activityName, entityOfActivity } from "@/modules/group";
import { euros, eurosShort, formatDate } from "@/shared/lib/format";
import { TONE_SOFT, TONE_TEXT } from "@/shared/ui/panel";
import {
  BLOCKED_REASON,
  COST_KIND,
  STUDY_STATUS,
  WORKSITE_STATUS,
  marginTone,
} from "../lib/labels";
import type { Payment, Worksite } from "../lib/types";

/**
 * La fiche d'un chantier.
 *
 * Elle s'ouvre sur la frise des jalons, parce que c'est la question qu'on se
 * pose en cliquant : où en est-on, et qu'est-ce qui manque. L'économie vient
 * ensuite — c'est la partie que le CRM ne savait pas dire jusqu'ici.
 */
export function WorksiteSheet({
  worksite,
  onClose,
}: {
  worksite: Worksite | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={worksite !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        {worksite && <Body worksite={worksite} />}
      </SheetContent>
    </Sheet>
  );
}

function Body({ worksite }: { worksite: Worksite }) {
  const entity = entityOfActivity(worksite.activity_id);
  const status = WORKSITE_STATUS[worksite.status];

  const milestones = [
    { label: "Signé", at: worksite.signed_at },
    { label: "Démarré", at: worksite.starts_at },
    { label: "Terminé", at: worksite.completed_at },
    { label: "PV signé", at: worksite.pv_signed_at },
    { label: "Solde encaissé", at: worksite.balance?.paid_at ?? null },
    { label: "Avis reçu", at: worksite.review_received_at },
  ];

  return (
    <>
      <SheetHeader className="gap-1">
        <SheetTitle className="text-base">{worksite.customer_name}</SheetTitle>
        <SheetDescription>
          {worksite.label} · {worksite.city}
        </SheetDescription>
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span
            className={cn(
              "rounded-[4px] px-1.5 py-0.5 text-[11px]",
              TONE_SOFT[status.tone],
            )}
          >
            {status.label}
          </span>
          {worksite.blocked_reason && (
            <span className="bg-warning-soft text-warning rounded-[4px] px-1.5 py-0.5 text-[11px]">
              {BLOCKED_REASON[worksite.blocked_reason].label}
            </span>
          )}
          {worksite.study_status && (
            <EnumBadge value={worksite.study_status} entries={STUDY_STATUS} />
          )}
          <span className="text-muted-foreground text-[11px]">
            {worksite.reference} · {activityName(worksite.activity_id)}
            {entity && ` · ${entity.name}`}
          </span>
        </div>
      </SheetHeader>

      <div className="flex flex-col gap-5 px-4 pb-6">
        {/* ---- Frise des jalons ------------------------------------------- */}
        <section>
          <h3 className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wide uppercase">
            Avancement
          </h3>
          <ol className="flex flex-col gap-0">
            {milestones.map((milestone, index) => {
              const done = milestone.at !== null;
              return (
                <li key={milestone.label} className="flex gap-2.5">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "grid size-4 shrink-0 place-items-center rounded-full",
                        done ? "bg-success text-white" : "bg-muted",
                      )}
                    >
                      {done && <CheckIcon className="size-2.5" strokeWidth={3} />}
                    </span>
                    {index < milestones.length - 1 && (
                      <span
                        className={cn("w-px flex-1", done ? "bg-success" : "bg-border")}
                      />
                    )}
                  </div>
                  <div className="flex flex-1 items-baseline justify-between gap-3 pb-3">
                    <span className={cn("text-xs", !done && "text-muted-foreground")}>
                      {milestone.label}
                    </span>
                    <span className="text-muted-foreground text-[11px] tabular-nums">
                      {done ? formatDate(milestone.at) : "—"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
          {worksite.days_late > 0 && (
            <p className="text-danger text-xs">
              {worksite.days_late} jours au-delà de la fin prévue du{" "}
              {formatDate(worksite.ends_at)}.
            </p>
          )}
        </section>

        {/* ---- Économie ---------------------------------------------------- */}
        <section>
          <h3 className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wide uppercase">
            Économie du chantier
          </h3>
          <div className="grid grid-cols-3 divide-x rounded-lg border">
            <Figure label="Devisé HT" value={euros(worksite.amount_ht)} />
            <Figure label="Coûts engagés" value={euros(worksite.cost_total)} />
            <Figure
              label="Marge"
              value={`${euros(worksite.margin)}`}
              hint={`${worksite.margin_rate} %`}
              tone={worksite.cost_total > 0 ? marginTone(worksite.margin_rate) : undefined}
            />
          </div>

          {worksite.costs.length === 0 ? (
            <p className="text-muted-foreground/70 mt-2 text-[11px]">
              Aucun coût saisi : la marge affichée est celle du devis, pas la marge réelle.
            </p>
          ) : (
            <ul className="mt-2 divide-y rounded-lg border">
              {worksite.costs.map((cost) => (
                <li key={cost.id} className="flex items-center gap-3 px-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs">{cost.label}</span>
                    <span className="text-muted-foreground block truncate text-[11px]">
                      {COST_KIND[cost.kind]} · {cost.supplier}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-xs tabular-nums">
                      {eurosShort(cost.amount_ht)}
                    </span>
                    <span
                      className={cn(
                        "block text-[11px]",
                        cost.paid_at ? "text-success" : "text-warning",
                      )}
                    >
                      {cost.paid_at ? `réglé le ${formatDate(cost.paid_at)}` : "non réglé"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---- Règlements -------------------------------------------------- */}
        <section>
          <h3 className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wide uppercase">
            Règlements
          </h3>
          {worksite.deposit === null && worksite.balance === null ? (
            <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center text-[11px]">
              Aucun échéancier défini
            </p>
          ) : (
            <div className="divide-y rounded-lg border">
              {[worksite.deposit, worksite.balance]
                .filter((payment): payment is Payment => payment !== null)
                .map((payment) => (
                  <PaymentRow key={payment.label} payment={payment} />
                ))}
            </div>
          )}
        </section>

        {/* ---- Devis ------------------------------------------------------- */}
        <section>
          <h3 className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wide uppercase">
            Devis de l&apos;affaire
          </h3>
          <ul className="divide-y rounded-lg border">
            {worksite.quotes.map((quote) => {
              const quoteEntity = entityOfActivity(quote.activity_id);
              return (
                <li key={quote.reference} className="flex items-center gap-3 px-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono text-[11px]">
                      {quote.reference}
                    </span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {quote.label}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-xs tabular-nums">
                      {eurosShort(quote.amount_ht)}
                    </span>
                    <span className="text-muted-foreground block text-[11px]">
                      {quoteEntity?.name ?? activityName(quote.activity_id)} · TVA{" "}
                      {quote.vat_rate} %
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="text-muted-foreground/70 mt-2 text-[11px]">
            Une affaire, plusieurs devis — l&apos;étude et les travaux se chiffrent
            ensemble, et chaque devis est émis par la société qui l&apos;exécute.
          </p>
        </section>

        <p className="text-muted-foreground/70 text-[11px]">
          {worksite.address} · responsable {worksite.owner_name}
        </p>
      </div>
    </>
  );
}

function Figure({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: keyof typeof TONE_TEXT;
}) {
  return (
    <div className="px-3 py-2.5">
      <p className="text-muted-foreground text-[11px]">{label}</p>
      <p className={cn("text-sm font-semibold tabular-nums", tone && TONE_TEXT[tone])}>
        {value}
      </p>
      {hint && <p className="text-muted-foreground text-[11px] tabular-nums">{hint}</p>}
    </div>
  );
}

function PaymentRow({ payment }: { payment: Payment }) {
  const state = payment.paid_at
    ? { label: `Encaissé le ${formatDate(payment.paid_at)}`, tone: "text-success" }
    : payment.invoiced_at
      ? {
          label: `Facturé le ${formatDate(payment.invoiced_at)}, échéance ${formatDate(payment.due_at)}`,
          tone: "text-warning",
        }
      : { label: "Non facturé", tone: "text-muted-foreground" };

  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium">{payment.label}</span>
        <span className={cn("block truncate text-[11px]", state.tone)}>
          {state.label}
          {payment.reminded_at && ` · relancé le ${formatDate(payment.reminded_at)}`}
        </span>
      </span>
      <span className="shrink-0 text-xs font-medium tabular-nums">
        {euros(payment.amount_ttc)}
      </span>
    </div>
  );
}
