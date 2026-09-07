"use client";

import { MapPinIcon, QuoteIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorNotice, Skeleton } from "@/shared/ui/feedback";
import { plural } from "@/shared/lib/format";
import { Meter, Panel } from "@/shared/ui/panel";
import { useMarketing } from "../hooks/use-marketing";
import { ARTICLE_STATUS, STATUS_ORDER } from "../lib/labels";
import { ArticleEditor } from "./article-editor";
import { RealisationCard } from "./realisation-card";

/**
 * L'écran marketing : transformer les affaires réalisées en réalisations.
 *
 * Le CRM sait déjà ce qui a été fait, où et pour qui — c'est tout ce qu'un
 * article de chantier demande, à l'exception du texte. D'où le principe : rien
 * ne se ressaisit, on ne fait qu'écrire par-dessus.
 *
 * **Tout ce qui s'y affiche vient de la base.** L'écran était simulé — les
 * chantiers, les articles, les photos, les avis clients, et jusqu'aux
 * modifications, qui ne quittaient pas le navigateur. Les réalisations sont
 * maintenant les quatre-vingt-quatorze affaires d'étape « réalisé », et les
 * articles vivent dans leur table.
 *
 * L'écran a deux états : la liste, ou l'éditeur. Ouvrir une réalisation
 * remplace la liste plutôt que d'ouvrir une fenêtre — on écrit un article, ça
 * mérite la page entière.
 */
export function MarketingView() {
  const marketing = useMarketing();

  if (marketing.open) {
    const ouvert = marketing.open;
    return (
      <ArticleEditor
        key={ouvert.realisation.project_id}
        entry={ouvert}
        saving={marketing.saving}
        onBack={() => marketing.setOpenId(null)}
        onSave={async (article) => {
          if (await marketing.save(ouvert.realisation.project_id, article)) {
            marketing.setOpenId(null);
          }
        }}
      />
    );
  }

  const publies = marketing.reads.filter(
    (r) => r.realisation.article.status === "publie",
  ).length;
  const citations = marketing.reads.filter(
    (r) => r.realisation.article.quote.trim() !== "",
  ).length;
  const sansVille = marketing.reads.filter(
    (r) => r.realisation.city.trim() === "",
  ).length;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-base font-semibold">Marketing</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          Les affaires réalisées, transformées en réalisations publiables.
        </p>
      </header>

      {marketing.error && <ErrorNotice message={marketing.error} />}

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <Card className="gap-0 overflow-hidden py-0 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
            <p className="text-sm font-medium">
              {plural(marketing.visible.length, "réalisation")}
              <span className="text-muted-foreground ml-2 font-normal">
                {publies} publiée{publies > 1 ? "s" : ""}
              </span>
            </p>
            <div className="flex flex-wrap gap-1">
              {(["toutes", ...STATUS_ORDER] as const).map((key) => {
                const count =
                  key === "toutes"
                    ? marketing.reads.length
                    : marketing.reads.filter(
                        (r) => r.realisation.article.status === key,
                      ).length;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => marketing.setFilter(key)}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs transition-colors",
                      marketing.filter === key
                        ? "bg-selected text-brand-text font-medium"
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
            {marketing.loading && marketing.reads.length === 0 ? (
              <Skeleton className="h-64 w-full" />
            ) : marketing.visible.length === 0 ? (
              <EmptyState
                title="Aucune réalisation dans cet état"
                description="Une affaire apparaît ici dès que son étape passe à « réalisé »."
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {marketing.visible.map((entry) => (
                  <RealisationCard
                    key={entry.realisation.project_id}
                    entry={entry}
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
            {marketing.cities.length === 0 ? (
              <p className="text-muted-foreground text-xs">
                Aucune affaire réalisée ne porte de ville.
              </p>
            ) : (
              marketing.cities.map((city) => (
                <div
                  key={city.city}
                  className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1"
                >
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
              ))
            )}
            {/*
              Une affaire sans ville ne couvre rien. Le dire ici plutôt que de
              l'omettre : c'est une donnée qui manque, pas une ville qui n'a pas
              de chantier.
            */}
            {sansVille > 0 && (
              <p className="text-muted-foreground/70 border-t pt-2 text-[11px]">
                {sansVille} affaire{sansVille > 1 ? "s" : ""} sans lieu renseigné —
                elles ne comptent dans aucune ville.
              </p>
            )}
          </Panel>

          <Panel
            title="Citations clients"
            description="Une citation vaut mieux qu'un paragraphe de plus"
            icon={QuoteIcon}
            tone="warning"
            bodyClassName="px-4 py-3"
          >
            <p className="text-xs">
              <span className="text-warning font-medium">
                {citations} réalisation{citations > 1 ? "s" : ""}
              </span>{" "}
              sur {marketing.reads.length} portent une citation.
            </p>
            {/*
              Le CRM ne suit pas les demandes d'avis, et l'écran ne prétend pas
              le contraire : la citation se recueille auprès du client, puis se
              recopie ici.
            */}
            <p className="text-muted-foreground mt-1 text-[11px]">
              Le CRM ne suit pas les demandes d&apos;avis. Une citation se
              recueille auprès du client, puis se recopie dans l&apos;article.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
