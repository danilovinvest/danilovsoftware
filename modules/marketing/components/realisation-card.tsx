"use client";

import { MapPinIcon, QuoteIcon, ReceiptEuroIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { euros, formatDate } from "@/shared/lib/format";
import { Meter, TONE_SOFT } from "@/shared/ui/panel";
import { ARTICLE_STATUS, completenessTone } from "../lib/labels";
import type { ReadRealisation } from "../lib/types";

/**
 * Une affaire réalisée, vue comme une réalisation à valoriser.
 *
 * La barre de complétude n'est pas décorative : elle dit ce qui manque avant de
 * publier, et c'est la seule information qui fait avancer un article.
 */
export function RealisationCard({
  entry,
  onOpen,
}: {
  entry: ReadRealisation;
  onOpen: (id: string) => void;
}) {
  const { realisation, completeness, missing } = entry;
  const article = realisation.article;
  const status = ARTICLE_STATUS[article.status];
  const chiffre =
    realisation.amount_ht !== "0" && realisation.amount_ht !== ""
      ? euros(Number(realisation.amount_ht))
      : null;

  return (
    <button
      type="button"
      onClick={() => onOpen(realisation.project_id)}
      className="bg-card hover:bg-accent/40 flex flex-col gap-2.5 rounded-xl border p-3 text-left transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">
            {article.title.trim() === "" ? realisation.label : article.title}
          </span>
          <span className="text-muted-foreground block truncate text-[11px]">
            {realisation.customer_name}
          </span>
        </span>
        <span
          className={cn(
            "shrink-0 rounded-md px-1.5 py-0.5 text-[11px] whitespace-nowrap",
            TONE_SOFT[status.tone],
          )}
        >
          {status.label}
        </span>
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px]">
        {/* Une ligne ne montre que ce qu'elle sait : la ville manque sur les
            trois quarts des affaires, la date sur une partie, le montant sur la
            plupart. Un « — » à chaque place ferait du vide une information. */}
        {realisation.city && (
          <span className="inline-flex items-center gap-1">
            <MapPinIcon className="size-3" />
            {realisation.city}
          </span>
        )}
        {realisation.started_at && <span>{formatDate(realisation.started_at)}</span>}
        {chiffre && (
          <span className="inline-flex items-center gap-1">
            <ReceiptEuroIcon className="size-3" />
            {chiffre} HT
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Meter value={completeness} max={100} tone={completenessTone(completeness)} />
        <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
          {completeness} %
        </span>
      </div>

      <div className="text-muted-foreground/70 flex items-center gap-2.5 text-[11px]">
        <span
          className={cn(
            "inline-flex items-center gap-1",
            article.quote.trim() !== "" && "text-success",
          )}
        >
          <QuoteIcon className="size-3" />
          {article.quote.trim() !== "" ? "citation client" : "sans citation"}
        </span>
        {missing.length > 0 && (
          <span className="text-warning ml-auto truncate">
            manque {missing.length} élément{missing.length > 1 ? "s" : ""}
          </span>
        )}
      </div>
    </button>
  );
}
