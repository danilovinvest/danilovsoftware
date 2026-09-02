"use client";

import { useState } from "react";
import { ChevronRightIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatAgo, formatElapsed, plural } from "@/shared/lib/format";
import { EmptyState, ErrorNotice, Skeleton, Spinner } from "@/shared/ui/feedback";
import { useSyncRuns } from "../hooks/use-sync-runs";
import type { SyncDetail, SyncRun } from "../lib/types";

const clock = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/**
 * Le journal de synchronisation.
 *
 * Il répond à une question précise, celle qu'on se pose quand un rendez-vous
 * manque : est-ce que la copie a tourné, quand, et qu'a-t-elle rapporté ? D'où
 * le détail par agenda plutôt qu'un total — un compte à zéro sur l'agenda
 * « Chantiers » alors que les autres ont bougé dit exactement où chercher.
 *
 * Les exécutions sans changement sont montrées comme les autres, en gris. Les
 * masquer donnerait un journal plus propre et un diagnostic plus difficile :
 * « rien n'a changé » et « ça n'a pas tourné » sont deux pannes différentes.
 */
export function SyncLogDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // Le journal ne se charge qu'ouvert : la fenêtre fermée, le composant est
  // démonté et le sondage s'arrête avec lui.
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        {open && <LogBody />}
      </DialogContent>
    </Dialog>
  );
}

function LogBody() {
  const { runs, running, now, loading, error, reload } = useSyncRuns(60);
  const day = runs.filter((run) => now - new Date(run.started_at).getTime() < 86_400_000);

  const totals = day.reduce(
    (sum, run) => ({
      created: sum.created + run.created,
      updated: sum.updated + run.updated,
      deleted: sum.deleted + run.deleted,
      failed: sum.failed + (run.error ? 1 : 0),
    }),
    { created: 0, updated: 0, deleted: 0, failed: 0 },
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-base">
          Journal de synchronisation
          {running && <Spinner className="text-info size-4" />}
        </DialogTitle>
        <DialogDescription>
          Ce que le CRM a copié depuis l&apos;agenda Google, exécution par
          exécution. Sept jours d&apos;historique.
        </DialogDescription>
      </DialogHeader>

      {error && <ErrorNotice message={error} />}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Stat label="Exécutions" value={day.length} hint="24 h" />
        <Stat label="Créés" value={totals.created} tone="text-success" />
        <Stat label="Modifiés" value={totals.updated} tone="text-info" />
        <Stat label="Supprimés" value={totals.deleted} tone="text-muted-foreground" />
        <Stat
          label="Échecs"
          value={totals.failed}
          tone={totals.failed > 0 ? "text-danger" : undefined}
        />
      </div>

      <ActivityStrip runs={runs} />

      {loading ? (
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : runs.length === 0 ? (
        <div className="rounded-lg border">
          <EmptyState
            title="Aucune exécution"
            description="La copie démarre au raccordement du compte, puis toutes les cinq minutes."
          />
        </div>
      ) : (
        <div className="max-h-96 divide-y overflow-y-auto rounded-lg border">
          {runs.map((run) => (
            <RunRow key={run.id} run={run} now={now} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-muted-foreground/70 text-[11px]">
          Rafraîchi {running ? "toutes les 3 secondes" : "toutes les 20 secondes"}.
        </p>
        <Button variant="outline" size="sm" className="h-7" onClick={reload}>
          <RefreshCwIcon className="size-3.5" />
          Actualiser
        </Button>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="bg-muted/40 rounded-lg px-3 py-2">
      <p className={cn("text-lg font-semibold tabular-nums", tone)}>{value}</p>
      <p className="text-muted-foreground text-[11px]">
        {label}
        {hint && <span className="text-muted-foreground/60"> · {hint}</span>}
      </p>
    </div>
  );
}

/**
 * Une barre par exécution, la plus récente à droite.
 *
 * La hauteur suit le nombre de changements, plafonnée : une reprise complète
 * après une panne rapporte des centaines d'événements et écraserait tout le
 * reste à l'échelle. Ce qu'on cherche à voir ici, c'est le rythme et les trous,
 * pas des volumes exacts — ceux-là sont dans la liste juste en dessous.
 */
function ActivityStrip({ runs }: { runs: SyncRun[] }) {
  if (runs.length === 0) return null;

  return (
    <div className="bg-muted/30 flex h-12 items-end justify-end gap-0.5 overflow-hidden rounded-lg px-2 py-1.5">
      {[...runs].reverse().map((run) => {
        const changes = run.created + run.updated + run.deleted;
        // Un socle de six pixels même à zéro : une exécution qui n'a rien
        // trouvé doit rester visible, sinon un trou dans la bande se lit comme
        // une panne alors que c'est un agenda calme.
        const height = 6 + Math.min(changes, 20) * 1.5;
        return (
          <span
            key={run.id}
            title={`${clock.format(new Date(run.started_at))} — ${
              run.error ? "échec" : plural(changes, "changement")
            }`}
            style={{ height }}
            className={cn(
              "w-full max-w-2.5 min-w-[3px] flex-1 rounded-sm",
              run.finished_at === null
                ? "bg-info animate-pulse"
                : run.error
                  ? "bg-danger"
                  : changes > 0
                    ? "bg-success"
                    : "bg-muted-foreground/30",
            )}
          />
        );
      })}
    </div>
  );
}

function RunRow({ run, now }: { run: SyncRun; now: number }) {
  const [open, setOpen] = useState(false);
  const changes = run.created + run.updated + run.deleted;
  const elapsed = run.finished_at
    ? new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()
    : null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="hover:bg-accent/50 flex w-full items-center gap-3 px-3 py-2 text-left transition-colors">
        <ChevronRightIcon
          className={cn(
            "text-muted-foreground size-3.5 shrink-0 transition-transform",
            open && "rotate-90",
          )}
        />

        <span className="w-20 shrink-0 font-mono text-[11px] tabular-nums">
          {clock.format(new Date(run.started_at))}
        </span>

        <span className="bg-muted text-muted-foreground w-28 shrink-0 rounded-full px-2 py-0.5 text-center text-[10px]">
          {run.origin}
        </span>

        <span className="min-w-0 flex-1 truncate text-xs">
          {run.finished_at === null ? (
            <span className="text-info">en cours…</span>
          ) : run.error ? (
            <span className="text-danger">{run.error}</span>
          ) : changes === 0 ? (
            <span className="text-muted-foreground">
              aucun changement · {plural(run.calendars, "agenda")}
            </span>
          ) : (
            <Counts
              created={run.created}
              updated={run.updated}
              deleted={run.deleted}
            />
          )}
        </span>

        <span className="text-muted-foreground/70 hidden w-20 shrink-0 text-right text-[11px] tabular-nums sm:block">
          {elapsed !== null ? formatElapsed(elapsed) : "—"}
        </span>

        <span className="text-muted-foreground/70 w-24 shrink-0 text-right text-[11px]">
          {formatAgo(run.started_at, now)}
        </span>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="bg-muted/20 border-t px-3 py-2 pl-10">
          {run.details.length === 0 ? (
            <p className="text-muted-foreground text-[11px]">
              Aucun agenda n&apos;a été parcouru — la copie s&apos;est arrêtée
              avant.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {run.details.map((detail) => (
                <DetailRow key={detail.calendar} detail={detail} />
              ))}
            </ul>
          )}
          <p className="text-muted-foreground/60 mt-2 font-mono text-[10px]">
            {run.email} · exécution #{run.id}
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function DetailRow({ detail }: { detail: SyncDetail }) {
  const changes = detail.created + detail.updated + detail.deleted;
  return (
    <li className="flex items-baseline gap-3 text-[11px]">
      <span className="min-w-0 flex-1 truncate">
        {detail.summary || detail.calendar}
      </span>
      <span
        className={cn(
          "shrink-0 rounded-full px-1.5 py-px text-[10px]",
          detail.mode === "complète"
            ? "bg-warning-soft/60 text-warning"
            : "bg-muted text-muted-foreground",
        )}
      >
        {detail.mode}
      </span>
      <span className="w-40 shrink-0 text-right">
        {detail.error ? (
          <span className="text-danger truncate">{detail.error}</span>
        ) : changes === 0 ? (
          <span className="text-muted-foreground/60">—</span>
        ) : (
          <Counts
            created={detail.created}
            updated={detail.updated}
            deleted={detail.deleted}
          />
        )}
      </span>
    </li>
  );
}

/** Trois compteurs, et seulement ceux qui ne sont pas nuls : « 0 supprimé »
 * n'apprend rien et allonge une ligne qu'on lit en diagonale. */
function Counts({
  created,
  updated,
  deleted,
}: {
  created: number;
  updated: number;
  deleted: number;
}) {
  return (
    <span className="inline-flex items-baseline gap-2 tabular-nums">
      {created > 0 && <span className="text-success">+{created}</span>}
      {updated > 0 && <span className="text-info">~{updated}</span>}
      {deleted > 0 && <span className="text-danger">−{deleted}</span>}
    </span>
  );
}
