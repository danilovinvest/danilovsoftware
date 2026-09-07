"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangleIcon,
  CalendarClockIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/shared/api/errors";
import { formatAgo, formatDateTime } from "@/shared/lib/format";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { ListSkeleton } from "@/shared/ui/loading";
import { listImportRuns } from "../lib/api";
import type { ImportChange, ImportRun } from "../lib/types";

/**
 * Le journal des imports : ce qui a changé, événement par événement.
 *
 * Le bouton d'import répondait « 12 ajoutés » et l'oubliait au rechargement. Un
 * compteur ne dit pas *lequel* a bougé, et c'est justement ce qu'on veut savoir
 * quand un rendez-vous se déplace dans Google.
 *
 * Les cinq natures de changement se distinguent par leur couleur : un conflit —
 * modifié chez Google **et** corrigé ici — n'est pas une mise à jour, c'est
 * quelque chose que l'import a délibérément laissé de côté et qu'il faut
 * trancher à la main.
 */
const NATURE: Record<
  ImportChange["kind"],
  { label: string; icon: LucideIcon; className: string }
> = {
  ajout: {
    label: "Ajouté",
    icon: PlusIcon,
    className: "bg-success-soft text-success",
  },
  maj: {
    label: "Mis à jour",
    icon: PencilIcon,
    className: "bg-info-soft text-info",
  },
  suppression: {
    label: "Supprimé",
    icon: Trash2Icon,
    className: "bg-neutral-soft text-neutral",
  },
  conflit: {
    label: "Conflit",
    icon: AlertTriangleIcon,
    className: "bg-warning-soft text-warning",
  },
  conflit_suppression: {
    label: "Conflit",
    icon: AlertTriangleIcon,
    className: "bg-warning-soft text-warning",
  },
};

export function ImportLogDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [runs, setRuns] = useState<ImportRun[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // L'instant est figé à l'ouverture : « il y a 3 min » ne doit pas se
  // recalculer à chaque rendu sur une horloge qui a bougé.
  const [now] = useState(() => Date.now());

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    listImportRuns(10, controller.signal)
      .then((page) => setRuns(page.items))
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setError(errorMessage(cause));
      });
    return () => controller.abort();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Journal des imports</DialogTitle>
          <DialogDescription>
            Ce que chaque import a repris de Google, et ce qu&apos;il a laissé.
          </DialogDescription>
        </DialogHeader>

        {error && <ErrorNotice message={error} />}

        {runs === null ? (
          <ListSkeleton rows={4} hue="crimson" />
        ) : runs.length === 0 ? (
          <EmptyState
            title="Aucun import"
            description="Le journal se remplit au premier import depuis Google."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {runs.map((run) => (
              <Run key={run.id} run={run} now={now} />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Run({ run, now }: { run: ImportRun; now: number }) {
  return (
    <section className="rounded-xl border">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-3 py-2">
        <span className="text-sm font-medium">{formatDateTime(run.started_at)}</span>
        <span className="text-muted-foreground text-[11px]">
          {formatAgo(run.started_at, now)}
          {run.author_name && ` · ${run.author_name}`}
        </span>
        <span className="ml-auto flex flex-wrap items-center gap-1.5 text-[11px]">
          <Compteur value={run.added} label="ajouté" tone="bg-success-soft text-success" />
          <Compteur value={run.updated} label="repris" tone="bg-info-soft text-info" />
          <Compteur value={run.removed} label="supprimé" tone="bg-neutral-soft text-neutral" />
          <Compteur value={run.conflicts} label="conflit" tone="bg-warning-soft text-warning" />
          <span className="text-muted-foreground/60">{run.unchanged} inchangés</span>
        </span>
      </header>

      {run.error !== "" && (
        <div className="p-3">
          <ErrorNotice message={run.error} />
        </div>
      )}

      {run.changes.length === 0 ? (
        <p className="text-muted-foreground px-3 py-3 text-xs">
          Rien n&apos;avait changé dans Google.
        </p>
      ) : (
        <ul className="divide-y">
          {run.changes.map((change, index) => {
            const nature = NATURE[change.kind];
            const Icon = nature.icon;
            return (
              <li key={index} className="flex items-start gap-2.5 px-3 py-2">
                <span
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md",
                    nature.className,
                  )}
                  title={nature.label}
                >
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">
                    {change.title}
                  </span>
                  <span className="text-muted-foreground/70 flex flex-wrap items-center gap-x-2 text-[11px]">
                    <span className="inline-flex items-center gap-1">
                      <CalendarClockIcon className="size-3" />
                      {formatDateTime(change.starts_at)}
                    </span>
                    <span>{change.calendar}</span>
                  </span>
                  {change.detail && (
                    <span className="text-muted-foreground mt-0.5 block text-[11px]">
                      {change.detail}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Un compteur ne s'affiche que s'il compte quelque chose. */
function Compteur({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: string;
}) {
  if (value === 0) return null;
  return (
    <span className={cn("rounded-sm px-1.5 py-0.5 font-medium", tone)}>
      {value} {label}
      {value > 1 ? "s" : ""}
    </span>
  );
}
