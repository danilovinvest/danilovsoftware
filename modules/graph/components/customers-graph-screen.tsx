"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PanelLeftCloseIcon, PanelLeftOpenIcon, SlidersHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { HUE } from "@/shared/ui/hue";
import { useCustomersGraph } from "../hooks/use-customers-graph";
import { DEFAULT_FILTERS, visibleSubgraph, type GraphFilters } from "../lib/filters";
import type { GraphModel, ModelNode } from "../lib/model";
import { graphStats } from "../lib/stats";
import { GraphCanvas, type FocusRequest } from "./graph-canvas";
import { GraphFiltersPanel } from "./graph-filters-panel";
import { GraphSelectionPanel } from "./graph-selection-panel";
import { GraphSkeleton } from "./graph-skeleton";
import { GraphStatsBar } from "./graph-stats-bar";
import { appHref } from "@/shared/lib/routes";

/**
 * Le graphe de toute la base : les fiches, leurs liens posés et ceux que leurs
 * interlocuteurs trahissent, sur une seule toile qui se tient à jour.
 *
 * L'écran décide — ce qu'on voit (filtres), ce qu'on regarde (sélection), où
 * l'on va (cadrage) — et la toile dessine. `?focus=<id>` ouvre la toile sur
 * une fiche, choisie et cadrée : c'est le lien « Ouvrir dans le graphe global »
 * de l'onglet Graphe d'une fiche.
 */
export function CustomersGraphScreen() {
  const router = useRouter();
  const focusParam = useSearchParams().get("focus");
  const isMobile = useIsMobile();
  const graph = useCustomersGraph();
  const [filters, setFilters] = useState<GraphFilters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(focusParam);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(
    focusParam ? { id: focusParam, nonce: 0 } : null,
  );
  const [panelOpen, setPanelOpen] = useState(true);
  const [filtersSheet, setFiltersSheet] = useState(false);

  const { model } = graph;
  const visible = useMemo(() => (model ? visibleSubgraph(model, filters, selectedId) : null), [model, filters, selectedId]);
  const stats = useMemo(() => (visible ? graphStats(visible) : null), [visible]);
  const selected = selectedId ? model?.byId.get(selectedId) : undefined;

  const pick = useCallback((id: string) => {
    setSelectedId(id);
    setFocusRequest((current) => ({ id, nonce: (current?.nonce ?? 0) + 1 }));
    setFiltersSheet(false);
  }, []);
  const open = useCallback(
    (id: string) => {
      if (!id.startsWith("hub:")) router.push(appHref(`/customers/${id}`));
    },
    [router],
  );

  if (graph.loading) return <GraphSkeleton />;
  if (!model || !visible || !stats) {
    return (
      <div className="flex flex-col gap-3">
        <Header />
        <ErrorNotice message="Le graphe n'a pas pu être lu." onRetry={graph.reload} />
      </div>
    );
  }

  const filtersPanel = (
    <GraphFiltersPanel
      model={model}
      filters={filters}
      onChange={setFilters}
      isolatedCount={visible.isolatedCount}
      showCompany={graph.scope === "tous"}
      onPick={pick}
    />
  );
  const desktopPanel = !isMobile && panelOpen;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <Header>
        <FreshnessBadge generatedAt={graph.data?.generated_at} updated={graph.updated} paused={graph.versionError} />
        <Button
          variant="outline"
          size="sm"
          onClick={() => (isMobile ? setFiltersSheet(true) : setPanelOpen((on) => !on))}
          aria-label={isMobile ? "Filtres" : panelOpen ? "Masquer les filtres" : "Afficher les filtres"}
        >
          {isMobile ? <SlidersHorizontalIcon /> : panelOpen ? <PanelLeftCloseIcon /> : <PanelLeftOpenIcon />}
          Filtres
        </Button>
      </Header>
      {graph.error !== undefined && (
        <ErrorNotice message="La dernière relecture du graphe a échoué : la toile montre la précédente." onRetry={graph.reload} />
      )}
      <div
        className={cn(
          "grid min-h-[70dvh] flex-1 gap-3 md:min-h-0",
          desktopPanel && "md:grid-cols-[16rem_minmax(0,1fr)]",
        )}
      >
        {desktopPanel && (
          <aside className="min-h-0 overflow-y-auto pr-1" data-demo="graphe-filtres">
            {filtersPanel}
          </aside>
        )}
        <div className="bg-card flex min-h-0 flex-col overflow-hidden rounded-xl border">
          <div className="border-b px-3 py-2">
            <GraphStatsBar stats={stats} onPick={pick} />
          </div>
          <div className="relative min-h-0 flex-1" data-demo="graphe-global">
            <GraphCanvas
              model={model}
              visible={visible}
              selectedId={selectedId}
              focusRequest={focusRequest}
              onSelect={setSelectedId}
              onOpen={open}
            />
            <EmptyOverlay model={model} shown={visible.nodes.length} onShowIsolated={() => setFilters({ ...filters, showIsolated: true })} />
            {!isMobile && selected && (
              <div className="bg-card/95 absolute top-3 right-3 bottom-3 flex w-80 max-w-[calc(100%-1.5rem)] flex-col rounded-lg border p-3 shadow-md backdrop-blur">
                <GraphSelectionPanel model={model} node={selected} onPick={pick} onClose={() => setSelectedId(null)} />
              </div>
            )}
          </div>
        </div>
      </div>
      {isMobile && (
        <MobileSheets
          filtersOpen={filtersSheet}
          onFiltersOpen={setFiltersSheet}
          filtersPanel={filtersPanel}
          model={model}
          selected={selected}
          onPick={pick}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}

function Header({ children }: { children?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h1 className="flex items-center gap-2 text-base font-semibold">
          <span className={cn("size-2 rounded-full", HUE.indigo.solid)} />
          Graphe des fiches
        </h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Toutes les fiches et ce qui les relie : syndics, apporteurs, interlocuteurs communs.
        </p>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </header>
  );
}

const TIME = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

/**
 * « Lu à » tant que rien n'a bougé depuis l'ouverture, « Mis à jour à » dès
 * qu'une relecture a apporté du neuf. Une empreinte illisible le dit : la
 * toile reste juste, elle ne se rafraîchit plus.
 */
function FreshnessBadge({ generatedAt, updated, paused }: { generatedAt?: string; updated: boolean; paused: boolean }) {
  if (!generatedAt) return null;
  const time = TIME.format(new Date(generatedAt));
  return (
    <span
      data-demo="graphe-fraicheur"
      className={cn(
        "rounded-full px-2 py-0.5 text-xs whitespace-nowrap",
        paused ? "bg-warning-soft text-warning" : updated ? cn(HUE.indigo.soft, HUE.indigo.text) : "text-muted-foreground",
      )}
      title="Le graphe se relit de lui-même dès qu'une fiche, un interlocuteur, un lien ou une affaire change."
    >
      {paused ? `Mise à jour suspendue · lu à ${time}` : updated ? `Mis à jour à ${time}` : `Lu à ${time}`}
    </span>
  );
}

function EmptyOverlay({ model, shown, onShowIsolated }: { model: GraphModel; shown: number; onShowIsolated: () => void }) {
  if (shown > 0) return null;
  const none = model.nodes.length === 0;
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <EmptyState
        title={none ? "Aucune fiche dans ce périmètre" : "Rien à montrer avec ces filtres"}
        description={
          none
            ? "Le graphe se remplira dès la première fiche."
            : "Aucune fiche retenue n'a de lien. Les fiches sans lien sont masquées par défaut."
        }
        action={
          none ? undefined : (
            <Button variant="outline" size="sm" onClick={onShowIsolated}>
              Afficher les fiches sans lien
            </Button>
          )
        }
      />
    </div>
  );
}

function MobileSheets({
  filtersOpen,
  onFiltersOpen,
  filtersPanel,
  model,
  selected,
  onPick,
  onClose,
}: {
  filtersOpen: boolean;
  onFiltersOpen: (open: boolean) => void;
  filtersPanel: React.ReactNode;
  model: GraphModel;
  selected: ModelNode | undefined;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      <Sheet open={filtersOpen} onOpenChange={onFiltersOpen}>
        <SheetContent side="left" className="overflow-y-auto p-4">
          <SheetHeader className="p-0">
            <SheetTitle>Filtres du graphe</SheetTitle>
            <SheetDescription className="sr-only">Chercher, choisir les catégories et les liens affichés.</SheetDescription>
          </SheetHeader>
          {filtersPanel}
        </SheetContent>
      </Sheet>
      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="bottom" showCloseButton={false} className="max-h-[70dvh] p-4">
          <SheetTitle className="sr-only">{selected?.label ?? "Nœud choisi"}</SheetTitle>
          <SheetDescription className="sr-only">La fiche choisie et ses voisins.</SheetDescription>
          {selected && <GraphSelectionPanel model={model} node={selected} onPick={onPick} onClose={onClose} />}
        </SheetContent>
      </Sheet>
    </>
  );
}
