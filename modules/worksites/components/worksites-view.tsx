"use client";

import {
  AlarmClockIcon,
  BanknoteIcon,
  FileSignatureIcon,
  FlaskConicalIcon,
  StarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/shared/ui/feedback";
import { euros, eurosShort, plural } from "@/shared/lib/format";
import { MetricCards } from "@/shared/ui/metric-cards";
import { Panel, RowShell } from "@/shared/ui/panel";
import { Card } from "@/components/ui/card";
import { useWorksites } from "../hooks/use-worksites";
import type { Alert } from "../lib/types";
import { ScopeSwitcher } from "./scope-switcher";
import { WorksiteBoard } from "./worksite-board";
import { WorksiteList } from "./worksite-list";
import { WorksitePlanning } from "./worksite-planning";
import { WorksiteSheet } from "./worksite-sheet";

const VIEWS = [
  { value: "tableau", label: "Tableau" },
  { value: "planning", label: "Planning" },
  { value: "liste", label: "Liste" },
] as const;

/**
 * L'écran chantiers : tout ce qui se passe **après** la signature.
 *
 * Le CRM couvrait l'avant-vente d'un côté et l'argent au niveau groupe de
 * l'autre ; entre les deux, rien ne disait ce qui se passe sur le terrain. Or
 * c'est là que la marge se fait, que les retards coûtent, et que la trésorerie
 * se bloque — un PV non signé, c'est un solde qu'on ne peut pas facturer.
 *
 * D'où l'ordre : les quatre listes de travail d'abord, la vue d'ensemble
 * ensuite.
 */
export function WorksitesView() {
  const board = useWorksites();
  const { data } = board;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-base font-semibold">Chantiers</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Exécution, coûts et jalons — de la signature à la clôture.
        </p>
      </header>

      <div className="border-warning/30 bg-warning-soft/50 text-warning flex items-start gap-2 rounded-xl border px-3 py-2 text-xs">
        <FlaskConicalIcon className="mt-0.5 size-3.5 shrink-0" />
        <p>
          <span className="font-medium">Données de démonstration.</span> Les
          clients viennent de l&apos;export de devis réel, la structure du cycle du
          classeur « CYCLE CHANTIER » ; montants, coûts et jalons sont inventés —
          le CRM n&apos;a jamais suivi cette partie du métier, il n&apos;existe donc
          rien à reprendre.
        </p>
      </div>

      <ScopeSwitcher
        entityId={board.entityId}
        activityId={board.activityId}
        onChange={board.scope}
      />

      <MetricCards metrics={data.metrics} />

      <div className="grid items-start gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <AlertPanel
          title="En retard"
          description="Fin prévue dépassée"
          icon={AlarmClockIcon}
          tone="danger"
          rows={data.late}
          onOpen={board.open}
        />
        <AlertPanel
          title="PV à faire signer"
          description="Travaux terminés, réception non actée"
          icon={FileSignatureIcon}
          tone="warning"
          rows={data.pv_pending}
          onOpen={board.open}
        />
        <AlertPanel
          title="Soldes à facturer"
          description="Réception acquise, facture non émise"
          icon={BanknoteIcon}
          tone="danger"
          rows={data.balance_to_invoice}
          onOpen={board.open}
          money
        />
        <AlertPanel
          title="Avis à demander"
          description="Chantiers clôturés sans demande d'avis"
          icon={StarIcon}
          tone="info"
          rows={data.review_to_request}
          onOpen={board.open}
        />
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
          <p className="text-sm font-medium">
            {plural(data.worksites.length, "chantier")} ·{" "}
            {euros(
              data.worksites
                .filter(
                  (worksite) => worksite.status !== "cloture" && !worksite.internal,
                )
                .reduce((total, worksite) => total + worksite.amount_ht, 0),
            )}{" "}
            en cours
          </p>
          <div className="bg-muted flex rounded-[4px] p-0.5">
            {VIEWS.map((entry) => (
              <button
                key={entry.value}
                type="button"
                onClick={() => board.setView(entry.value)}
                aria-pressed={board.view === entry.value}
                className={cn(
                  "rounded-[3px] px-2.5 py-1 text-xs transition-colors",
                  board.view === entry.value
                    ? "bg-background text-foreground font-medium shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3">
          {data.worksites.length === 0 ? (
            <EmptyState
              title="Aucun chantier dans ce périmètre"
              description="Élargissez la sélection de société ou de métier."
            />
          ) : board.view === "tableau" ? (
            <WorksiteBoard
              worksites={data.worksites}
              board={data.board}
              onSelect={board.select}
            />
          ) : board.view === "planning" ? (
            <WorksitePlanning
              worksites={data.worksites}
              now={board.at}
              onSelect={board.select}
            />
          ) : (
            <WorksiteList worksites={data.worksites} onSelect={board.select} />
          )}
        </div>
      </Card>

      <WorksiteSheet worksite={board.selected} onClose={() => board.select(null)} />
    </div>
  );
}

function AlertPanel({
  title,
  description,
  icon,
  tone,
  rows,
  onOpen,
  money,
}: {
  title: string;
  description: string;
  icon: typeof AlarmClockIcon;
  tone: "danger" | "warning" | "info";
  rows: Alert[];
  onOpen: (id: string) => void;
  /** Le total en pied a du sens quand la liste porte de l'argent qui dort. */
  money?: boolean;
}) {
  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  return (
    <Panel
      title={title}
      description={
        rows.length === 0
          ? description
          : `${plural(rows.length, "chantier")}${money ? ` · ${eurosShort(total)}` : ""}`
      }
      icon={icon}
      tone={tone}
      bodyClassName="divide-y"
    >
      {rows.length === 0 ? (
        <p className="text-muted-foreground px-4 py-5 text-center text-xs">
          Rien à signaler
        </p>
      ) : (
        rows.slice(0, 5).map((row) => (
          <RowShell key={row.worksite_id} className="cursor-pointer">
            <button
              type="button"
              onClick={() => onOpen(row.worksite_id)}
              className="min-w-0 flex-1 text-left"
            >
              <span className="block truncate text-xs font-medium">
                {row.customer_name}
              </span>
              <span className="text-muted-foreground block truncate text-[11px]">
                {row.label}
              </span>
              <span className="text-muted-foreground mt-0.5 block text-[11px]">
                {row.reason}
              </span>
            </button>
            <span className="shrink-0 text-xs font-medium tabular-nums">
              {eurosShort(row.amount)}
            </span>
          </RowShell>
        ))
      )}
    </Panel>
  );
}
