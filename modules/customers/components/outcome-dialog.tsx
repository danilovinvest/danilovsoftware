"use client";

import { useState } from "react";
import { OctagonXIcon, PauseIcon, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { TextAreaField } from "@/shared/ui/form";
import { cn } from "@/lib/utils";
import { useAction } from "../hooks/use-customers";
import * as api from "../lib/api";
import { PROJECT_OUTCOME } from "../lib/labels";
import type { Project, ProjectOutcome } from "../lib/types";

/**
 * Arrêter ou mettre en pause — un seul geste, deux réponses, et une raison.
 *
 * Deux choses opposées : une affaire en pause reviendra, une affaire arrêtée
 * ne reviendra pas d'elle-même. C'est la distinction que le dirigeant tient à
 * garder, « le prospect n'est pas perdu » — d'où le choix posé **en premier**,
 * avant la raison, et un bouton final qui dit exactement ce qu'il fait.
 *
 * La même boîte sert la frise (« Arrêter ou mettre en pause », aucun choix
 * d'avance) et « à faire maintenant » (« Refusé » ouvre sur l'arrêt, « Reporté »
 * sur la pause). Elle n'écrit qu'à un endroit : l'issue et sa note, par la route
 * d'étape, l'étape restant celle qu'elle était.
 *
 * La fiche reste prospect dans les deux cas : c'est l'affaire qui se ferme,
 * jamais la relation. Un client qui a dit non sur une trémie rappelle six mois
 * plus tard pour une véranda.
 */

export type HaltMode = "stop" | "pause";

/** Les issues de vente qui closent : l'affaire ne reprendra pas d'elle-même. */
const CLOSING_SALES: ProjectOutcome[] = ["sans_suite", "concurrence", "refuse_par_nous", "transfere"];

/** Les issues qui suspendent : l'affaire attend quelque chose ou quelqu'un. */
const PAUSING: ProjectOutcome[] = ["stand_by", "bloque_tiers"];

/**
 * Une affaire signée qui s'arrête n'est pas une vente ratée : `arrete` vient
 * en tête, et c'est le choix proposé d'avance. Avant la signature, il n'a pas
 * de sens — on n'arrête pas un chantier qui n'a pas commencé.
 */
function closingFor(project: Project): ProjectOutcome[] {
  const signed = project.stage === "gagne" || project.stage === "realise";
  return signed ? ["arrete", ...CLOSING_SALES] : CLOSING_SALES;
}

/** Les libellés d'une pause, dits comme on les dit au téléphone. */
const PAUSE_LABEL: Partial<Record<ProjectOutcome, string>> = {
  stand_by: "Reporté par le client",
  bloque_tiers: "En attente d'un tiers",
};

const NOTE_HINT: Partial<Record<ProjectOutcome, string>> = {
  arrete: "Ce qui a arrêté le chantier : client, financement, découverte sur site…",
  transfere: "Le confrère à qui vous avez orienté le client",
  concurrence: "Le bureau retenu, si vous le savez",
  bloque_tiers: "Le tiers attendu : géotechnicien, architecte, syndic…",
  stand_by: "Ce que le client attend pour reprendre",
  refuse_par_nous: "Pourquoi vous n'avez pas donné suite",
  sans_suite: "Ce qu'il a dit, ou son silence",
};

const MODES: { mode: HaltMode; label: string; detail: string; icon: LucideIcon }[] = [
  { mode: "pause", label: "Mettre en pause", detail: "Elle reprendra", icon: PauseIcon },
  { mode: "stop", label: "Arrêter", detail: "Elle se ferme", icon: OctagonXIcon },
];

export function OutcomeDialog({
  project,
  mode: initialMode,
  open,
  onOpenChange,
  onSaved,
  onScheduleResume,
}: {
  project: Project;
  /** Nul depuis la frise : c'est à la personne de choisir, pas à l'écran. */
  mode: HaltMode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  /**
   * Pose le rappel de reprise. Le dialogue ne sait pas comment, seulement quand.
   * Rend `null` si tout est posé, sinon ce qui a échoué.
   */
  onScheduleResume: (date: string, outcome: ProjectOutcome, note: string) => Promise<string | null>;
}) {
  const [mode, setMode] = useState<HaltMode | null>(initialMode);
  const [outcome, setOutcome] = useState<ProjectOutcome | null>(
    initialMode === null ? null : defaultOutcome(initialMode, project),
  );
  const [note, setNote] = useState(project.outcome_note);
  const [remind, setRemind] = useState(true);
  const [resumeAt, setResumeAt] = useState(() => defaultResume());
  const [rappel, setRappel] = useState<string | null>(null);
  const [posant, setPosant] = useState(false);

  const choices = mode === "stop" ? closingFor(project) : PAUSING;
  const raison = note.trim();
  // Un arrêt sans raison ne se relit pas : dans six mois, personne ne saura
  // pourquoi ce chantier signé s'est interrompu.
  const manque = mode === "stop" && raison === "";

  const save = useAction(
    () =>
      api.setProjectStage(project.id, {
        // L'étape ne bouge pas. Une affaire arrêtée au stade du chantier reste
        // une affaire arrivée au chantier : la faire reculer effacerait le
        // travail fait, et fausserait le jour où elle repart.
        stage: project.stage,
        outcome,
        outcome_note: raison,
      }),
    { inline: true },
  );

  function choose(next: HaltMode) {
    setMode(next);
    setOutcome(defaultOutcome(next, project));
  }

  async function submit() {
    if (!mode || !outcome || manque) return;
    setRappel(null);
    if (!(await save.run())) return;
    /*
      Le rappel est attendu, et son échec se dit. Il partait sans attendre et
      avalait son erreur : on croyait qu'une tâche de reprise existait, et
      l'affaire reportée s'oubliait.
    */
    if (mode === "pause" && remind && resumeAt) {
      setPosant(true);
      const echec = await onScheduleResume(resumeAt, outcome, raison);
      setPosant(false);
      if (echec) {
        setRappel(echec);
        onSaved();
        return;
      }
    }
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-demo="arret-dialog">
        <DialogHeader>
          <DialogTitle>Arrêter ou mettre en pause</DialogTitle>
          <DialogDescription>
            « {project.label} » — choisissez d&apos;abord ce qui arrive à l&apos;affaire, puis
            dites pourquoi.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" data-demo="arret-choix">
            {MODES.map(({ mode: key, label, detail, icon: Icon }) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={mode === key}
                onClick={() => choose(key)}
                className={cn(
                  "flex items-center gap-2.5 rounded-md border px-3 py-2.5 text-left transition-colors",
                  mode === key
                    ? key === "stop"
                      ? "border-danger bg-danger-soft text-danger"
                      : "border-warning bg-warning-soft text-warning"
                    : "border-border hover:bg-muted/50",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="flex flex-col">
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-xs opacity-80">{detail}</span>
                </span>
              </button>
            ))}
          </div>

          {mode && (
            <>
              <div className="flex flex-col gap-1.5" data-demo="arret-raison">
                <span className="text-muted-foreground text-xs font-medium">
                  {mode === "stop" ? "Pourquoi s'arrête-t-elle ?" : "Qu'est-ce qui la retarde ?"}
                </span>
                <div className="grid gap-1.5 sm:grid-cols-2">
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
                      {(mode === "pause" && PAUSE_LABEL[key]) || PROJECT_OUTCOME[key].label}
                    </button>
                  ))}
                </div>
              </div>

              <TextAreaField
                label={mode === "stop" ? "Raison (obligatoire)" : "Raison"}
                value={note}
                className="min-h-20"
                placeholder={(outcome && NOTE_HINT[outcome]) || "Ce qu'il faut se rappeler"}
                hint="Elle s'affiche sur la frise et dans la liste des fiches."
                onChange={(event) => setNote(event.target.value)}
              />

              {mode === "pause" && (
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={remind} onCheckedChange={(value) => setRemind(value === true)} />
                    Me rappeler de reprendre l&apos;affaire
                  </label>
                  {remind && (
                    <DateField
                      label="Revenir sur l'affaire le"
                      value={resumeAt}
                      onChange={setResumeAt}
                      hint="Une tâche sera créée à cette date. Sans elle, une affaire en pause s'oublie."
                    />
                  )}
                </div>
              )}

              {mode === "stop" && (
                <p className="bg-danger-soft text-danger rounded-md px-3 py-2 text-xs">
                  L&apos;affaire se ferme : elle quitte les listes de travail — chantiers, études,
                  mes dossiers — et sa frise s&apos;arrête au cran courant. La fiche, les devis et
                  l&apos;historique restent, et « Reprendre » la rouvre telle qu&apos;elle était.
                </p>
              )}
            </>
          )}

          {save.error && <ErrorNotice message={save.error} />}
          {rappel && <ErrorNotice message={rappel} />}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            variant={mode === "stop" ? "destructive" : "default"}
            disabled={!mode || !outcome || manque || save.pending || posant}
            title={manque ? "Donnez la raison de l'arrêt" : undefined}
            onClick={() => void submit()}
          >
            {mode === "stop" ? "Arrêter l'affaire" : "Mettre en pause"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function defaultOutcome(mode: HaltMode, project: Project): ProjectOutcome {
  return mode === "stop" ? closingFor(project)[0] : PAUSING[0];
}

/** Trois semaines : le délai au bout duquel une affaire tiède mérite un rappel. */
function defaultResume(): string {
  const at = new Date();
  at.setDate(at.getDate() + 21);
  return at.toISOString().slice(0, 10);
}
