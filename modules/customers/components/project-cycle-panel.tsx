"use client";

import { ListOrderedIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CyclePoint, Metier } from "../lib/cycle";
import { ProjectCycle, type CycleEdit } from "./project-cycle";

const TITRE: Record<Metier, string> = {
  etudes: "OMPT STRUCTURE · étude",
  travaux: "OMPT GROUPE · travaux",
};

/**
 * La frise d'une affaire ouverte, et sa jumelle quand deux sociétés y
 * travaillent.
 *
 * La frise se coche ici, et seulement ici : c'est le seul écran où l'affaire
 * est ouverte, donc le seul où l'on sait de quelle affaire on parle.
 *
 * Le même chantier peut porter l'étude de STRUCTURE et les travaux de GROUPE —
 * mesuré le 17/09 : neuf affaires. La seconde frise se **lit seulement** :
 * cocher un cran écrit sur le devis porteur, qui appartient à l'une des deux
 * sociétés, et rendre les deux cliquables ferait écrire l'acompte de GROUPE sur
 * un devis de STRUCTURE sans que rien ne le dise.
 */
export function ProjectCyclePanel({
  points,
  pointsSecond,
  metier,
  canOrder,
  onOrder,
  edit,
}: {
  points: CyclePoint[];
  /** La frise de l'autre société, nulle quand une seule y travaille. */
  pointsSecond: CyclePoint[] | null;
  metier: Metier;
  /** L'ordre des crans est un réglage de l'entreprise, réservé à l'administration. */
  canOrder: boolean;
  onOrder: () => void;
  edit: CycleEdit | undefined;
}) {
  const autre: Metier = metier === "etudes" ? "travaux" : "etudes";

  return (
    <>
      <div data-demo="project-cycle">
        {(pointsSecond || canOrder) && (
          <div className="mb-1.5 flex items-center gap-2">
            {pointsSecond && (
              <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                {TITRE[metier]}
              </span>
            )}
            {canOrder && (
              <Button
                size="xs"
                variant="ghost"
                className="text-muted-foreground ml-auto h-6"
                data-demo="frise-reordonner"
                onClick={onOrder}
              >
                <ListOrderedIcon />
                Réordonner la frise
              </Button>
            )}
          </div>
        )}
        <ProjectCycle points={points} edit={edit} />
      </div>

      {pointsSecond && (
        <div className="flex flex-col gap-1.5" data-demo="project-cycle-second">
          <span className="text-muted-foreground block text-[11px] font-medium tracking-wide uppercase">
            {TITRE[autre]}
          </span>
          <ProjectCycle points={pointsSecond} />
          <p className="text-muted-foreground text-[11px]">
            Cette affaire porte des devis des deux sociétés, donc deux parcours.
            Cette frise se lit seulement : cocher un cran écrirait sur le devis
            porteur, qui appartient à l&apos;autre société.
          </p>
        </div>
      )}
    </>
  );
}
