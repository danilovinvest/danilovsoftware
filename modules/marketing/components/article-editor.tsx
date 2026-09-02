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
import { activityName } from "@/modules/group";
import { euros, formatDate } from "@/shared/lib/format";
import { SelectField, TextAreaField, TextField } from "@/shared/ui/form";
import { TONE_SOFT } from "@/shared/ui/panel";
import { ARTICLE_STATUS, PHOTO_KIND, STATUS_ORDER } from "../lib/labels";
import { slugify, suggestTitle } from "../lib/snapshot";
import type { Article, ArticleStatus, Photo, Realisation } from "../lib/types";
import { ArticlePreview } from "./article-preview";

/**
 * L'éditeur de réalisation.
 *
 * Deux colonnes : la saisie à gauche, l'article tel qu'il paraîtra à droite.
 * Écrire pour le site sans voir le rendu, c'est écrire à l'aveugle — et la
 * moitié des articles finissent avec un chapô vide qu'on n'avait pas remarqué.
 *
 * Rien de ce qui vient du chantier n'est saisissable : ville, durée, société,
 * technique. Le marketing n'ajoute que du texte.
 */
export function ArticleEditor({
  realisation,
  onBack,
  onSave,
}: {
  realisation: Realisation;
  onBack: () => void;
  onSave: (article: Article) => void;
}) {
  const { worksite } = realisation;
  const [draft, setDraft] = useState<Article>(realisation.article);
  const [keywords, setKeywords] = useState(realisation.article.keywords.join(", "));

  function set<K extends keyof Article>(key: K, value: Article[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  /** Reprend ce que le chantier sait déjà : titre, slug et mots-clés de base. */
  function prefill() {
    const title = draft.title.trim() === "" ? suggestTitle(worksite) : draft.title;
    setDraft((current) => ({
      ...current,
      title,
      slug: current.slug.trim() === "" ? slugify(title) : current.slug,
      context:
        current.context.trim() === ""
          ? `Chantier livré à ${worksite.city} pour ${worksite.customer_name}, ` +
            `en ${realisation.duration} jours.`
          : current.context,
    }));
    const base = [worksite.city.toLowerCase(), activityName(worksite.activity_id).toLowerCase()];
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
      published_at:
        status === "publie"
          ? (draft.published_at ?? new Date().toISOString().slice(0, 10))
          : draft.published_at,
    });
  }

  function addPhoto(kind: Photo["kind"]) {
    // L'identifiant se déduit des photos déjà là plutôt que de l'horloge :
    // une fonction de rendu doit rester pure, et supprimer puis rajouter une
    // photo ne doit pas ressusciter un identifiant déjà pris.
    const next =
      draft.photos.reduce(
        (max, photo) => Math.max(max, Number(photo.id.replace(/\D/g, "")) || 0),
        0,
      ) + 1;

    set("photos", [
      ...draft.photos,
      { id: `p${next}`, label: `${kind}-${next}.jpg`, caption: "", kind },
    ]);
  }

  // La prévisualisation suit la saisie sans attendre l'enregistrement.
  const live: Realisation = {
    ...realisation,
    article: {
      ...draft,
      keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
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
              "rounded-[4px] px-1.5 py-0.5 text-[11px]",
              TONE_SOFT[ARTICLE_STATUS[draft.status].tone],
            )}
          >
            {ARTICLE_STATUS[draft.status].label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => commit(draft.status === "a_rediger" ? "brouillon" : draft.status)}>
            Enregistrer
          </Button>
          <Button size="sm" onClick={() => commit("publie")}>
            <CheckIcon />
            {draft.status === "publie" ? "Mettre à jour" : "Publier"}
          </Button>
        </div>
      </div>

      {/* Ce que le chantier apporte, et que personne n'a à ressaisir. */}
      <div className="bg-muted/40 grid gap-3 rounded-lg border px-4 py-3 text-xs sm:grid-cols-4">
        <Fact label="Client" value={worksite.customer_name} />
        <Fact label="Chantier" value={`${worksite.label} · ${worksite.city}`} />
        <Fact
          label="Livré"
          value={`${formatDate(worksite.completed_at)} · ${realisation.duration} jours`}
        />
        <Fact
          label="Métier"
          value={`${activityName(worksite.activity_id)} · ${euros(worksite.amount_ht)} HT`}
        />
      </div>

      {realisation.missing.length > 0 && (
        <p className="text-warning bg-warning-soft/50 rounded-lg px-3 py-2 text-xs">
          Avant publication, il manque : {realisation.missing.join(", ")}.
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

          {/* ---- Photos ------------------------------------------------- */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium">Photos</span>
              <div className="flex gap-1">
                {(Object.keys(PHOTO_KIND) as Photo["kind"][]).map((kind) => (
                  <Button
                    key={kind}
                    variant="ghost"
                    size="sm"
                    className="h-7"
                    onClick={() => addPhoto(kind)}
                  >
                    <ImagePlusIcon className="size-3.5" />
                    {PHOTO_KIND[kind]}
                  </Button>
                ))}
              </div>
            </div>

            {draft.photos.length === 0 ? (
              <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-4 text-center text-[11px]">
                Aucune photo. Un article de chantier sans image ne sera pas lu.
              </p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {draft.photos.map((photo) => (
                  <li key={photo.id} className="flex items-center gap-2 px-3 py-2">
                    <span className="bg-muted text-muted-foreground shrink-0 rounded-[4px] px-1.5 py-0.5 text-[11px]">
                      {PHOTO_KIND[photo.kind]}
                    </span>
                    <input
                      value={photo.caption}
                      placeholder={photo.label}
                      onChange={(event) =>
                        set(
                          "photos",
                          draft.photos.map((entry) =>
                            entry.id === photo.id
                              ? { ...entry, caption: event.target.value }
                              : entry,
                          ),
                        )
                      }
                      className="placeholder:text-muted-foreground/60 min-w-0 flex-1 bg-transparent text-xs outline-none"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive size-7"
                      onClick={() =>
                        set(
                          "photos",
                          draft.photos.filter((entry) => entry.id !== photo.id),
                        )
                      }
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ---- Avis client -------------------------------------------- */}
          <TextAreaField
            label="Citation du client"
            hint={
              worksite.review_received_at === null
                ? "Aucun avis n'a été recueilli sur ce chantier — à demander avant de citer."
                : `Avis reçu le ${formatDate(worksite.review_received_at)}.`
            }
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
