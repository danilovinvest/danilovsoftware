"use client";

import { useState } from "react";
import { CheckIcon, FlaskConicalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateField } from "@/shared/ui/date-time-field";
import { formatDate } from "@/shared/lib/format";
import { cn } from "@/lib/utils";
import { JALON_ORDER, type Jalons } from "../lib/jalons";

/**
 * L'après-signature : ce qui sépare un devis signé d'un chantier qui démarre.
 *
 * Six jalons, dans l'ordre où ils arrivent. Deux sont réels — l'acompte facturé
 * et l'acompte encaissé se lisent sur le devis. Les quatre autres n'ont pas
 * encore de colonne en base et le disent, plutôt que de faire croire qu'ils
 * sont suivis.
 *
 * « Date de chantier » se distingue des cinq autres : elle ne se coche pas, elle
 * se choisit. Cocher poserait la date du jour, alors qu'on réserve un chantier
 * pour dans six semaines. C'est aussi le seul jalon qui alerte quand il manque,
 * parce que c'est là que tout attend.
 */
export function ProjectJalons({
  jalons,
  onToggle,
  disabled,
  className,
}: {
  jalons: Jalons;
  onToggle: (key: keyof Jalons, value: string | null) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <ol className="flex flex-col">
        {JALON_ORDER.map((jalon, index) => {
          const at = jalons[jalon.key];
          const done = at !== null;
          const last = index === JALON_ORDER.length - 1;
          // Le premier jalon non atteint est celui qui bloque la suite : lui
          // seul se met en avant, sans quoi six lignes réclameraient à la fois.
          const blocking =
            !done && JALON_ORDER.slice(0, index).every((prev) => jalons[prev.key] !== null);

          return (
            <li key={jalon.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                    done
                      ? "bg-success border-success"
                      : blocking
                        ? "border-warning bg-warning/10"
                        : "border-border",
                  )}
                >
                  {done && <CheckIcon className="text-background size-3" strokeWidth={4} />}
                </span>
                {!last && (
                  <span className={cn("w-0.5 flex-1", done ? "bg-success" : "bg-border")} />
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 pb-4">
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      "flex items-center gap-1.5 text-sm",
                      done ? "text-foreground" : blocking ? "text-warning font-medium" : "text-muted-foreground",
                    )}
                  >
                    {jalon.label}
                    {!jalon.real && (
                      <FlaskConicalIcon
                        className="text-muted-foreground/50 size-3"
                        aria-label="Jalon simulé : pas encore en base"
                      />
                    )}
                  </div>
                  <div className="text-muted-foreground/70 text-xs">
                    {done ? formatDate(at) : jalon.hint}
                  </div>
                </div>

                {jalon.picks ? (
                  <DatePickerButton
                    value={at}
                    disabled={disabled}
                    onPick={(value) => onToggle(jalon.key, value)}
                  />
                ) : (
                  <Button
                    size="xs"
                    variant={done ? "ghost" : "outline"}
                    disabled={disabled}
                    onClick={() => onToggle(jalon.key, done ? null : new Date().toISOString())}
                  >
                    {done ? "Annuler" : "Marquer fait"}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="text-muted-foreground/70 flex items-start gap-1.5 text-xs">
        <FlaskConicalIcon className="mt-0.5 size-3 shrink-0" />
        <span>
          L&apos;acompte est lu du devis. Les jalons marqués d&apos;une fiole n&apos;ont pas
          encore de colonne en base : ce que vous cochez vit le temps de la session.
        </span>
      </p>
    </div>
  );
}

function DatePickerButton({
  value,
  disabled,
  onPick,
}: {
  value: string | null;
  disabled?: boolean;
  onPick: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => value?.slice(0, 10) ?? nextMonday());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="xs" variant={value ? "ghost" : "default"} disabled={disabled}>
          {value ? "Changer" : "Réserver une date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="flex flex-col gap-3">
          <DateField label="Date de démarrage" value={draft} onChange={setDraft} />
          <div className="flex justify-between gap-2">
            {value && (
              <Button
                size="xs"
                variant="ghost"
                onClick={() => {
                  onPick(null);
                  setOpen(false);
                }}
              >
                Retirer
              </Button>
            )}
            <Button
              size="xs"
              className="ml-auto"
              onClick={() => {
                onPick(new Date(`${draft}T08:00:00`).toISOString());
                setOpen(false);
              }}
            >
              Réserver
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Un chantier démarre un lundi. C'est le défaut le moins surprenant. */
function nextMonday(): string {
  const at = new Date();
  at.setDate(at.getDate() + ((8 - at.getDay()) % 7 || 7));
  return at.toISOString().slice(0, 10);
}
