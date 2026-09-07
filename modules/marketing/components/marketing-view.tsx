"use client";

import { FlaskConicalIcon, MapPinIcon, StarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/shared/ui/feedback";
import { plural } from "@/shared/lib/format";
import { MetricCards } from "@/shared/ui/metric-cards";
import { Meter, Panel } from "@/shared/ui/panel";
import { useMarketing } from "../hooks/use-marketing";
import { ARTICLE_STATUS, STATUS_ORDER } from "../lib/labels";
import { ArticleEditor } from "./article-editor";
import { RealisationCard } from "./realisation-card";

/**
 * L'écran marketing : transformer les chantiers livrés en réalisations.
 *
 * Le CRM sait déjà ce qui a été fait, où, pour qui, avec quelle technique et en
 * combien de temps — c'est tout ce qu'un article de chantier demande, à
 * l'exception du texte. D'où le principe : rien ne se ressaisit, on ne fait
 * qu'écrire par-dessus.
 *
 * L'écran a deux états : la liste, ou l'éditeur. Ouvrir une réalisation
 * remplace la liste plutôt que d'ouvrir une fenêtre — on écrit un article, ça
 * mérite la page entière.
 */
export function MarketingView() {
  const marketing = useMarketing();
  const { data } = marketing;

  if (marketing.open) {
    return (
      <ArticleEditor
        key={marketing.open.worksite.id}
        realisation={marketing.open}
        onBack={() => marketing.setOpenId(null)}
        onSave={(article) => {
          marketing.save(article);
          marketing.setOpenId(null);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-base font-semibold">Marketing</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Les chantiers livrés, transformés en réalisations publiables.
        </p>
      </header>

      <div className="border-warning/30 bg-warning-soft/50 text-warning flex items-start gap-2 rounded-xl border px-3 py-2 text-xs">
        <FlaskConicalIcon className="mt-0.5 size-3.5 shrink-0" />
        <p>
          <span className="font-medium">Données de démonstration.</span> Les
          réalisations sont les chantiers livrés de l&apos;onglet Chantiers ; les
          textes, photos et publications sont inventés. Les modifications
          restent dans le navigateur — rien n&apos;est encore envoyé au serveur.
        </p>
      </div>

      <MetricCards metrics={data.metrics} />

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <Card className="gap-0 overflow-hidden py-0 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
            <p className="text-sm font-medium">
              {plural(marketing.visible.length, "réalisation")}
            </p>
            <div className="flex flex-wrap gap-1">
              {(["toutes", ...STATUS_ORDER] as const).map((key) => {
                const count =
                  key === "toutes"
                    ? data.realisations.length
                    : data.realisations.filter((r) => r.article.status === key).length;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => marketing.setFilter(key)}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs transition-colors",
                      marketing.filter === key
                        ? "bg-selected text-foreground font-medium"
                        : "text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {key === "toutes" ? "Toutes" : ARTICLE_STATUS[key].label}
                    <span className="ml-1 tabular-nums opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3">
            {marketing.visible.length === 0 ? (
              <EmptyState
                title="Aucune réalisation dans cet état"
                description="Les chantiers apparaissent ici dès qu'ils sont livrés."
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {marketing.visible.map((realisation) => (
                  <RealisationCard
                    key={realisation.worksite.id}
                    realisation={realisation}
                    onOpen={marketing.setOpenId}
                  />
                ))}
              </div>
            )}
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Panel
            title="Référencement local"
            description="Une ville couverte par un article publié, c'est une requête gagnée"
            icon={MapPinIcon}
            tone="info"
            bodyClassName="flex flex-col gap-2.5 p-4"
          >
            {data.cities.map((city) => (
              <div key={city.city} className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
                <span className="truncate text-xs">{city.city}</span>
                <span className="text-muted-foreground text-[11px] tabular-nums">
                  {city.published} / {city.total}
                </span>
                <div className="col-span-2">
                  <Meter
                    value={city.published}
                    max={city.total}
                    tone={city.published > 0 ? "success" : "neutral"}
                  />
                </div>
              </div>
            ))}
          </Panel>

          <Panel
            title="Avis clients"
            description="Une citation vaut mieux qu'un paragraphe de plus"
            icon={StarIcon}
            tone="warning"
            bodyClassName="px-4 py-3"
          >
            <p className="text-xs">
              <span className="text-warning font-medium">
                {plural(data.reviews_missing, "chantier livré", "chantiers livrés")}
              </span>{" "}
              sans avis client recueilli.
            </p>
            <p className="text-muted-foreground mt-1 text-[11px]">
              La demande d&apos;avis est un jalon du chantier : elle se suit
              depuis l&apos;onglet Chantiers, liste « Avis à demander ».
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
