"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { cardOf, describeCron, FAMILY_LABEL } from "../lib/cards";
import type { DigestConfig, NodeConfig, NodeType, TelegramConfig } from "../lib/types";

/**
 * Une carte de la toile.
 *
 * Elle montre ce qu'elle fera, pas ce qu'elle est : « Demain · WhatsApp au
 * 06 62 46 48 67 » plutôt que « nœud whatsapp ». Un graphe se lit d'un coup
 * d'œil ou ne sert à rien — ouvrir chaque carte pour se rappeler ce qu'elle
 * fait reviendrait à lire un formulaire, et un formulaire n'a pas besoin d'une
 * toile.
 */

export type CardData = {
  kind: NodeType;
  config: NodeConfig;
  cron: string;
  timeZone: string;
  /** Renseigné quand la dernière exécution a buté sur cette carte. */
  failure?: string;
};

export function AutomationCard({ data, selected }: NodeProps) {
  const payload = data as unknown as CardData;
  const card = cardOf(payload.kind);
  const Icon = card.icon;

  return (
    <div
      className={cn(
        "bg-card w-60 rounded-xl border shadow-sm transition-shadow",
        selected ? "ring-brand/50 shadow-md ring-2" : "hover:shadow-md",
        payload.failure && "border-danger/50",
      )}
    >
      {card.family !== "declencheur" && (
        <Handle type="target" position={Position.Left} className="!bg-muted-foreground/50" />
      )}

      <div className="flex items-center gap-2 border-b px-3 py-2">
        <span className={cn("flex size-6 items-center justify-center rounded-md", card.tone.chip)}>
          <Icon className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium">{card.label}</p>
          <p className="text-muted-foreground/70 text-[10px] tracking-wide uppercase">
            {FAMILY_LABEL[card.family]}
          </p>
        </div>
      </div>

      <div className="px-3 py-2">
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          {summarise(payload)}
        </p>
        {payload.failure && (
          <p className="text-danger mt-1.5 line-clamp-2 text-[10px] leading-snug">
            {payload.failure}
          </p>
        )}
      </div>

      {card.family !== "action" && (
        <Handle type="source" position={Position.Right} className="!bg-muted-foreground/50" />
      )}
    </div>
  );
}

/** Ce que la carte fera, en une phrase. */
function summarise(data: CardData): string {
  switch (data.kind) {
    case "schedule":
      return `${describeCron(data.cron)} · ${data.timeZone}`;

    case "calendar_digest": {
      const config = data.config as unknown as DigestConfig;
      const when =
        config.offset_days === 0
          ? "Aujourd'hui"
          : config.offset_days === 1
            ? "Demain"
            : `Dans ${config.offset_days} jours`;
      const scope =
        config.calendar_ids?.length > 0
          ? `${config.calendar_ids.length} agenda${config.calendar_ids.length > 1 ? "s" : ""}`
          : "tous les agendas";
      return `${when} · ${scope}`;
    }

    case "telegram": {
      const config = data.config as unknown as TelegramConfig;
      if (!config.chat_id?.trim()) return "Aucune conversation choisie";
      const shape = config.parse_mode === "HTML" ? "mis en forme" : "texte";
      return `Message ${shape} vers ${config.chat_id}${config.silent ? " · silencieux" : ""}`;
    }
  }
}
