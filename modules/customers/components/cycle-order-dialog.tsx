"use client";

import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorNotice } from "@/shared/ui/feedback";
import { cn } from "@/lib/utils";
import * as api from "../lib/api";
import {
  CYCLE_LABEL,
  PARCOURS,
  cycleOrder,
  defaultCycleOrder,
  type CycleStep,
  type Parcours,
} from "../lib/cycle";
import { useAction } from "../hooks/use-customers";
import { publishCycleOrder, useCycleOrders } from "../hooks/use-cycle-orders";

/**
 * Réordonner les crans d'une frise, au glisser-déposer.
 *
 * « Un système de glisser-déposer comme celui des tâches dans les colonnes » :
 * même bibliothèque que le tableau des tâches, et l'ordre qu'on voit ici est
 * celui que prendront **toutes** les frises de ce parcours, sur toutes les
 * fiches, pour tout le monde. C'est pourquoi l'écran le dit, et pourquoi il ne
 * s'ouvre qu'avec `system:admin`.
 *
 * Seul l'ordre bouge. Un cran déplacé garde ce qui le franchit et ce qu'il
 * écrit : on range, on ne coche rien.
 */
export function CycleOrderDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Le parcours de l'affaire d'où l'on vient : c'est lui qu'on veut ranger. */
  initial: Parcours;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl" data-demo="frise-ordre">
        <DialogHeader>
          <DialogTitle>Ordre de la frise</DialogTitle>
          <DialogDescription>
            Glissez les crans dans l&apos;ordre voulu. L&apos;ordre vaut pour toutes les affaires
            de ce parcours, sur toutes les fiches.
          </DialogDescription>
        </DialogHeader>
        {/*
          L'éditeur vit dans le contenu, que la fenêtre démonte à la fermeture :
          un brouillon abandonné ne revient donc pas à la réouverture.
        */}
        {open && <Editor initial={initial} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

/*
  Les libellés courts de la frise se répètent d'un parcours à l'autre — deux
  « Rapport », deux « Envoi » — et sur un cran de quatorze pixels c'est sans
  gêne. Ici on range, côte à côte, un rapport de visite et un rapport de
  sondage : il faut les distinguer.
*/
const EDITOR_LABEL: Partial<Record<CycleStep, string>> = {
  rapport: "Rapport de visite",
  rapport_sondage: "Rapport de sondage",
  chantier: "Date de chantier",
  plans: "Envoi du dossier",
  envoi: "Envoi du rapport",
};

function Editor({ initial, onDone }: { initial: Parcours; onDone: () => void }) {
  const orders = useCycleOrders();
  const [parcours, setParcours] = useState<Parcours>(initial);
  /** Nul tant qu'on n'a rien déplacé : l'écran montre alors l'ordre en vigueur. */
  const [draft, setDraft] = useState<CycleStep[] | null>(null);

  const { metier, mission } = parcoursShape(parcours);
  /*
    Les crans du sondage s'affichent sur les deux autres missions d'étude, même
    si peu d'affaires en vendent un : les ranger ici, c'est décider où ils
    tomberont le jour où un sondage est vendu.
  */
  const current = cycleOrder(metier, mission, true, orders);
  const byDefault = defaultCycleOrder(metier, mission, true);
  const optional = new Set(byDefault.filter((step) => !defaultCycleOrder(metier, mission).includes(step)));
  const steps = draft ?? current;
  const isDefault = sameOrder(steps, byDefault);
  const custom = orders[parcours] !== undefined;

  const save = useAction((next: CycleStep[]): Promise<{ steps: string[] | null }> =>
    // L'ordre par défaut ne s'enregistre pas, il se rétablit : une copie en
    // base divergerait du code au premier cran ajouté.
    sameOrder(next, byDefault)
      ? api.resetCycleOrder(parcours).then(() => ({ steps: null }))
      : api.setCycleOrder(parcours, next).then((row) => ({ steps: row.steps })),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = steps.indexOf(active.id as CycleStep);
    const to = steps.indexOf(over.id as CycleStep);
    if (from < 0 || to < 0) return;
    setDraft(arrayMove(steps, from, to));
  }

  async function submit() {
    if (draft === null) return onDone();
    // `null` est un refus, déjà affiché par `useAction`. Un retour à l'ordre
    // par défaut rend un objet dont les crans sont nuls.
    const result = await save.run(draft);
    if (result === null) return;
    publishCycleOrder(parcours, result.steps);
    onDone();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Parcours">
        {PARCOURS.map((entry) => (
          <Button
            key={entry.key}
            role="tab"
            aria-selected={entry.key === parcours}
            size="sm"
            variant={entry.key === parcours ? "default" : "outline"}
            disabled={save.pending}
            onClick={() => {
              setParcours(entry.key);
              setDraft(null);
            }}
          >
            {entry.label}
            {orders[entry.key] !== undefined && (
              <span className="text-[10px] opacity-70">· modifié</span>
            )}
          </Button>
        ))}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={steps} strategy={rectSortingStrategy}>
          <ol className="flex flex-wrap gap-2" aria-label="Crans de la frise, dans l'ordre">
            {steps.map((step, index) => (
              <StepChip
                key={step}
                step={step}
                index={index}
                optional={optional.has(step)}
                disabled={save.pending}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>

      <p className="text-muted-foreground text-xs">
        Déplacer un cran ne coche ni ne décoche rien : seul l&apos;ordre change. Le cran en
        cours devient le premier cran non franchi dans ce nouvel ordre.
      </p>

      {save.error && <ErrorNotice message={save.error} />}

      <DialogFooter className="sm:justify-between">
        <Button
          variant="ghost"
          disabled={save.pending || (isDefault && !custom)}
          onClick={() => setDraft(byDefault)}
        >
          <RotateCcwIcon />
          Ordre par défaut
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" disabled={save.pending} onClick={onDone}>
            Annuler
          </Button>
          <Button disabled={save.pending || draft === null} onClick={submit}>
            Enregistrer
          </Button>
        </div>
      </DialogFooter>
    </div>
  );
}

function StepChip({
  step,
  index,
  optional,
  disabled,
}: {
  step: CycleStep;
  index: number;
  optional: boolean;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step,
    disabled,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      title={CYCLE_LABEL[step].hint}
      className={cn(
        "bg-background flex touch-none items-center gap-1.5 rounded-lg border px-2 py-1.5 text-sm select-none",
        optional && "border-dashed",
        isDragging ? "z-10 opacity-80 shadow-md" : "cursor-grab",
      )}
      {...attributes}
      {...listeners}
    >
      <GripVerticalIcon className="text-muted-foreground size-3.5" />
      <span className="text-muted-foreground w-4 text-right text-xs tabular-nums">{index + 1}</span>
      <span className="font-medium">{EDITOR_LABEL[step] ?? CYCLE_LABEL[step].label}</span>
      {optional && <span className="text-muted-foreground text-[11px]">si sondage vendu</span>}
    </li>
  );
}

function parcoursShape(parcours: Parcours) {
  return parcours === "travaux"
    ? { metier: "travaux" as const, mission: undefined }
    : { metier: "etudes" as const, mission: parcours };
}

function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((step, index) => step === b[index]);
}
