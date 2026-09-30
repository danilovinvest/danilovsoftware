"use client";

import { useState } from "react";
import { ArchiveIcon, ChevronDownIcon, TableIcon } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { formatDate } from "@/shared/lib/format";
import { MetricCards } from "@/shared/ui/metric-cards";
import { useDashboard } from "../hooks/use-dashboard";
import { PERIODS } from "../lib/labels";
import { EXPORT_DATE } from "../lib/seed";
import { ActivityPanel } from "./activity-panel";
import { DigestTable } from "./digest-table";
import { HotPanel } from "./hot-panel";
import { PipelinePanel } from "./pipeline-panel";
import { RelancePanel } from "./relance-panel";
import { TopClientsPanel } from "./top-clients-panel";
import { VatPanel } from "./vat-panel";

/**
 * L'analyse tirée de l'export des devis — repliée, et datée.
 *
 * Ces panneaux ouvraient l'écran. Ils lisent un fichier arrêté à une date, pas
 * la base : un mois plus tard, « signé sur 30 jours » comptait un mois où
 * l'export n'a rien vu, et la liste « à relancer » nommait des devis dont on ne
 * savait plus s'ils avaient été relancés. Placés en tête, ils passaient pour
 * l'état du jour.
 *
 * Ils restent parce qu'ils sont les seuls à porter des montants et une
 * tendance — l'API ne sert encore ni l'un ni l'autre. Mais ils se rangent sous
 * ce qui est vivant, fermés par défaut, et leur titre dit leur âge.
 *
 * Le contenu n'est monté qu'à l'ouverture : l'instantané se calcule sur trois
 * mille lignes, et l'écran n'a pas à le payer pour un bloc qu'on n'ouvre pas.
 */
export function ExportSection() {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="flex flex-col gap-4">
      <CollapsibleTrigger className="bg-card ring-foreground/10 hover:bg-accent/60 focus-visible:ring-ring/50 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left ring-1 transition-colors outline-none focus-visible:ring-2">
        <span className="bg-neutral-soft text-neutral flex size-7 shrink-0 items-center justify-center rounded-md">
          <ArchiveIcon className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">
            Analyse de l&apos;export du {formatDate(EXPORT_DATE)}
          </span>
          <span className="text-muted-foreground block text-xs">
            Montants signés, tendances, synthèse par fiche — des chiffres arrêtés à cette date, pas
            l&apos;état du jour.
          </span>
        </span>
        <ChevronDownIcon
          className={cn("text-muted-foreground size-4 shrink-0 transition-transform", open && "rotate-180")}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>{open && <ExportContent />}</CollapsibleContent>
    </Collapsible>
  );
}

function ExportContent() {
  const { data, period, setPeriod } = useDashboard();

  return (
    <div className="flex flex-col gap-5">
      {/*
        L'origine des chiffres, en clair : ce que l'export ne contient pas —
        origine de la demande, responsable, relances déjà faites, règlements —
        n'apparaît nulle part plutôt que d'être approximé.
      */}
      <div className="border-info/30 bg-info-soft/50 text-info flex items-start gap-2 rounded-xl border px-3 py-2 text-xs">
        <TableIcon className="mt-0.5 size-3.5 shrink-0" />
        <p>
          <span className="font-medium">
            Données réelles, arrêtées au {formatDate(data.source_date)}.
          </span>{" "}
          Reprises de <code className="font-mono">{data.source_file}</code> —
          151 devis, 103 clients. Les étapes viennent du statut d&apos;origine
          (<code className="font-mono">etude</code> → devis envoyé,{" "}
          <code className="font-mono">accepte</code> → gagné,{" "}
          <code className="font-mono">facture</code> → réalisé) et les priorités
          sont calculées à partir du montant et de l&apos;ancienneté. L&apos;export
          ne porte ni origine de la demande, ni responsable, ni historique de
          relance : ces colonnes sont absentes plutôt que vides.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Compteurs
          </h2>
          {/* Le sélecteur ne pilote que les compteurs. */}
          <div className="bg-muted flex rounded-md p-0.5">
            {PERIODS.map((entry) => (
              <button
                key={entry.value}
                type="button"
                onClick={() => setPeriod(entry.value)}
                aria-pressed={period === entry.value}
                className={cn(
                  "rounded-sm px-2.5 py-1 text-xs transition-colors",
                  period === entry.value
                    ? "bg-background text-foreground font-medium shadow-2xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>
        <MetricCards metrics={data.metrics} />
      </section>

      <div className="grid items-start gap-4 xl:grid-cols-3">
        <RelancePanel rows={data.relances} total={data.relances_total} className="xl:col-span-2" />
        <HotPanel rows={data.hot} />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <PipelinePanel buckets={data.pipeline} />
        <ActivityPanel rows={data.activity} />
      </div>

      <DigestTable rows={data.digest} />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <TopClientsPanel rows={data.top_clients} />
        <VatPanel buckets={data.vat} />
      </div>
    </div>
  );
}
