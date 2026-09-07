"use client";

import { ImageIcon, MapPinIcon, QuoteIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { activityName } from "@/modules/group";
import { formatDate } from "@/shared/lib/format";
import { Meter, TONE_SOFT } from "@/shared/ui/panel";
import { ARTICLE_STATUS, completenessTone } from "../lib/labels";
import type { Realisation } from "../lib/types";

/**
 * Un chantier livré, vu comme une réalisation à valoriser.
 *
 * La barre de complétude n'est pas décorative : elle dit ce qui manque avant de
 * publier, et c'est la seule information qui fait avancer un article.
 */
export function RealisationCard({
  realisation,
  onOpen,
}: {
  realisation: Realisation;
  onOpen: (id: string) => void;
}) {
  const { worksite, article, duration, completeness, missing } = realisation;
  const status = ARTICLE_STATUS[article.status];

  return (
    <button
      type="button"
      onClick={() => onOpen(worksite.id)}
      className="bg-card hover:bg-accent/40 flex flex-col gap-2.5 rounded-lg border p-3 text-left transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">
            {article.title.trim() === "" ? worksite.label : article.title}
          </span>
          <span className="text-muted-foreground block truncate text-[11px]">
            {worksite.customer_name}
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
        <span className="inline-flex items-center gap-1">
          <MapPinIcon className="size-3" />
          {worksite.city}
        </span>
        <span>{activityName(worksite.activity_id)}</span>
        <span>{duration} j de chantier</span>
        <span>livré le {formatDate(worksite.completed_at)}</span>
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
            article.photos.length > 0 && "text-success",
          )}
        >
          <ImageIcon className="size-3" />
          {article.photos.length}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1",
            article.quote.trim() !== "" && "text-success",
          )}
          title={
            worksite.review_received_at === null
              ? "Aucun avis client recueilli"
              : "Avis client disponible"
          }
        >
          <QuoteIcon className="size-3" />
          {article.quote.trim() !== "" ? "citation" : "sans citation"}
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
