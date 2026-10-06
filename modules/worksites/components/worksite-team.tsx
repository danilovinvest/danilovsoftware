"use client";

import { AlertTriangleIcon, UserRoundXIcon } from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useColleagues } from "@/shared/hooks/use-colleagues";
import { EmptyState } from "@/shared/ui/feedback";
import { projectReference } from "@/modules/customers";
import { ROLE_LABEL, teamLoad } from "../lib/team";
import type { ReadWorksite } from "../lib/types";

/**
 * La vue Équipe de l'écran Études : chaque personne et ce qui attend son geste.
 *
 * Une colonne par personne, la plus chargée d'abord, et « Sans intervenant » en
 * tête quand un dossier attend un rôle que personne ne tient — c'est la liste à
 * vider en premier. Le nombre en grand est la charge ; les retards se comptent
 * à côté, parce qu'un ingénieur à quatre dossiers dont deux en retard n'est
 * pas un ingénieur à quatre dossiers.
 */
export function WorksiteTeam({
  reads,
  onSelect,
}: {
  reads: ReadWorksite[];
  onSelect: (id: string) => void;
}) {
  const colleagues = useColleagues();
  const team = useMemo(
    // L'annuaire vide est un annuaire pas encore lu : l'appelant y figure
    // toujours. Dire « Compte inconnu » pendant ce temps faisait croire à des
    // comptes désactivés.
    () =>
      teamLoad(
        reads,
        new Map(colleagues.map((c) => [c.id, c.name])),
        colleagues.length === 0 ? "…" : undefined,
      ),
    [reads, colleagues],
  );

  if (team.length === 0) {
    return (
      <EmptyState
        title="Aucune étude en production"
        description="Une étude apparaît ici dès que son acompte est encaissé, chez la personne qui doit agir."
      />
    );
  }

  return (
    <div
      className="grid auto-cols-[minmax(15rem,1fr)] grid-flow-col gap-3 overflow-x-auto pb-1"
      data-demo="etudes-equipe"
    >
      {team.map((member) => (
        <section key={member.id ?? "sans"} className="flex min-w-0 flex-col gap-2">
          <header
            className={cn(
              "flex items-center justify-between gap-2 rounded-lg px-2 py-1.5",
              member.id === null ? "bg-warning-soft text-warning" : "bg-muted",
            )}
          >
            <span className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
              {member.id === null && <UserRoundXIcon className="size-4 shrink-0" />}
              <span className="truncate">{member.name}</span>
            </span>
            <span className="flex items-baseline gap-2">
              {member.late > 0 && (
                <span className="text-danger flex items-center gap-0.5 text-[11px] font-semibold">
                  <AlertTriangleIcon className="size-3" />
                  {member.late} en retard
                </span>
              )}
              <span className="text-lg font-bold tabular-nums">{member.items.length}</span>
            </span>
          </header>
          <ul className="flex flex-col gap-1.5">
            {member.items.map(({ read, role, todo }) => (
              <li key={read.worksite.id}>
                <button
                  type="button"
                  onClick={() => onSelect(read.worksite.id)}
                  className={cn(
                    "bg-card hover:bg-accent/40 flex w-full flex-col gap-0.5 rounded-lg border border-l-4 px-2.5 py-2 text-left shadow-2xs transition-colors",
                    read.deadline?.late ? "border-l-danger" : "border-l-info",
                  )}
                >
                  <span className="truncate text-[13px] font-semibold">{read.worksite.customer_name}</span>
                  <span className="text-muted-foreground truncate text-[11px]">
                    {projectReference(read.worksite.reference, "etudes")} · {read.worksite.label}
                  </span>
                  <span className="text-[11px] font-medium">{todo}</span>
                  {member.id === null && (
                    <span className="text-warning text-[11px]">Aucun {ROLE_LABEL[role]} posé</span>
                  )}
                  {read.deadline && (
                    <span
                      className={cn(
                        "text-[11px]",
                        read.deadline.late ? "text-danger font-semibold" : "text-muted-foreground",
                      )}
                    >
                      {read.deadline.label}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
