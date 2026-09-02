"use client";

import {
  AlertTriangleIcon,
  BanknoteIcon,
  FileSignatureIcon,
  MapPinIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { activityName } from "@/modules/group";
import { eurosShort } from "@/shared/lib/format";
import { BLOCKED_REASON, STATUS_RAIL, marginTone } from "../lib/labels";
import { TONE_TEXT } from "@/shared/ui/panel";
import type { Worksite } from "../lib/types";

const dayMonth = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" });

function short(value: string | null): string {
  return value === null ? "—" : dayMonth.format(new Date(value));
}

/**
 * Une carte de chantier.
 *
 * Trois pastilles en pied — PV, solde, avis — parce que c'est la chaîne qui
 * ferme un chantier, et qu'un chantier « terminé » dont le PV n'est pas signé
 * n'est pas terminé du tout.
 */
export function WorksiteCard({
  worksite,
  onSelect,
}: {
  worksite: Worksite;
  onSelect: (worksite: Worksite) => void;
}) {
  const blocked = worksite.blocked_reason
    ? BLOCKED_REASON[worksite.blocked_reason]
    : null;

  return (
    <button
      type="button"
      onClick={() => onSelect(worksite)}
      className={cn(
        "bg-card hover:bg-accent/40 flex w-full flex-col gap-1.5 rounded-lg border border-l-2 px-2.5 py-2 text-left transition-colors",
        STATUS_RAIL[worksite.status],
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="block truncate text-xs font-medium">
            {worksite.customer_name}
            {worksite.internal && (
              <span className="text-info ml-1.5 text-[11px] font-normal">interne</span>
            )}
          </span>
          <span className="text-muted-foreground block truncate text-[11px]">
            {worksite.label}
          </span>
        </span>
        <span className="shrink-0 text-xs font-medium tabular-nums">
          {eurosShort(worksite.amount_ht)}
        </span>
      </div>

      <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
        <span className="inline-flex items-center gap-1">
          <MapPinIcon className="size-3" />
          {worksite.city}
        </span>
        <span className="tabular-nums">
          {short(worksite.starts_at)} → {short(worksite.ends_at)}
        </span>
        {worksite.cost_total > 0 && (
          <span className={cn("font-medium", TONE_TEXT[marginTone(worksite.margin_rate)])}>
            marge {worksite.margin_rate} %
          </span>
        )}
      </div>

      {worksite.days_late > 0 && (
        <p className="text-danger inline-flex items-center gap-1 text-[11px] font-medium">
          <AlertTriangleIcon className="size-3" />
          {worksite.days_late} jours de retard
        </p>
      )}

      {blocked && (
        <p className="text-warning text-[11px]">{blocked.label}</p>
      )}

      <div className="text-muted-foreground/70 flex items-center gap-2.5 text-[11px]">
        <Pip
          icon={<FileSignatureIcon className="size-3" />}
          done={worksite.pv_signed_at !== null}
          pending={worksite.pv_sent_at !== null}
          title="PV de réception"
        />
        <Pip
          icon={<BanknoteIcon className="size-3" />}
          done={worksite.balance?.paid_at != null}
          pending={worksite.balance?.invoiced_at != null}
          title="Solde"
        />
        <span className="ml-auto truncate">{activityName(worksite.activity_id)}</span>
      </div>
    </button>
  );
}

/** Un jalon : fait, engagé, ou pas commencé. */
function Pip({
  icon,
  done,
  pending,
  title,
}: {
  icon: React.ReactNode;
  done: boolean;
  pending: boolean;
  title: string;
}) {
  return (
    <span
      title={`${title} — ${done ? "fait" : pending ? "en cours" : "à faire"}`}
      className={cn(
        done ? "text-success" : pending ? "text-warning" : "text-muted-foreground/40",
      )}
    >
      {icon}
    </span>
  );
}
