"use client";

import {
  AlertTriangleIcon,
  BanknoteIcon,
  CalendarPlusIcon,
  CheckCircle2Icon,
  FileTextIcon,
  MailIcon,
  PackageIcon,
  PhoneIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  StarIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TONE_SOFT, TONE_TEXT } from "@/shared/ui/panel";
import type { ActionKey, NextAction } from "../lib/cycle";

/**
 * « À faire maintenant » — une phrase, trois boutons au plus.
 *
 * C'est le seul endroit de l'affaire qui dit quoi faire. Le reste de l'écran
 * décrit ce qui s'est passé ; ce bloc décide. D'où le plafond de trois
 * boutons : au-delà on ne propose plus une action, on ouvre un menu, et
 * l'utilisateur doit à nouveau choisir — ce que le bloc était censé lui
 * épargner.
 *
 * Ce qu'il affiche vient entièrement de `nextAction` : aucune règle métier ici,
 * seulement sa mise en forme.
 */

const ICONS: Record<ActionKey, LucideIcon> = {
  interaction: PhoneIcon,
  plan_rdv: CalendarPlusIcon,
  open_calendar: CalendarPlusIcon,
  new_quote: FileTextIcon,
  relance: MailIcon,
  refuse: AlertTriangleIcon,
  postpone: RotateCcwIcon,
  reopen: RotateCcwIcon,
  resume: RotateCcwIcon,
  deposit_invoiced: FileTextIcon,
  deposit_paid: BanknoteIcon,
  send_rib: BanknoteIcon,
  send_insurance: ShieldCheckIcon,
  book_date: CalendarPlusIcon,
  order_materials: PackageIcon,
  open_worksite: CheckCircle2Icon,
  send_plans: FileTextIcon,
  invoice_balance: BanknoteIcon,
  ask_review: StarIcon,
  record_review: StarIcon,
};

export function ProjectNextAction({
  action,
  onAct,
  pending,
  className,
}: {
  action: NextAction;
  onAct: (key: ActionKey) => void;
  pending?: boolean;
  className?: string;
}) {
  const Icon = action.alert ? AlertTriangleIcon : ICONS[action.actions[0]?.key ?? "interaction"];

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-3 rounded-md border px-3 py-2.5",
        // Le fond ne se teinte que lorsqu'il y a lieu de s'inquiéter. Colorer
        // toutes les affaires ferait de l'alerte un décor, et plus un signal.
        action.alert ? cn(TONE_SOFT[action.tone], "border-transparent") : "bg-muted/30",
        className,
      )}
    >
      <Icon
        className={cn("size-4 shrink-0", action.alert ? TONE_TEXT[action.tone] : "text-muted-foreground")}
      />

      <div className="min-w-0 flex-1">
        <div className={cn("text-sm font-medium", action.alert && TONE_TEXT[action.tone])}>
          {action.title}
        </div>
        {action.detail && (
          <div className="text-muted-foreground mt-0.5 text-xs">{action.detail}</div>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {action.actions.map((entry) => {
          const EntryIcon = ICONS[entry.key];
          return (
            <Button
              key={entry.key}
              size="xs"
              variant={entry.primary ? "default" : "outline"}
              disabled={pending}
              onClick={() => onAct(entry.key)}
            >
              <EntryIcon />
              {entry.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
