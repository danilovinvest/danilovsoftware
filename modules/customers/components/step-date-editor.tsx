"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateField } from "@/shared/ui/date-time-field";

/**
 * Ce qu'une date de jalon affirme.
 *
 * `past` — le jour où c'est arrivé : aujourd'hui proposé, jamais imposé, parce
 * qu'on rattrape souvent l'étape de la semaine passée. `booking` — un chantier
 * qu'on réserve, pour dans six semaines : le lundi qui vient est proposé.
 */
export type StepDateMode = "past" | "booking";

const MOTS: Record<StepDateMode, { champ: string; poser: string; changer: string; heure: string }> = {
  past: { champ: "Fait le", poser: "Marquer franchi", changer: "Changer la date", heure: "12:00" },
  booking: { champ: "Date de démarrage", poser: "Réserver", changer: "Changer", heure: "08:00" },
};

type EditorProps = {
  /** La date posée, ou rien. */
  value: string | null;
  mode?: StepDateMode;
  /** Où va l'écriture, dit avant le clic. */
  note?: string;
  pending?: boolean;
  /** Écrit la date, ou la retire (`null`). Le panneau se ferme une fois fait. */
  onPick: (at: string | null) => unknown;
  onClose?: () => void;
};

/**
 * La date d'un jalon : **une** saisie pour la frise et l'après-signature.
 *
 * Le cran de la frise faisait saisir sa date dans un champ natif, avec
 * « Marquer franchi » ; la ligne de l'après-signature posait la date du jour
 * d'un clic (« Marquer fait »), ou ouvrait un calendrier pour trois de ses
 * lignes, et « Annuler » y voulait dire « Retirer ». Deux écrans pour un même
 * fait, trois gestes et quatre mots. Il n'en reste qu'un : le même calendrier,
 * les mêmes boutons, où qu'on l'ouvre.
 */
export function StepDateEditor({
  value,
  mode = "past",
  note,
  pending,
  onPick,
  onClose,
}: EditorProps) {
  const mots = MOTS[mode];
  // Le brouillon part de la date posée : on vient corriger, pas resaisir.
  const [draft, setDraft] = useState(
    () => value?.slice(0, 10) ?? (mode === "booking" ? lundiProchain() : aujourdhui()),
  );

  async function poser(at: string | null) {
    await onPick(at);
    onClose?.();
  }

  return (
    <div className="flex flex-col gap-3" data-demo="step-date-editor">
      <DateField label={mots.champ} value={draft} onChange={setDraft} />
      {note && <p className="text-muted-foreground/70 text-[11px]">{note}</p>}
      <div className="flex items-center justify-end gap-2">
        {value !== null && (
          <Button
            size="xs"
            variant="ghost"
            className="mr-auto"
            disabled={pending}
            onClick={() => void poser(null)}
          >
            Retirer
          </Button>
        )}
        <Button
          size="xs"
          disabled={pending || draft === ""}
          onClick={() => void poser(new Date(`${draft}T${mots.heure}:00`).toISOString())}
        >
          {value === null ? mots.poser : mots.changer}
        </Button>
      </div>
    </div>
  );
}

/**
 * La même saisie, ouverte depuis une ligne — l'après-signature, la fiche d'un
 * chantier. Le panneau porte le nom du jalon, comme celui du cran.
 */
export function StepDateButton({
  title,
  disabled,
  ...editor
}: EditorProps & { title: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const booking = editor.mode === "booking";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="xs"
          variant={editor.value ? "ghost" : booking ? "default" : "outline"}
          disabled={disabled}
        >
          {editor.value ? "Modifier" : booking ? "Réserver une date" : MOTS.past.poser}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">{title}</p>
          <StepDateEditor
            // Remonté quand la date change : le brouillon repart de la valeur.
            key={editor.value ?? "vide"}
            {...editor}
            pending={editor.pending || disabled}
            onClose={() => setOpen(false)}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Le jour local : `toISOString` rendrait la veille entre minuit et deux heures. */
function aujourdhui(): string {
  const at = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
}

/** Un chantier démarre un lundi. C'est le défaut le moins surprenant. */
function lundiProchain(): string {
  const at = new Date();
  at.setDate(at.getDate() + ((8 - at.getDay()) % 7 || 7));
  return at.toISOString().slice(0, 10);
}
