"use client";

import {
  AlarmClockIcon,
  BanknoteIcon,
  CalendarPlusIcon,
  ReceiptTextIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { CardsSkeleton } from "@/shared/ui/loading";
import { eurosShort, plural } from "@/shared/lib/format";
import { Panel, RowShell, TONE_SOFT } from "@/shared/ui/panel";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useWorksites } from "../hooks/use-worksites";
import { alertTotal, STATUS_ORDER } from "../lib/derive";
import { WORKSITE_STATUS } from "../lib/labels";
import type { Alert } from "../lib/types";
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
 * L'écran chantiers : les affaires signées, et ce qu'il en reste à faire.
 *
 * **Tout ce qui s'y affiche vient de la base.** L'écran était entièrement
 * simulé — montants, coûts, marges, PV de réception, avis clients, périmètre
 * par société. Rien de tout cela n'existe : le CRM ne suit pas les coûts, ne
 * connaît pas de PV, et aucun devis ne porte de montant, tous venant des noms
 * de fichiers OneDrive.
 *
 * Ce qui reste est ce que les données disent : cent dix affaires signées, leur
 * client, leur lieu, leur date de démarrage quand elle est connue, et leurs
 * pièces — deux cent quatre-vingt-quatre devis et factures, chacun ouvrant son
 * fichier chez Microsoft.
 *
 * Les quatre listes de travail d'abord, la vue d'ensemble ensuite : on ouvre
 * cet écran pour savoir quoi faire, pas pour contempler un tableau.
 */
export function WorksitesView() {
  const board = useWorksites();
  const { work, reads } = board;

  // Le chiffré global, et sur combien de chantiers il porte. Le second nombre
  // n'est pas une coquetterie : un quart des devis seulement ont un montant,
  // et un total sans son dénominateur laisserait croire qu'il couvre tout.
  const chiffresList = reads.filter((r) => r.amountHT !== null);
  const chiffres = chiffresList.length;
  const chiffre = chiffres === 0
    ? null
    : chiffresList.reduce((sum, r) => sum + (r.amountHT ?? 0), 0);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold">Chantiers</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Les affaires signées : où elles en sont, et ce qui manque.
          </p>
        </div>
        <Input
          value={board.city}
          onChange={(event) => board.setCity(event.target.value)}
          placeholder="Filtrer par ville"
          className="h-8 w-52 text-sm"
        />
      </header>

      {board.error && <ErrorNotice message={board.error} />}

      <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AlertPanel
          title="Sans date de démarrage"
          description="Signé, aucune date posée"
          icon={CalendarPlusIcon}
          tone="danger"
          rows={work.unplanned}
          onOpen={board.select}
        />
        <AlertPanel
          title="Ouverts depuis longtemps"
          description="Démarrés, jamais marqués réalisés"
          icon={AlarmClockIcon}
          tone="warning"
          rows={work.running}
          onOpen={board.select}
        />
        <AlertPanel
          title="Réalisés, non facturés"
          description="Aucune facture au dossier"
          icon={ReceiptTextIcon}
          tone="danger"
          rows={work.toInvoice}
          onOpen={board.select}
        />
        <AlertPanel
          title="Acompte non encaissé"
          description="Signé, aucun acompte reçu"
          icon={BanknoteIcon}
          tone="warning"
          rows={work.noDeposit}
          onOpen={board.select}
        />
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{plural(reads.length, "chantier")}</span>
            {chiffre !== null && (
              <span className="text-muted-foreground tabular-nums">
                {eurosShort(chiffre)} HT sur {chiffres} devis chiffrés
              </span>
            )}
            {STATUS_ORDER.map((status) => {
              const count = board.board.find((b) => b.status === status)?.count ?? 0;
              if (count === 0) return null;
              const entry = WORKSITE_STATUS[status];
              return (
                <span
                  key={status}
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                    TONE_SOFT[entry.tone],
                  )}
                >
                  {count} {entry.label.toLowerCase()}
                </span>
              );
            })}
          </p>

          <div className="bg-muted flex rounded-md p-0.5">
            {VIEWS.map((entry) => (
              <button
                key={entry.value}
                type="button"
                onClick={() => board.setView(entry.value)}
                aria-pressed={board.view === entry.value}
                className={cn(
                  "rounded-sm px-2.5 py-1 text-xs transition-colors",
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
          {board.loading && reads.length === 0 ? (
            <CardsSkeleton count={8} columns="sm:grid-cols-2 xl:grid-cols-4" hue="amber" />
          ) : reads.length === 0 ? (
            <EmptyState
              title="Aucun chantier"
              description={
                board.city
                  ? "Aucune affaire signée dans cette ville."
                  : "Un chantier apparaît ici dès qu'une affaire passe à « gagnée »."
              }
            />
          ) : board.view === "tableau" ? (
            <WorksiteBoard reads={reads} board={board.board} onSelect={board.select} />
          ) : board.view === "planning" ? (
            <WorksitePlanning reads={reads} now={board.now} onSelect={board.select} />
          ) : (
            <WorksiteList reads={reads} onSelect={board.select} />
          )}
        </div>
      </Card>

      <WorksiteSheet read={board.selected} onClose={() => board.select(null)} />
    </div>
  );
}

/**
 * Une liste de travail.
 *
 * Le total n'apparaît que si au moins un chantier de la liste est chiffré :
 * un quart des devis le sont, et un « 0 € » sous trente-sept lignes dirait le
 * contraire de la vérité.
 */
function AlertPanel({
  title,
  description,
  icon,
  tone,
  rows,
  onOpen,
}: {
  title: string;
  description: string;
  icon: typeof AlarmClockIcon;
  tone: "danger" | "warning" | "info";
  rows: Alert[];
  onOpen: (id: string) => void;
}) {
  return (
    <Panel
      title={title}
      description={
        rows.length === 0
          ? description
          : `${plural(rows.length, "chantier")}${
              alertTotal(rows) !== null ? ` · ${eurosShort(alertTotal(rows)!)}` : ""
            }`
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
        rows.slice(0, 6).map((row) => (
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
              <span className="text-muted-foreground/70 mt-0.5 block text-[11px]">
                {row.reason}
              </span>
            </button>
            {row.amount !== null && (
              <span className="shrink-0 text-xs font-medium tabular-nums">
                {eurosShort(row.amount)}
              </span>
            )}
          </RowShell>
        ))
      )}
    </Panel>
  );
}
