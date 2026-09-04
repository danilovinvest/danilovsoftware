"use client";

import Link from "next/link";
import {
  ArrowRightIcon,
  BanknoteIcon,
  CalendarPlusIcon,
  FileTextIcon,
  PackageIcon,
  TableIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/modules/auth";
import { formatDate } from "@/shared/lib/format";
import { MetricCards } from "@/shared/ui/metric-cards";
import { useDashboard } from "../hooks/use-dashboard";
import { PERIODS } from "../lib/labels";
import { ActivityPanel } from "./activity-panel";
import { DigestTable } from "./digest-table";
import { HotPanel } from "./hot-panel";
import { PipelinePanel } from "./pipeline-panel";
import { RelancePanel } from "./relance-panel";
import { TopClientsPanel } from "./top-clients-panel";
import { VatPanel } from "./vat-panel";
import { WaitingPanel } from "./waiting-panel";

/**
 * Le tableau de bord, ordonné par ce qu'on en attend le matin.
 *
 * D'abord les chiffres de la période, puis les deux listes de travail — ce
 * qu'il faut relancer, ce qui vient de partir — et seulement ensuite la lecture
 * de fond : répartition, synthèse fiche par fiche, analyses. Un tableau de bord
 * qui commence par un graphique fait perdre les trente premières secondes de la
 * journée.
 */
export function DashboardView() {
  const { account } = useAuth();
  const { data, period, setPeriod } = useDashboard();

  const firstName = account?.first_name?.trim();

  // Ce qui est signé mais n'avance pas : la moitié du problème que l'écran
  // ignorait, et celle qui coûte le plus cher puisque l'argent est déjà engagé.
  const blocked =
    data.deposit_to_invoice.length +
    data.deposit_awaited.length +
    data.without_date.length +
    data.materials.length;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold">
            {firstName ? `Bonjour ${firstName}` : "Tableau de bord"}
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {data.relances_total > 0
              ? `${data.relances_total} devis attendent une réponse, ${blocked} affaires signées attendent autre chose.`
              : "Aucun devis en attente dans la fenêtre de relance."}
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
        L'origine des chiffres, en clair. Cet écran n'est pas branché sur l'API :
        il lit un export figé, et ce que l'export ne contient pas — origine de la
        demande, responsable, relances déjà faites, règlements — n'apparaît nulle
        part plutôt que d'être approximé.
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
          {/* Le sélecteur ne pilote que les compteurs : les listes de travail
              sont, elles, toujours au présent. */}
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
        <RelancePanel
          rows={data.relances}
          total={data.relances_total}
          className="xl:col-span-2"
        />
        <HotPanel rows={data.hot} />
      </div>

      {/*
        Les quatre attentes d'après-signature, dans l'ordre du cycle. Elles
        viennent juste après les relances parce qu'elles portent sur de l'argent
        déjà gagné : un devis sans réponse peut ne jamais se signer, un acompte
        non encaissé est un dû qu'on oublie de réclamer.
      */}
      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Signé, mais bloqué
        </h2>
        <div className="grid items-start gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <WaitingPanel
            title="Acompte à facturer"
            hint="Tout ce qui est signé a été facturé."
            icon={FileTextIcon}
            tone="warning"
            rows={data.deposit_to_invoice}
          />
          <WaitingPanel
            title="Acompte attendu"
            hint="Aucun acompte en souffrance."
            icon={BanknoteIcon}
            tone="danger"
            rows={data.deposit_awaited}
          />
          <WaitingPanel
            title="Sans date de chantier"
            hint="Tous les chantiers payés ont leur date."
            icon={CalendarPlusIcon}
            tone="danger"
            rows={data.without_date}
          />
          <WaitingPanel
            title="Matériaux à commander"
            hint="Rien à commander pour l'instant."
            icon={PackageIcon}
            tone="warning"
            rows={data.materials}
          />
        </div>
      </section>

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
