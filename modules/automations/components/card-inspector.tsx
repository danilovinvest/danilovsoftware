"use client";

import { useEffect, useState } from "react";
import { RefreshCwIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { errorMessage } from "@/shared/api/errors";
import { SelectField, TextAreaField, TextField } from "@/shared/ui/form";
import { telegramInfo } from "../lib/api";
import { VARIABLES, cardOf } from "../lib/cards";
import { ScheduleFields } from "./schedule-fields";
import type {
  AutomationNode,
  DigestConfig,
  NodeConfig,
  TelegramConfig,
  TelegramInfo,
} from "../lib/types";

/**
 * Le panneau de droite : ce que fait la carte sélectionnée.
 *
 * Toute la configuration vit ici et jamais dans la carte elle-même. Une carte
 * qui porterait ses champs deviendrait un formulaire posé sur une toile — on
 * ne verrait plus le graphe, qui est la seule raison d'avoir une toile.
 */
export function CardInspector({
  node,
  cron,
  timeZone,
  calendars,
  onConfig,
  onCron,
  onTimeZone,
  onDelete,
}: {
  node: AutomationNode | null;
  cron: string;
  timeZone: string;
  calendars: Array<{ id: string; name: string }>;
  onConfig: (config: NodeConfig) => void;
  onCron: (value: string) => void;
  onTimeZone: (value: string) => void;
  onDelete: () => void;
}) {
  if (!node) {
    return (
      <aside className="bg-card flex w-72 shrink-0 flex-col justify-center gap-2 rounded-xl border p-6 text-center">
        <p className="text-sm font-medium">Aucune carte sélectionnée</p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Cliquez une carte pour la régler, ou tirez un trait d&apos;un point à
          l&apos;autre pour relier deux cartes.
        </p>
      </aside>
    );
  }

  const card = cardOf(node.type);
  const Icon = card.icon;

  function set<T extends NodeConfig>(patch: Partial<T>) {
    onConfig({ ...node!.config, ...patch });
  }

  return (
    <aside className="bg-card flex w-72 shrink-0 flex-col gap-4 overflow-y-auto rounded-xl border p-4">
      <div className="flex items-start gap-2">
        <span className={cn("flex size-7 items-center justify-center rounded-md", card.tone.chip)}>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{card.label}</p>
          <p className="text-muted-foreground/70 text-[11px] leading-snug">{card.hint}</p>
        </div>
      </div>

      {node.type === "schedule" && (
        <ScheduleFields
          cron={cron}
          timeZone={timeZone}
          onCron={onCron}
          onTimeZone={onTimeZone}
        />
      )}

      {node.type === "calendar_digest" && (
        <DigestFields
          config={node.config as unknown as DigestConfig}
          calendars={calendars}
          set={set}
        />
      )}

      {node.type === "telegram" && (
        <TelegramFields config={node.config as unknown as TelegramConfig} set={set} />
      )}

      {node.type !== "schedule" && (
        <Button
          variant="ghost"
          size="sm"
          className="text-danger hover:text-danger mt-auto justify-start"
          onClick={onDelete}
        >
          <Trash2Icon className="size-3.5" />
          Retirer la carte
        </Button>
      )}
    </aside>
  );
}

function DigestFields({
  config,
  calendars,
  set,
}: {
  config: DigestConfig;
  calendars: Array<{ id: string; name: string }>;
  set: (patch: Partial<DigestConfig>) => void;
}) {
  const selected = config.calendar_ids ?? [];

  return (
    <>
      <SelectField
        label="Journée résumée"
        value={String(config.offset_days ?? 1)}
        onValueChange={(value) => set({ offset_days: Number(value) })}
        options={[
          { value: "0", label: "Aujourd'hui" },
          { value: "1", label: "Demain" },
          { value: "2", label: "Après-demain" },
          { value: "7", label: "Dans une semaine" },
        ]}
      />

      <div className="flex flex-col gap-1.5">
        <Label className="text-muted-foreground text-xs font-medium">Agendas</Label>
        <div className="flex flex-col gap-1 rounded-lg border p-2">
          {calendars.length === 0 && (
            <p className="text-muted-foreground/70 text-[11px]">Aucun agenda.</p>
          )}
          {calendars.map((calendar) => {
            const on = selected.includes(calendar.id);
            return (
              <button
                key={calendar.id}
                type="button"
                onClick={() =>
                  set({
                    calendar_ids: on
                      ? selected.filter((id) => id !== calendar.id)
                      : [...selected, calendar.id],
                  })
                }
                className={cn(
                  "flex items-center gap-2 rounded-[4px] px-1.5 py-1 text-left text-xs transition-colors",
                  on ? "bg-accent" : "hover:bg-accent/60 text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "size-2 rounded-full",
                    on ? "bg-brand" : "bg-muted-foreground/30",
                  )}
                />
                <span className="truncate">{calendar.name}</span>
              </button>
            );
          })}
        </div>
        <p className="text-muted-foreground text-[11px]">
          {selected.length === 0
            ? "Aucun choisi : tous les agendas visibles sont pris."
            : `${selected.length} agenda${selected.length > 1 ? "s" : ""} retenu${selected.length > 1 ? "s" : ""}.`}
        </p>
      </div>

      <TextField
        label="Si la journée est vide"
        value={config.empty_text ?? ""}
        onChange={(event) => set({ empty_text: event.target.value })}
        placeholder="Laisser vide : rien n'est envoyé"
        hint="Un « rien de prévu » tous les samedis apprend à ignorer les messages du CRM."
      />
    </>
  );
}

function TelegramFields({
  config,
  set,
}: {
  config: TelegramConfig;
  set: (patch: Partial<TelegramConfig>) => void;
}) {
  return (
    <>
      <ChatPicker
        value={config.chat_id ?? ""}
        onPick={(chat_id) => set({ chat_id })}
      />

      <TextAreaField
        label="Message"
        value={config.message ?? ""}
        onChange={(event) => set({ message: event.target.value })}
        className="min-h-24 font-mono text-xs"
      />

      <div className="flex flex-col gap-1">
        <Label className="text-muted-foreground text-xs font-medium">
          Variables disponibles
        </Label>
        {VARIABLES.map((variable) => (
          <button
            key={variable.name}
            type="button"
            onClick={() =>
              set({ message: `${config.message ?? ""}{{${variable.name}}}` })
            }
            className="hover:bg-accent flex items-baseline gap-2 rounded-[4px] px-1.5 py-1 text-left transition-colors"
          >
            <code className="bg-muted shrink-0 rounded-[3px] px-1 py-0.5 font-mono text-[10px]">
              {`{{${variable.name}}}`}
            </code>
            <span className="text-muted-foreground/70 min-w-0 flex-1 truncate text-[11px]">
              {variable.description}
            </span>
          </button>
        ))}
      </div>

      <SelectField
        label="Mise en forme"
        value={config.parse_mode ?? "texte"}
        onValueChange={(value) => set({ parse_mode: value as TelegramConfig["parse_mode"] })}
        options={[
          { value: "texte", label: "Texte simple" },
          { value: "HTML", label: "HTML — <b>gras</b>, <i>italique</i>" },
        ]}
        hint={
          config.parse_mode === "HTML"
            ? "Les titres de rendez-vous sont échappés : un chevron ne fera pas échouer l'envoi."
            : undefined
        }
      />

      <div className="flex items-center gap-2">
        <Switch
          id="silent"
          checked={config.silent ?? false}
          onCheckedChange={(silent) => set({ silent })}
        />
        <Label htmlFor="silent" className="text-sm font-normal">
          Envoi silencieux
        </Label>
      </div>
    </>
  );
}

/**
 * Le choix du destinataire.
 *
 * Un bot Telegram n'écrit qu'à un `chat_id`, et ce nombre n'apparaît nulle part
 * dans l'application. Le faire chercher dans une documentation d'API serait la
 * marche la plus haute de toute l'installation — pour un identifiant que le bot
 * connaît déjà. On l'interroge donc, et on propose ce qu'il a vu passer.
 *
 * Le champ reste saisissable : un identifiant de groupe connu se colle
 * directement, sans devoir écrire au bot pour le faire apparaître.
 */
function ChatPicker({
  value,
  onPick,
}: {
  value: string;
  onPick: (id: string) => void;
}) {
  const [token, setToken] = useState(0);
  const [info, setInfo] = useState<TelegramInfo | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    telegramInfo(controller.signal)
      .then(setInfo)
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setFailure(errorMessage(cause));
      });
    return () => controller.abort();
  }, [token]);

  const chats = info?.chats ?? [];

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-muted-foreground text-xs font-medium">
          Conversation <span className="text-destructive">*</span>
        </Label>
        <button
          type="button"
          onClick={() => setToken((current) => current + 1)}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[11px]"
        >
          <RefreshCwIcon className="size-3" />
          Actualiser
        </button>
      </div>

      <TextField
        value={value}
        onChange={(event) => onPick(event.target.value)}
        placeholder="123456789"
        className="font-mono text-xs"
      />

      {info?.configured === false ? (
        <p className="text-warning bg-warning-soft/50 rounded-lg px-3 py-2 text-[11px] leading-relaxed">
          Aucun bot déclaré sur le serveur
          (<span className="font-mono">CRM_TELEGRAM_BOT_TOKEN</span>).
        </p>
      ) : (failure ?? info?.error) ? (
        <p className="text-danger bg-danger-soft/40 rounded-lg px-3 py-2 text-[11px] leading-relaxed">
          {failure ?? info?.error}
        </p>
      ) : chats.length > 0 ? (
        <div className="flex flex-col gap-0.5 rounded-lg border p-1">
          {chats.map((chat) => (
            <button
              key={chat.id}
              type="button"
              onClick={() => onPick(chat.id)}
              className={cn(
                "flex items-baseline gap-2 rounded-[4px] px-1.5 py-1 text-left text-xs transition-colors",
                chat.id === value ? "bg-accent" : "hover:bg-accent/60",
              )}
            >
              <span className="min-w-0 flex-1 truncate">{chat.title}</span>
              <span className="text-muted-foreground/60 shrink-0 text-[10px]">
                {chat.kind}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 text-[11px] leading-relaxed">
          {info?.bot?.username ? (
            <>
              Écrivez «&nbsp;bonjour&nbsp;» à{" "}
              <span className="font-medium">@{info.bot.username}</span> sur
              Telegram, puis actualisez : la conversation apparaîtra ici.
            </>
          ) : (
            "Chargement du bot…"
          )}
        </p>
      )}

      <p className="text-muted-foreground/70 text-[11px] leading-relaxed">
        Telegram ne garde que vingt-quatre heures de messages : la liste est
        vide tant que personne n&apos;a écrit au bot.
      </p>
    </div>
  );
}
