"use client";

import { useState } from "react";
import {
  ArrowLeftIcon,
  CheckIcon,
  ImagePlusIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { euros, formatDate } from "@/shared/lib/format";
import { SelectField, TextAreaField, TextField } from "@/shared/ui/form";
import { TONE_SOFT } from "@/shared/ui/panel";
import { ARTICLE_STATUS, STATUS_ORDER } from "../lib/labels";
import { slugify, suggestTitle } from "../lib/derive";
import type { Article, ArticleStatus, ReadRealisation } from "../lib/types";
import { ArticlePreview } from "./article-preview";

/**
 * L'éditeur de réalisation.
 *
 * Deux colonnes : la saisie à gauche, l'article tel qu'il paraîtra à droite.
 * Écrire pour le site sans voir le rendu, c'est écrire à l'aveugle — et la
 * moitié des articles finissent avec un chapô vide qu'on n'avait pas remarqué.
 *
 * Rien de ce qui vient de l'affaire n'est saisissable : client, ville, devis.
 * Le marketing n'ajoute que du texte.
 *
 * Il n'y a plus de photos ici. Celles d'un chantier vivent dans son dossier
 * OneDrive, où l'entreprise les range déjà : en tenir un second exemplaire dans
 * le CRM serait faux dès la première prise de vue. L'article renvoie au
 * dossier.
 */
export function ArticleEditor({
  entry,
  onBack,
  onSave,
  saving,
}: {
  entry: ReadRealisation;
  onBack: () => void;
  onSave: (article: Article) => void;
  saving: boolean;
}) {
  const realisation = entry.realisation;
  const [draft, setDraft] = useState<Article>(realisation.article);
  const [keywords, setKeywords] = useState(realisation.article.keywords.join(", "));

  function set<K extends keyof Article>(key: K, value: Article[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  /** Reprend ce que l'affaire sait déjà : titre, adresse et mots-clés de base. */
  function prefill() {
    const title = draft.title.trim() === "" ? suggestTitle(realisation) : draft.title;
    setDraft((current) => ({
      ...current,
      title,
      slug: current.slug.trim() === "" ? slugify(title) : current.slug,
      context:
        current.context.trim() === ""
          ? `Chantier réalisé${realisation.city ? ` à ${realisation.city}` : ""} ` +
            `pour ${realisation.customer_name}.`
          : current.context,
    }));
    // La ville d'abord : c'est le référencement local qui rapporte à un bureau
    // d'études, pas le mot « structure ».
    const base = [realisation.city.toLowerCase(), "bureau d'études structure"]
      .filter(Boolean);
    if (keywords.trim() === "") setKeywords(base.join(", "));
  }

  function commit(status: ArticleStatus) {
    onSave({
      ...draft,
      status,
      slug: draft.slug.trim() === "" ? slugify(draft.title) : draft.slug,
      keywords: keywords
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean),
    });
  }

  // La prévisualisation suit la saisie sans attendre l'enregistrement.
  const live: ReadRealisation = {
    ...entry,
    realisation: {
      ...realisation,
      article: {
        ...draft,
        keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
      },
    },
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeftIcon />
            Toutes les réalisations
          </Button>
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 text-[11px]",
              TONE_SOFT[ARTICLE_STATUS[draft.status].tone],
            )}
          >
            {ARTICLE_STATUS[draft.status].label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() =>
              commit(draft.status === "a_rediger" ? "brouillon" : draft.status)
            }
          >
            Enregistrer
          </Button>
          <Button size="sm" disabled={saving} onClick={() => commit("publie")}>
            <CheckIcon />
            {draft.status === "publie" ? "Mettre à jour" : "Publier"}
          </Button>
        </div>
      </div>

      {/* Ce que l'affaire apporte, et que personne n'a à ressaisir. */}
      <div className="bg-muted/40 grid gap-3 rounded-xl border px-4 py-3 text-xs sm:grid-cols-4">
        <Fact label="Client" value={realisation.customer_name} />
        <Fact label="Chantier" value={realisation.label} />
        <Fact label="Lieu" value={realisation.city || "non renseigné"} />
        <Fact
          label="Montant"
          value={
            realisation.amount_ht === "0" || realisation.amount_ht === ""
              ? "non chiffré"
              : `${euros(Number(realisation.amount_ht))} HT`
          }
        />
      </div>

      {entry.missing.length > 0 && (
        <p className="text-warning bg-warning-soft/50 rounded-lg px-3 py-2 text-xs">
          Avant publication, il manque : {entry.missing.join(", ")}.
        </p>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-2">
        {/* ---- Saisie -------------------------------------------------- */}
        <div className="flex flex-col gap-4">
          <div className="flex items-end gap-2">
            <TextField
              label="Titre de l'article"
              wrapperClassName="flex-1"
              placeholder="Ouverture d'un mur porteur à…"
              value={draft.title}
              onChange={(event) => {
                const title = event.target.value;
                setDraft((current) => ({
                  ...current,
                  title,
                  slug:
                    current.slug === "" || current.slug === slugify(current.title)
                      ? slugify(title)
                      : current.slug,
                }));
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={prefill}
              title="Reprendre le titre, l'adresse et les mots-clés du chantier"
            >
              <SparklesIcon />
              Pré-remplir
            </Button>
          </div>

          <TextField
            label="Adresse de la page"
            hint="Ce qui apparaîtra après /realisations/ sur le site"
            value={draft.slug}
            onChange={(event) => set("slug", event.target.value)}
          />

          <TextAreaField
            label="Accroche"
            hint="Deux phrases : ce qui résume la réalisation dans une liste"
            value={draft.excerpt}
            onChange={(event) => set("excerpt", event.target.value)}
          />

          <TextAreaField
            label="Le contexte"
            hint="Ce que le client voulait, et la difficulté de départ"
            value={draft.context}
            onChange={(event) => set("context", event.target.value)}
          />

          <TextAreaField
            label="Notre solution"
            hint="La partie technique — c'est elle qui parle aux architectes et aux syndics"
            value={draft.solution}
            onChange={(event) => set("solution", event.target.value)}
          />

          <TextAreaField
            label="Le résultat"
            value={draft.result}
            onChange={(event) => set("result", event.target.value)}
          />

          <TextField
            label="Mots-clés"
            hint="Séparés par des virgules. La ville en fait partie : c'est le référencement local."
            value={keywords}
            onChange={(event) => setKeywords(event.target.value)}
          />

          <div className="text-muted-foreground rounded-xl border border-dashed px-3 py-3 text-[11px]">
            {/* Les photos ne sont pas gérées ici, et c'est délibéré : celles du
                chantier sont dans son dossier OneDrive. Les recopier dans le
                CRM en ferait un second exemplaire, faux dès la prise de vue
                suivante. */}
            Les photos du chantier restent dans son dossier OneDrive. Le site les
            reprendra de là — le CRM n&apos;en tient pas de copie.
          </div>

          {/* ---- Avis client -------------------------------------------- */}
          <TextAreaField
            label="Citation du client"
            hint="À recueillir auprès du client avant de le citer."
            value={draft.quote}
            onChange={(event) => set("quote", event.target.value)}
          />
          <TextField
            label="Signature de la citation"
            placeholder="M. Dupont, propriétaire"
            value={draft.quote_author}
            onChange={(event) => set("quote_author", event.target.value)}
          />

          <SelectField
            label="État"
            options={STATUS_ORDER.map((status) => ({
              value: status,
              label: ARTICLE_STATUS[status].label,
            }))}
            value={draft.status}
            onValueChange={(value) => set("status", value as ArticleStatus)}
          />
        </div>

        {/* ---- Prévisualisation --------------------------------------- */}
        <div className="lg:sticky lg:top-4">
          <p className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wide uppercase">
            Aperçu sur le site
          </p>
          <ArticlePreview realisation={live} />
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-muted-foreground text-[11px]">{label}</p>
      <p className="truncate font-medium">{value}</p>
    </div>
  );
}
