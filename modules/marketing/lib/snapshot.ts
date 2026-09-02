import { finishedWorksites } from "@/modules/worksites";
import type { Worksite } from "@/modules/worksites";
import type { Metric } from "@/shared/ui/metric-cards";
import { SEED_ARTICLES } from "./seed";
import type { Article, CityCoverage, MarketingSnapshot, Realisation } from "./types";

/**
 * Fabrique de l'écran marketing.
 *
 * Le module ne possède aucune donnée de chantier : il lit les chantiers livrés
 * par la surface publique du module `worksites` et n'ajoute qu'une couche
 * éditoriale. Un chantier terminé sans article n'est donc pas absent — il est
 * « à rédiger », ce qui est précisément l'information utile.
 */

const DAY = 86_400_000;

/** Titre proposé quand rien n'est écrit : le libellé du chantier et sa ville. */
function suggestTitle(worksite: Worksite): string {
  return `${worksite.label} — ${worksite.city}`;
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

function emptyArticle(worksite: Worksite): Article {
  return {
    worksite_id: worksite.id,
    status: "a_rediger",
    title: "",
    slug: "",
    excerpt: "",
    context: "",
    solution: "",
    result: "",
    keywords: [],
    photos: [],
    quote: "",
    quote_author: "",
    published_at: null,
    updated_at: null,
  };
}

/**
 * Ce qui manque avant de publier.
 *
 * L'ordre compte : c'est la liste qu'on lit de haut en bas en rédigeant, et
 * elle sert autant de score que de mode d'emploi.
 */
function assess(article: Article, worksite: Worksite) {
  const checks: Array<[boolean, string]> = [
    [article.title.trim() !== "", "un titre"],
    [article.excerpt.trim() !== "", "une accroche"],
    [article.context.trim() !== "", "le contexte"],
    [article.solution.trim() !== "", "la solution technique"],
    [article.result.trim() !== "", "le résultat"],
    [article.keywords.length > 0, "des mots-clés"],
    [article.photos.length > 0, "au moins une photo"],
    [
      article.quote.trim() !== "" || worksite.review_received_at === null,
      "la citation du client",
    ],
  ];

  const missing = checks.filter(([done]) => !done).map(([, label]) => label);
  return {
    missing,
    completeness: Math.round(((checks.length - missing.length) / checks.length) * 100),
  };
}

export function buildMarketingSnapshot(
  overrides: Record<string, Article>,
  at: Date = new Date(),
): MarketingSnapshot {
  const worksites = finishedWorksites(at);

  const realisations: Realisation[] = worksites.map((worksite) => {
    const article: Article = overrides[worksite.id] ?? {
      ...emptyArticle(worksite),
      ...SEED_ARTICLES[worksite.id],
    };

    const duration =
      worksite.starts_at !== null && worksite.completed_at !== null
        ? Math.max(
            1,
            Math.round(
              (new Date(worksite.completed_at).getTime() -
                new Date(worksite.starts_at).getTime()) /
                DAY,
            ),
          )
        : 0;

    return { worksite, article, duration, ...assess(article, worksite) };
  });

  const published = realisations.filter((r) => r.article.status === "publie");
  const drafting = realisations.filter(
    (r) => r.article.status === "brouillon" || r.article.status === "a_relire",
  );
  const untouched = realisations.filter((r) => r.article.status === "a_rediger");

  // Le référencement local est le nerf de la guerre pour un bureau d'études :
  // une ville couverte par un article publié, c'est une requête gagnée.
  const cityMap = new Map<string, CityCoverage>();
  for (const realisation of realisations) {
    const city = realisation.worksite.city;
    const entry = cityMap.get(city) ?? { city, published: 0, total: 0 };
    entry.total += 1;
    if (realisation.article.status === "publie") entry.published += 1;
    cityMap.set(city, entry);
  }
  const cities = [...cityMap.values()].sort(
    (a, b) => b.published - a.published || b.total - a.total,
  );

  const monthly = (pick: (r: Realisation) => number) => {
    const points = Array.from({ length: 12 }, () => 0);
    for (const realisation of realisations) {
      const reference = realisation.article.published_at ?? realisation.worksite.completed_at;
      if (reference === null) continue;
      const date = new Date(reference);
      const distance =
        (at.getFullYear() - date.getFullYear()) * 12 + (at.getMonth() - date.getMonth());
      const bucket = 11 - distance;
      if (bucket >= 0 && bucket < 12) points[bucket] += pick(realisation);
    }
    return points;
  };

  const metrics: Metric[] = [
    {
      key: "published",
      label: "Articles publiés",
      hint: "Réalisations en ligne sur le site",
      value: published.length,
      previous: null,
      note: `${realisations.length} chantiers livrés au total`,
      format: "count",
      trend: monthly((r) => (r.article.status === "publie" ? 1 : 0)),
      trend_label: "Publications par mois, 12 mois",
    },
    {
      key: "coverage",
      label: "Taux de valorisation",
      hint: "Part des chantiers livrés qui ont donné un article publié",
      value:
        realisations.length === 0
          ? 0
          : Math.round((published.length / realisations.length) * 100),
      previous: null,
      note: `${untouched.length} chantiers jamais rédigés`,
      format: "percent",
      trend: monthly(() => 1),
      trend_label: "Chantiers livrés par mois, 12 mois",
    },
    {
      key: "drafting",
      label: "En rédaction",
      hint: "Brouillons et articles en attente de relecture",
      value: drafting.length,
      previous: null,
      note:
        drafting.length === 0
          ? "Rien en cours"
          : `${drafting.reduce((t, r) => t + r.missing.length, 0)} éléments manquants`,
      format: "count",
      trend: monthly((r) =>
        r.article.status === "brouillon" || r.article.status === "a_relire" ? 1 : 0,
      ),
      trend_label: "Chantiers livrés par mois, 12 mois",
    },
    {
      key: "cities",
      label: "Villes couvertes",
      hint: "Communes où une réalisation est publiée — le référencement local",
      value: cities.filter((city) => city.published > 0).length,
      previous: null,
      note: `${cities.length} communes de chantier`,
      format: "count",
      trend: monthly((r) => (r.article.status === "publie" ? 1 : 0)),
      trend_label: "Publications par mois, 12 mois",
    },
  ];

  return {
    generated_at: at.toISOString(),
    metrics,
    realisations,
    cities,
    reviews_missing: realisations.filter(
      (r) => r.worksite.review_received_at === null,
    ).length,
  };
}

export { emptyArticle, suggestTitle };
