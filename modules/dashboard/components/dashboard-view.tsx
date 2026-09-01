"use client";

import Link from "next/link";
import { ArrowRightIcon, FlaskConicalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricCards } from "@/shared/ui/metric-cards";
import { cn } from "@/lib/utils";
import { useAuth } from "@/modules/auth";
import { useDashboard } from "../hooks/use-dashboard";
import { ActivityPanel } from "./activity-panel";
import { AgendaPanel } from "./agenda-panel";
import { CashPanel } from "./cash-panel";
import { DigestTable } from "./digest-table";
import { HotPanel } from "./hot-panel";
import { PipelinePanel } from "./pipeline-panel";
import { RelancePanel } from "./relance-panel";
import { SourcesPanel } from "./sources-panel";
import { WorkloadPanel } from "./workload-panel";
import { PERIODS } from "../lib/labels";

/**
 * Le tableau de bord, ordonné par ce qu'on en attend le matin.
 *
 * D'abord les chiffres de la période, puis les deux listes de travail — ce
 * qu'il faut relancer, ce qui est près de signer — et seulement ensuite la
 * lecture de fond : pipeline, agenda, synthèse fiche par fiche, et les
 * panneaux d'analyse. Un tableau de bord qui commence par un graphique fait
 * perdre les trente premières secondes de la journée.
 */
export function DashboardView() {
  const { account } = useAuth();
  const { data, period, setPeriod, at } = useDashboard();

  const firstName = account?.first_name?.trim();

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold">
            {firstName ? `Bonjour ${firstName}` : "Tableau de bord"}
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {data.relances.length > 0
              ? `${data.relances.length} affaires attendent une relance, ${data.hot.length} sont près de signer.`
              : "Aucune relance en retard : l'activité est à jour."}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/customers">
            Ouvrir les fiches
            <ArrowRightIcon />
          </Link>
        </Button>
      </header>

      {/*
        Bandeau assumé et non discret : cet écran n'est pas branché sur l'API,
        et il vit à côté d'écrans qui, eux, affichent de vraies fiches clients.
        Confondre les deux ferait prendre une décision sur des chiffres
        inventés.
      */}
      <div className="border-warning/30 bg-warning-soft/50 text-warning flex items-start gap-2 rounded-xl border px-3 py-2 text-xs">
        <FlaskConicalIcon className="mt-0.5 size-3.5 shrink-0" />
        <p>
          <span className="font-medium">Données de démonstration.</span> Fiches,
          montants et échéances de cet écran sont fictifs et calculés dans le
          navigateur — ils ne viennent pas de la base. Les autres écrans du CRM
          affichent, eux, les données réelles.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Compteurs
          </h2>
          {/* Le sélecteur est ici, et non dans l'en-tête de page : il ne pilote
              que les compteurs. Les listes de travail sont, elles, toujours au
              présent. */}
          <div className="bg-muted flex rounded-[4px] p-0.5">
            {PERIODS.map((entry) => (
              <button
                key={entry.value}
                type="button"
                onClick={() => setPeriod(entry.value)}
                aria-pressed={period === entry.value}
                className={cn(
                  "rounded-[3px] px-2.5 py-1 text-xs transition-colors",
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
        <RelancePanel rows={data.relances} className="xl:col-span-2" />
        <HotPanel rows={data.hot} />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <PipelinePanel buckets={data.pipeline} />
        <AgendaPanel events={data.agenda} now={at} />
      </div>

      <DigestTable rows={data.digest} />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <CashPanel rows={data.cash} />
        <SourcesPanel buckets={data.sources} />
        <WorkloadPanel rows={data.workload} />
        <ActivityPanel rows={data.activity} />
      </div>
    </div>
  );
}
