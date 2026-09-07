import { cn } from "@/lib/utils";
import { HUE } from "@/shared/ui/hue";
import type { Hue } from "@/modules/shell";

/**
 * Les attentes du CRM, dessinées à la forme de ce qu'elles précèdent.
 *
 * Un rond qui tourne dit qu'il se passe quelque chose ; il ne dit pas quoi, et
 * il fait sauter la page quand le contenu arrive à sa place. Une silhouette
 * dit **ce qui arrive** — une liste de messages, un arbre de dossiers, un
 * tableau — et le contenu s'y substitue sans déplacer une ligne.
 *
 * Chaque écran passe sa **teinte de module**, la même que dans la barre
 * latérale : l'attente de la messagerie est cyan, celle des chantiers ambre.
 * On sait où l'on arrive avant que ce soit arrivé.
 *
 * Le miroitement (`animate-shimmer`) balaie de gauche à droite plutôt que de
 * pulser : une pulsation fait clignoter toute la page d'un coup, un balayage
 * a un sens de lecture et se remarque moins au bout de trois secondes.
 */

/** Une barre. C'est la brique de tout le reste. */
export function Bar({
  className,
  hue,
}: {
  className?: string;
  hue?: Hue;
}) {
  return (
    <div
      className={cn(
        "animate-shimmer h-3 rounded-md",
        hue ? HUE[hue].soft : "bg-muted",
        className,
      )}
    />
  );
}

/**
 * Une liste de lignes : pastille, deux lignes de texte, une valeur à droite.
 *
 * C'est la forme de presque toutes les listes du CRM — courriels, dossiers,
 * fiches, tâches. Les largeurs varient d'une ligne à l'autre : trois barres
 * identiques empilées se lisent comme un tableau vide, pas comme du texte qui
 * charge.
 */
export function ListSkeleton({
  rows = 8,
  hue,
  className,
}: {
  rows?: number;
  hue?: Hue;
  className?: string;
}) {
  return (
    <div className={cn("divide-border/60 flex flex-col divide-y", className)}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 px-3 py-2.5">
          <Bar hue={hue} className="size-7 shrink-0 rounded-md" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Bar className={LARGEURS[index % LARGEURS.length]} />
            <Bar className={cn("h-2", PETITES[index % PETITES.length])} />
          </div>
          <Bar className="h-2 w-12 shrink-0" />
        </div>
      ))}
    </div>
  );
}

// Des largeurs qui ne se répètent pas d'une ligne à l'autre : c'est ce qui
// fait ressembler un bloc de barres à du texte.
const LARGEURS = ["w-2/3", "w-1/2", "w-5/6", "w-3/5", "w-3/4"];
const PETITES = ["w-1/3", "w-2/5", "w-1/4", "w-1/2", "w-1/3"];

/** Un tableau : sa ligne d'en-tête, puis ses lignes. */
export function TableSkeleton({
  rows = 8,
  columns = 5,
  hue,
}: {
  rows?: number;
  columns?: number;
  hue?: Hue;
}) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-4 border-b px-3 py-2">
        {Array.from({ length: columns }, (_, index) => (
          <Bar key={index} className="h-2 flex-1" hue={index === 0 ? hue : undefined} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex items-center gap-4 px-3 py-3">
          {Array.from({ length: columns }, (_, col) => (
            <Bar
              key={col}
              className={cn("flex-1", col === 0 ? "h-3.5" : "h-3", COLONNES[col % 3])}
              hue={col === 0 ? hue : undefined}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

const COLONNES = ["", "opacity-80", "opacity-60"];

/** Une grille de cartes : chantiers, réalisations, panneaux du tableau de bord. */
export function CardsSkeleton({
  count = 6,
  columns = "sm:grid-cols-2 xl:grid-cols-3",
  hue,
}: {
  count?: number;
  columns?: string;
  hue?: Hue;
}) {
  return (
    <div className={cn("grid gap-3", columns)}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="bg-card flex flex-col gap-2.5 rounded-xl border p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Bar className={LARGEURS[index % LARGEURS.length]} />
              <Bar className={cn("h-2", PETITES[index % PETITES.length])} />
            </div>
            <Bar hue={hue} className="h-4 w-14 shrink-0 rounded-md" />
          </div>
          <Bar className="h-2 w-2/5" />
          <Bar hue={hue} className="h-1.5 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

/**
 * L'attente d'un écran entier : son titre, puis sa forme.
 *
 * Le titre est réel, pas une barre grise — on le connaît avant d'avoir chargé
 * quoi que ce soit, et le lire pendant l'attente vaut mieux que de deviner un
 * rectangle. C'est ce qui distingue une attente d'un écran cassé.
 */
export function PageSkeleton({
  title,
  hint,
  hue,
  children,
}: {
  title: string;
  hint?: string;
  hue: Hue;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-base font-semibold">{title}</h1>
        {hint && <p className="text-muted-foreground mt-0.5 text-sm">{hint}</p>}
      </header>
      <div className="bg-card overflow-hidden rounded-xl border">{children}</div>
      <p className="text-muted-foreground/60 flex items-center gap-2 text-xs">
        <span
          className={cn(
            "size-1.5 animate-pulse rounded-full",
            HUE[hue].solid,
          )}
        />
        Chargement…
      </p>
    </div>
  );
}
