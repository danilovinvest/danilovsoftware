"use client";

import { useEffect, useState } from "react";
import { CheckIcon, ClockIcon, TriangleAlertIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { TimeField } from "@/shared/ui/date-time-field";
import { SelectField, TextField } from "@/shared/ui/form";
import { errorMessage } from "@/shared/api/errors";
import { previewCron } from "../lib/api";
import {
  WEEKDAY_LABELS,
  WEEK_ORDER,
  describeCron,
  readCron,
  writeCron,
  type Rhythm,
} from "../lib/cron";

/**
 * Le rythme d'une automatisation.
 *
 * Une expression cron est un objet illisible : « 0 18 * * 1-5 » ne se vérifie
 * pas à l'œil, et la saisir à l'aveugle est le meilleur moyen d'attendre en
 vain un message le lendemain. Trois formes couvrent ce qu'on veut vraiment —
 * chaque jour, certains jours, chaque mois — et se règlent sans connaître la
 * syntaxe. L'expression reste visible et modifiable pour le reste.
 *
 * **Changer de forme ne perd jamais rien** : passer en « expression » garde
 * celle qu'on avait, au lieu de vider le champ comme le faisait la liste
 * déroulante qu'il remplace.
 *
 * L'aperçu vient du serveur, avec l'analyseur de la boucle de déclenchement et
 * dans le fuseau demandé. Voir les trois prochaines dates lève le doute d'un
 * coup — et surtout le bon, celui du fuseau, qu'on ne remarquerait qu'en
 * juillet.
 */
const RHYTHMS: Array<{ value: Rhythm; label: string }> = [
  { value: "quotidien", label: "Chaque jour" },
  { value: "jours", label: "Certains jours" },
  { value: "mensuel", label: "Chaque mois" },
  { value: "expression", label: "Expression" },
];

export function ScheduleFields({
  cron,
  timeZone,
  onCron,
  onTimeZone,
}: {
  cron: string;
  timeZone: string;
  onCron: (value: string) => void;
  onTimeZone: (value: string) => void;
}) {
  // La forme est déduite de l'expression au montage, puis pilotée par
  // l'utilisateur : la redéduire à chaque frappe ferait sauter l'éditeur
  // visuel dès qu'une expression intermédiaire cesse d'être reconnaissable.
  const [schedule, setSchedule] = useState(() => readCron(cron));
  const preview = usePreview(cron, timeZone);

  function apply(patch: Partial<typeof schedule>) {
    const next = { ...schedule, ...patch };
    setSchedule(next);
    onCron(writeCron(next, cron));
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label className="text-muted-foreground text-xs font-medium">Rythme</Label>
        <div className="bg-muted grid grid-cols-2 gap-0.5 rounded-md p-0.5">
          {RHYTHMS.map((rhythm) => (
            <button
              key={rhythm.value}
              type="button"
              onClick={() => apply({ rhythm: rhythm.value })}
              aria-pressed={schedule.rhythm === rhythm.value}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] transition-colors",
                schedule.rhythm === rhythm.value
                  ? "bg-background text-foreground font-medium shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {rhythm.label}
            </button>
          ))}
        </div>
      </div>

      {schedule.rhythm !== "expression" && (
        <TimeField
          label="Heure"
          value={schedule.time}
          onChange={(time) => apply({ time })}
        />
      )}

      {schedule.rhythm === "jours" && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-muted-foreground text-xs font-medium">Jours</Label>
          <div className="flex gap-1">
            {WEEK_ORDER.map((day) => {
              const on = schedule.weekdays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={on}
                  aria-label={WEEKDAY_LABELS[day]}
                  onClick={() =>
                    apply({
                      weekdays: on
                        ? schedule.weekdays.filter((value) => value !== day)
                        : [...schedule.weekdays, day],
                    })
                  }
                  className={cn(
                    "size-7 rounded-full text-[11px] font-medium transition-colors",
                    on
                      ? "bg-brand text-white"
                      : "bg-muted text-muted-foreground hover:bg-accent",
                  )}
                >
                  {WEEKDAY_LABELS[day]}
                </button>
              );
            })}
          </div>
          {schedule.weekdays.length === 0 && (
            <p className="text-warning text-[11px]">
              Aucun jour coché : l&apos;automatisation partirait tous les jours.
            </p>
          )}
        </div>
      )}

      {schedule.rhythm === "mensuel" && (
        <SelectField
          label="Jour du mois"
          value={String(schedule.monthday)}
          onValueChange={(value) => apply({ monthday: Number(value) })}
          options={Array.from({ length: 31 }, (_, index) => ({
            value: String(index + 1),
            label: index === 0 ? "Le 1er" : `Le ${index + 1}`,
          }))}
          hint={
            schedule.monthday > 28
              ? "Les mois plus courts sont sautés — l'aperçu ci-dessous le montre."
              : undefined
          }
        />
      )}

      {schedule.rhythm === "expression" ? (
        <TextField
          label="Expression cron"
          value={cron}
          onChange={(event) => onCron(event.target.value)}
          placeholder="0 18 * * 1-5"
          hint="minute · heure · jour du mois · mois · jour de la semaine"
          className="font-mono text-xs"
        />
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-[11px]">Expression</span>
          <code className="bg-muted rounded-sm px-1.5 py-0.5 font-mono text-[10px]">
            {cron}
          </code>
        </div>
      )}

      <TextField
        label="Fuseau horaire"
        value={timeZone}
        onChange={(event) => onTimeZone(event.target.value)}
        hint="« 18h » ne veut rien dire sans dire où."
      />

      <Preview state={preview} cron={cron} />
    </>
  );
}

/* --- L'aperçu ---------------------------------------------------------------
 *
 * Interrogé après une courte pause : une requête par caractère tapé rendrait
 * l'expression invalide neuf fois sur dix pendant la frappe, et l'écran
 * clignoterait en rouge à chaque touche.
 */

type PreviewState =
  | { status: "attente" }
  | { status: "erreur"; message: string }
  | { status: "prêt"; next: string[] };

function usePreview(cron: string, timeZone: string): PreviewState {
  const empty = cron.trim() === "";
  const key = `${cron}|${timeZone}`;
  // Même forme que partout ailleurs : la réponse est rangée avec la question
  // qui l'a produite. « En cours de vérification » s'en déduit, au lieu d'être
  // posé dans l'effet — et une réponse lente ne peut pas écraser la plus
  // récente pendant qu'on tape.
  const [resolved, setResolved] = useState<{ key: string; state: PreviewState }>({
    key: "",
    state: { status: "attente" },
  });

  useEffect(() => {
    if (empty) return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      previewCron(cron, timeZone, controller.signal)
        .then((data) =>
          setResolved({
            key,
            state: data.valid
              ? { status: "prêt", next: data.next }
              : { status: "erreur", message: data.error ?? "Expression invalide." },
          }),
        )
        .catch((cause) => {
          if (controller.signal.aborted) return;
          setResolved({ key, state: { status: "erreur", message: errorMessage(cause) } });
        });
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [key, cron, timeZone, empty]);

  if (empty) {
    return { status: "erreur", message: "Expression vide : rien ne se déclenchera." };
  }
  return resolved.key === key ? resolved.state : { status: "attente" };
}

const occurrence = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

function Preview({ state, cron }: { state: PreviewState; cron: string }) {
  if (state.status === "erreur") {
    return (
      <p className="text-danger bg-danger-soft/40 flex items-start gap-1.5 rounded-lg px-3 py-2 text-[11px] leading-relaxed">
        <TriangleAlertIcon className="mt-px size-3.5 shrink-0" />
        <span>{state.message}</span>
      </p>
    );
  }

  if (state.status === "attente") {
    return (
      <p className="text-muted-foreground/70 text-[11px]">Vérification…</p>
    );
  }

  return (
    <div className="bg-muted/40 flex flex-col gap-1 rounded-lg px-3 py-2">
      <p className="text-success flex items-center gap-1.5 text-[11px] font-medium">
        <CheckIcon className="size-3.5" />
        <span className="first-letter:uppercase">{describeCron(cron)}</span>
      </p>
      {state.next.length === 0 ? (
        <p className="text-warning text-[11px]">
          Aucune occurrence à venir : cette expression ne se produira jamais.
        </p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {state.next.slice(0, 3).map((date) => (
            <li
              key={date}
              className="text-muted-foreground flex items-center gap-1.5 text-[11px]"
            >
              <ClockIcon className="size-3 shrink-0 opacity-50" />
              <span className="first-letter:uppercase">
                {occurrence.format(new Date(date))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
