"use client";

import { useState } from "react";
import { ChevronRightIcon, TriangleAlertIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatAmount, formatDate } from "@/shared/lib/format";
import {
  CUSTOMER_SOURCE,
  CUSTOMER_STATUS,
  EnumBadge,
  PROJECT_OUTCOME,
  PROJECT_STAGE,
  QUOTE_STATUS,
} from "../..";
import { LOW_CONFIDENCE, type Plan, type PlannedCustomer } from "../lib/types";

/**
 * Aperçu ligne par ligne. Chaque affaire montre le statut d'origine à côté de
 * l'étape déduite : c'est ce qui rend la relecture possible avant écriture.
 */
export function PlanPreview({ plan }: { plan: Plan }) {
  const [expanded, setExpanded] = useState<Set<string>>(
    // Les fiches à relire sont ouvertes d'office.
    new Set(
      plan.customers
        .filter((c) => c.projects.some((p) => p.raw_status && p.confidence < LOW_CONFIDENCE))
        .map((c) => c.display_name),
    ),
  );

  function toggle(key: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <Card className="gap-0 divide-y py-0">
      {plan.customers.map((customer) => (
        <CustomerRow
          key={customer.display_name}
          customer={customer}
          open={expanded.has(customer.display_name)}
          onToggle={() => toggle(customer.display_name)}
        />
      ))}
    </Card>
  );
}

function CustomerRow({
  customer,
  open,
  onToggle,
}: {
  customer: PlannedCustomer;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="hover:bg-muted/50 flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <ChevronRightIcon
          className={cn("text-muted-foreground size-4 shrink-0 transition-transform", open && "rotate-90")}
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{customer.display_name}</span>
            <Badge
              className={
                customer.action === "update"
                  ? "bg-info-soft text-info"
                  : "bg-success-soft text-success"
              }
            >
              {customer.action === "update" ? "Mise à jour" : "Création"}
            </Badge>
            <EnumBadge value={customer.status} entries={CUSTOMER_STATUS} />
            <EnumBadge value={customer.source} entries={CUSTOMER_SOURCE} />
          </span>
          <span className="text-muted-foreground mt-0.5 block text-xs">
            {[customer.email, customer.phone, customer.city].filter(Boolean).join(" · ") ||
              "coordonnées absentes"}
            {" — ligne"}
            {customer.source_lines.length > 1 ? "s " : " "}
            {customer.source_lines.join(", ")}
          </span>
        </span>
        <span className="text-muted-foreground shrink-0 text-xs">
          {customer.projects.length} affaire{customer.projects.length > 1 ? "s" : ""}
        </span>
      </button>

      {open && (
        <ul className="divide-y border-t">
          {customer.projects.map((project, index) => {
            const uncertain = project.raw_status !== "" && project.confidence < LOW_CONFIDENCE;
            return (
              <li key={`${project.label}-${index}`} className="bg-muted/30 px-4 py-3 pl-11">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm">{project.label}</span>
                  <EnumBadge value={project.stage} entries={PROJECT_STAGE} />
                  {project.outcome && (
                    <EnumBadge value={project.outcome} entries={PROJECT_OUTCOME} />
                  )}
                  {uncertain && (
                    <Badge className="bg-warning-soft text-warning">
                      <TriangleAlertIcon />À relire · {Math.round(project.confidence * 100)}%
                    </Badge>
                  )}
                </div>

                {project.raw_status && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    Statut d&apos;origine :{" "}
                    <span className="text-foreground font-mono">« {project.raw_status} »</span>
                    {project.classified_by === "openai" ? " — classé par OpenAI" : " — classé par règles"}
                  </p>
                )}
                {project.outcome_note && (
                  <p className="text-muted-foreground mt-0.5 text-xs">{project.outcome_note}</p>
                )}

                {project.quotes.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1">
                    {project.quotes.map((quote, quoteIndex) => (
                      <li
                        key={`${quote.reference}-${quoteIndex}`}
                        className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs"
                      >
                        <span className="font-mono">{quote.reference || quote.label || "devis"}</span>
                        <EnumBadge value={quote.status} entries={QUOTE_STATUS} />
                        <span className="tabular-nums">
                          {quote.amount_ttc
                            ? formatAmount(quote.amount_ttc)
                            : quote.amount_note || "montant non chiffré"}
                        </span>
                        {quote.issued_at && <span>{formatDate(quote.issued_at)}</span>}
                      </li>
                    ))}
                  </ul>
                )}

                {project.interactions.length > 0 && (
                  <p className="text-muted-foreground mt-2 text-xs">
                    {project.interactions.length} échange
                    {project.interactions.length > 1 ? "s" : ""} repris :{" "}
                    {project.interactions
                      .map((i) => `${i.kind} ${formatDate(i.occurred_at)}`)
                      .join(", ")}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
