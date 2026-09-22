"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DateField } from "@/shared/ui/date-time-field";
import { ErrorNotice } from "@/shared/ui/feedback";
import { TextField } from "@/shared/ui/form";
import { cn } from "@/lib/utils";
import { useAction } from "../hooks/use-customers";
import * as api from "../lib/api";
import { PROJECT_OUTCOME } from "../lib/labels";
import type { Project, ProjectOutcome } from "../lib/types";

/**
 * Refus et report — deux gestes, deux boutons, deux mots clairs.
 *
 * L'écran précédent proposait « Signaler un blocage », qui ne dit pas ce qu'on
 * fait, et rangeait sous le même geste une affaire perdue et une affaire
 * décalée. Ce sont pourtant deux choses opposées : la première ne reviendra
 * pas, la seconde reviendra — et c'est exactement la distinction que le
 * dirigeant tient à garder, « le prospect n'est pas perdu ».
 *
 * La fiche reste prospect dans les deux cas : c'est l'affaire qui se ferme,
 * jamais la relation. Un client qui a dit non sur une trémie rappelle six mois
 * plus tard pour une véranda.
 */

type Mode = "refuse" | "postpone";

/** Les issues qui closent : l'affaire ne reprendra pas d'elle-même. */
const CLOSING: ProjectOutcome[] = ["sans_suite", "concurrence", "refuse_par_nous", "transfere"];

/** Les issues qui suspendent : l'affaire attend quelque chose ou quelqu'un. */
const PAUSING: ProjectOutcome[] = ["stand_by", "bloque_tiers"];

const NOTE_HINT: Partial<Record<ProjectOutcome, string>> = {
  transfere: "Le confrère à qui vous avez orienté le client",
  concurrence: "Le bureau retenu, si vous le savez",
  bloque_tiers: "Le tiers attendu : géotechnicien, architecte, syndic…",
  stand_by: "Ce que le client attend pour reprendre",
  refuse_par_nous: "Pourquoi vous n'avez pas donné suite",
  sans_suite: "Ce qu'il a dit, ou son silence",
};

export function OutcomeDialog({
  project,
  mode,
  open,
  onOpenChange,
  onSaved,
  onScheduleResume,
}: {
  project: Project;
  mode: Mode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  /** Pose le rappel de reprise. Le dialogue ne sait pas comment, seulement quand. */
  onScheduleResume: (date: string, outcome: ProjectOutcome, note: string) => void;
}) {
  const choices = mode === "refuse" ? CLOSING : PAUSING;
  const [outcome, setOutcome] = useState<ProjectOutcome>(choices[0]);
  const [note, setNote] = useState(project.outcome_note);
  const [resumeAt, setResumeAt] = useState(() => defaultResume());

  const save = useAction(() =>
    api.setProjectStage(project.id, {
      // L'étape ne bouge pas. Une affaire refusée au stade du devis reste une
      // affaire arrivée au devis : la faire reculer effacerait le travail fait,
      // et fausserait le jour où elle repart.
      stage: project.stage,
      outcome,
      outcome_note: note.trim(),
    }),
    { inline: true },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "refuse" ? "Affaire non aboutie" : "Reporter l'affaire"}
          </DialogTitle>
          <DialogDescription>
            {mode === "refuse"
              ? "L'affaire se ferme, la fiche reste. Tout l'historique est conservé si le client revient."
              : "L'affaire se met en pause et reviendra à la date que vous choisissez."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground text-xs font-medium">
              {mode === "refuse" ? "Pourquoi n'aboutit-elle pas ?" : "Qu'est-ce qui la retarde ?"}
            </span>
            <div className={cn("grid gap-1.5", mode === "refuse" ? "sm:grid-cols-2" : "sm:grid-cols-2")}>
              {choices.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setOutcome(key)}
                  className={cn(
                    "rounded-md border px-2.5 py-2 text-left text-xs transition-colors",
                    outcome === key
                      ? "border-primary bg-primary/5 font-medium"
                      : "hover:bg-muted/50 border-border",
                  )}
                >
                  {PROJECT_OUTCOME[key].label}
                </button>
              ))}
            </div>
          </div>

          <TextField
            label="Précision"
            value={note}
            placeholder={NOTE_HINT[outcome] ?? "Ce qu'il faut se rappeler"}
            hint="Elle s'affiche sur l'affaire et dans la liste des fiches."
            onChange={(event) => setNote(event.target.value)}
          />

          {mode === "postpone" && (
            <DateField
              label="Revenir sur l'affaire le"
              value={resumeAt}
              onChange={setResumeAt}
              hint="Une tâche sera créée à cette date. Sans elle, une affaire reportée s'oublie."
            />
          )}

          {save.error && <ErrorNotice message={save.error} />}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            variant={mode === "refuse" ? "destructive" : "default"}
            disabled={save.pending}
            onClick={async () => {
              if (!(await save.run())) return;
              if (mode === "postpone" && resumeAt) {
                onScheduleResume(resumeAt, outcome, note.trim());
              }
              onOpenChange(false);
              onSaved();
            }}
          >
            {mode === "refuse" ? "Clore l'affaire" : "Reporter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Trois semaines : le délai au bout duquel une affaire tiède mérite un rappel. */
function defaultResume(): string {
  const at = new Date();
  at.setDate(at.getDate() + 21);
  return at.toISOString().slice(0, 10);
}
