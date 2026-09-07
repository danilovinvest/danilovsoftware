"use client";

import { QuoteIcon } from "lucide-react";
import { formatDate } from "@/shared/lib/format";
import type { ReadRealisation } from "../lib/types";

/**
 * L'article tel qu'il paraîtrait sur le site.
 *
 * Il vaut mieux qu'une prévisualisation qu'on ouvre : à côté du formulaire, on
 * voit tout de suite qu'un chapô vide laisse un trou, et qu'un texte technique
 * sans photo n'a pas de raison d'exister.
 *
 * Les métadonnées — client, ville, date — ne se saisissent pas : elles viennent
 * de l'affaire. Les recopier garantirait qu'un jour elles divergent.
 */
export function ArticlePreview({ entry }: { entry: ReadRealisation }) {
  const realisation = entry.realisation;
  const article = realisation.article;

  return (
    <article className="bg-card flex flex-col gap-4 rounded-xl border p-5">
      <header className="flex flex-col gap-2">
        <p className="text-muted-foreground text-[11px] tracking-wide uppercase">
          Réalisation{realisation.city && ` · ${realisation.city}`}
        </p>
        <h2 className="font-heading text-lg leading-snug font-semibold">
          {article.title.trim() === "" ? (
            <span className="text-muted-foreground/50 italic">Titre à écrire</span>
          ) : (
            article.title
          )}
        </h2>
        {article.excerpt.trim() !== "" && (
          <p className="text-muted-foreground text-sm">{article.excerpt}</p>
        )}
        <p className="text-muted-foreground/70 text-[11px]">
          {realisation.customer_name}
          {realisation.started_at && ` · ${formatDate(realisation.started_at)}`}
          {article.published_at && ` · publié le ${formatDate(article.published_at)}`}
        </p>
      </header>

      <Section title="Le contexte" body={article.context} />
      <Section title="Notre solution" body={article.solution} />
      <Section title="Le résultat" body={article.result} />

      {article.quote.trim() !== "" && (
        <blockquote className="border-brand-text text-muted-foreground border-l-2 pl-3 text-sm italic">
          <QuoteIcon className="text-muted-foreground/40 mb-1 size-3.5" />
          {article.quote}
          {article.quote_author && (
            <footer className="text-muted-foreground/70 mt-1 text-[11px] not-italic">
              {article.quote_author}
            </footer>
          )}
        </blockquote>
      )}

      {article.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1 border-t pt-3">
          {article.keywords.map((keyword) => (
            <span
              key={keyword}
              className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-[11px]"
            >
              {keyword}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  if (body.trim() === "") return null;
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="text-muted-foreground text-sm whitespace-pre-line">{body}</p>
    </section>
  );
}
