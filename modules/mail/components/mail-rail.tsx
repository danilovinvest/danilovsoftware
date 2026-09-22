"use client";

import { InboxIcon, LayersIcon, Link2Icon, SendIcon, UserRoundXIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { HUE } from "@/shared/ui/hue";
import { VIEWS } from "../lib/views";
import type { MailAccount, MailView, ThreadCounts } from "../lib/types";

const ICONS: Record<MailView, LucideIcon> = {
  a_traiter: InboxIcon,
  tous: LayersIcon,
  rapproches: Link2Icon,
  sans_fiche: UserRoundXIcon,
  envoyes: SendIcon,
};

/**
 * Les vues et les boîtes.
 *
 * En colonne sur un grand écran, en bande défilante au-dessus de la liste
 * ailleurs : la bande défile dans son propre cadre, jamais en poussant la page
 * (390 pixels, voir CLAUDE.md).
 *
 * Seul « À traiter » affiche son compte en couleur : c'est le seul nombre
 * qu'on cherche à faire baisser. Les autres restent gris — un compteur partout
 * ne dirait plus lequel compte.
 */
export function MailRail({
  view,
  counts,
  accounts,
  account,
  onView,
  onAccount,
  orientation,
}: {
  view: MailView;
  counts: ThreadCounts | null;
  accounts: MailAccount[];
  account: string;
  onView: (view: MailView) => void;
  onAccount: (id: string) => void;
  orientation: "column" | "strip";
}) {
  const column = orientation === "column";
  return (
    <nav
      aria-label="Vues de la messagerie"
      data-demo={column ? "mail-views" : undefined}
      className={cn(
        column
          ? "flex min-h-0 flex-col gap-4 overflow-y-auto"
          : "flex min-w-0 flex-col gap-2",
      )}
    >
      <ul className={cn(column ? "flex flex-col gap-0.5" : "flex gap-1 overflow-x-auto pb-1")}>
        {VIEWS.map((entry) => {
          const Icon = ICONS[entry.key];
          const active = entry.key === view;
          const count = counts?.[entry.key];
          return (
            <li key={entry.key} className="shrink-0">
              <button
                type="button"
                title={entry.hint}
                aria-current={active ? "page" : undefined}
                onClick={() => onView(entry.key)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 text-left text-[13px] transition-colors",
                  column ? "h-8" : "h-7 whitespace-nowrap",
                  active
                    ? "bg-foreground text-background font-medium"
                    : "text-foreground/80 hover:bg-muted",
                )}
              >
                <Icon className={cn("size-3.5 shrink-0", active ? "text-background" : "text-muted-foreground")} />
                <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                {count !== undefined && count > 0 && (
                  <span
                    className={cn(
                      "rounded-md px-1.5 text-[11px] tabular-nums",
                      entry.key === "a_traiter" && !active
                        ? cn(HUE.cyan.soft, HUE.cyan.text, "font-semibold")
                        : active
                          ? "text-background/80"
                          : "text-muted-foreground",
                    )}
                  >
                    {count.toLocaleString("fr-FR")}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Le choix de la boîte ne s'affiche qu'à partir de deux : avec une
          seule, un sélecteur à une entrée est une case qu'on lit pour rien. */}
      {accounts.length > 1 && (
        <div className={cn("flex min-w-0 flex-col", column ? "gap-0.5" : "gap-1")}>
          {column && (
            <p className="text-muted-foreground px-2.5 pb-1 text-[10.5px] font-medium tracking-wider uppercase">
              Boîtes
            </p>
          )}
          <ul className={cn(column ? "flex flex-col gap-0.5" : "flex gap-1 overflow-x-auto pb-1")}>
            {[{ id: "", email: "Toutes les boîtes" }, ...accounts].map((entry) => {
              const active = account === entry.id;
              return (
                <li key={entry.id || "toutes"} className="min-w-0 shrink-0">
                  <button
                    type="button"
                    onClick={() => onAccount(entry.id)}
                    title={entry.email}
                    className={cn(
                      "w-full truncate rounded-md px-2.5 py-1 text-left text-xs transition-colors",
                      active
                        ? cn(HUE.cyan.soft, HUE.cyan.text, "font-medium")
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {entry.email}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </nav>
  );
}
