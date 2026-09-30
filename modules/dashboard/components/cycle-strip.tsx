"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { FilterCounts, Tone } from "@/modules/customers";
import { ErrorNotice } from "@/shared/ui/feedback";
import { Bar } from "@/shared/ui/loading";
import { TONE_TEXT } from "@/shared/ui/panel";
import { plural } from "@/shared/lib/format";
import type { Live } from "../hooks/use-live";
import { cycleHref, reviewHref } from "../lib/today";

type Tile = {
  key: keyof FilterCounts;
  label: string;
  /** Ce que le chiffre compte — un compteur sans définition ment. */
  hint: string;
  tone: Tone;
};

/*
  Dans l'ordre du cycle d'une affaire, à une exception près : « à relancer »
  passe en tête. C'est le seul des cinq qui soit une alerte — les autres sont
  des étapes où l'on attend, lui est une étape où l'on a trop attendu.
*/
const TILES: Tile[] = [
  { key: "a_relancer", label: "À relancer", hint: "Devis sans réponse, relance due", tone: "danger" },
  { key: "sans_rdv", label: "Sans rendez-vous", hint: "Un rendez-vous reste à planifier", tone: "warning" },
  { key: "devis_en_attente", label: "Devis en attente", hint: "À établir ou en négociation", tone: "info" },
  { key: "acompte_en_attente", label: "Acompte en attente", hint: "Signé, acompte non encaissé", tone: "warning" },
  { key: "sans_date", label: "Sans date de chantier", hint: "Prêt à démarrer, rien de planifié", tone: "warning" },
];

/**
 * Où en sont les fiches, en cinq chiffres qui s'ouvrent.
 *
 * Ce sont les comptes de la liste des fiches (`/v1/customers/stats`), pas une
 * copie : chaque tuile mène à la liste filtrée qui contient exactement ce
 * qu'elle annonce. Un chiffre qu'on ne peut pas ouvrir est un décor.
 *
 * Un compte à zéro s'éteint : la couleur ne reste que là où il y a à faire.
 */
export function CycleStrip({ live }: { live: Live<{ by_filter: FilterCounts }> }) {
  const counts = live.data?.by_filter ?? null;

  return (
    <div className="flex flex-col gap-2">
      {live.error && <ErrorNotice message={live.error} onRetry={live.reload} />}
      <div className="bg-border ring-foreground/10 grid grid-cols-2 gap-px overflow-hidden rounded-xl ring-1 sm:grid-cols-3 xl:grid-cols-5">
        {TILES.map((tile, index) => {
          const value = counts?.[tile.key] ?? null;
          return (
            <Link
              key={tile.key}
              href={cycleHref(tile.key)}
              title={tile.hint}
              className={cn(
                "bg-card hover:bg-accent focus-visible:ring-ring/50 flex min-w-0 flex-col gap-0.5 px-4 py-3 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset",
                // La première tuile s'étire là où la grille laisserait une case vide.
                index === 0 && "col-span-2 xl:col-span-1",
              )}
            >
              <span className="text-muted-foreground truncate text-xs">{tile.label}</span>
              {value === null ? (
                // L'attente scintille, l'échec non : un squelette qui tourne
                // sous un message d'erreur promet une réponse qui ne vient pas.
                live.loading ? (
                  <Bar hue="violet" className="my-1.5 h-5 w-10" />
                ) : (
                  <span className="text-muted-foreground text-2xl leading-tight font-semibold">—</span>
                )
              ) : (
                <span
                  className={cn(
                    "text-2xl leading-tight font-semibold tabular-nums",
                    value > 0 ? TONE_TEXT[tile.tone] : "text-muted-foreground",
                  )}
                >
                  {value}
                </span>
              )}
              <span className="text-muted-foreground truncate text-[11px]">{tile.hint}</span>
            </Link>
          );
        })}
      </div>
      {counts && (counts.a_verifier > 0 || counts.a_completer > 0) && (
        /* La relecture n'est pas le cycle : une ligne, pas deux tuiles de plus. */
        <p className="text-muted-foreground text-xs">
          Relecture des fiches :{" "}
          <Link href={reviewHref("a_verifier")} className="hover:text-foreground underline underline-offset-2">
            {plural(counts.a_verifier, "fiche")} à vérifier
          </Link>
          {" · "}
          <Link href={reviewHref("a_completer")} className="hover:text-foreground underline underline-offset-2">
            {plural(counts.a_completer, "fiche")} à compléter
          </Link>
        </p>
      )}
    </div>
  );
}
