"use client";

import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { SelectField, TextAreaField, TextField } from "@/shared/ui/form";
import { CRON_PRESETS, VARIABLES, cardOf, describeCron } from "../lib/cards";
import type {
  AutomationNode,
  DigestConfig,
  NodeConfig,
  WhatsAppConfig,
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
        <>
          <SelectField
            label="Rythme"
            value={CRON_PRESETS.some((p) => p.value === cron) ? cron : ""}
            onValueChange={onCron}
            emptyLabel="Expression sur mesure"
            options={CRON_PRESETS}
          />
          <TextField
            label="Expression cron"
            value={cron}
            onChange={(event) => onCron(event.target.value)}
            hint={describeCron(cron) === cron ? "Cinq champs : min h jour mois jour-semaine" : describeCron(cron)}
            className="font-mono text-xs"
          />
          <TextField
            label="Fuseau horaire"
            value={timeZone}
            onChange={(event) => onTimeZone(event.target.value)}
            hint="« 18h » ne veut rien dire sans dire où."
          />
        </>
      )}

      {node.type === "calendar_digest" && (
        <DigestFields
          config={node.config as unknown as DigestConfig}
          calendars={calendars}
          set={set}
        />
      )}

      {node.type === "whatsapp" && (
        <WhatsAppFields config={node.config as unknown as WhatsAppConfig} set={set} />
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

function WhatsAppFields({
  config,
  set,
}: {
  config: WhatsAppConfig;
  set: (patch: Partial<WhatsAppConfig>) => void;
}) {
  return (
    <>
      <TextField
        label="Numéro de destination"
        required
        value={config.to ?? ""}
        onChange={(event) => set({ to: event.target.value })}
        placeholder="06 62 46 48 67"
        hint="Format libre : l'indicatif est ajouté à l'envoi."
      />

      <SelectField
        label="Type d'envoi"
        value={config.mode ?? "texte"}
        onValueChange={(value) => set({ mode: value as WhatsAppConfig["mode"] })}
        options={[
          { value: "texte", label: "Texte libre" },
          { value: "modele", label: "Modèle approuvé" },
        ]}
      />

      {config.mode === "modele" ? (
        <>
          <TextField
            label="Nom du modèle"
            required
            value={config.template ?? ""}
            onChange={(event) => set({ template: event.target.value })}
            placeholder="recap_agenda"
          />
          <TextField
            label="Langue du modèle"
            value={config.language ?? "fr"}
            onChange={(event) => set({ language: event.target.value })}
          />
          <p className="text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 text-[11px] leading-relaxed">
            Le message ci-dessous devient le <strong>premier paramètre</strong> du
            modèle. Meta refusant les sauts de ligne dans un paramètre, ils sont
            remplacés par des séparateurs à l&apos;envoi.
          </p>
        </>
      ) : (
        <p className="text-warning bg-warning-soft/50 rounded-lg px-3 py-2 text-[11px] leading-relaxed">
          Le texte libre n&apos;est accepté que dans les 24 h suivant un message
          du destinataire. Pour un envoi programmé, il faut un modèle approuvé
          par Meta — sinon l&apos;automatisation marchera à l&apos;essai et
          échouera le lendemain à 18 h.
        </p>
      )}

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
    </>
  );
}
