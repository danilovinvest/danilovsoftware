import type { ReactNode } from "react";

/*
  Une entrée de menu qui dit ce qu'elle fait, et ce qu'elle emporte.

  Le gabarit vient de la barre d'une affaire (`project-toolbar.tsx`), où sept
  boutons de même poids ont été ramenés aux deux qu'on fait tous les jours et à
  un menu « … » pour le reste. Trois menus le portent désormais — l'affaire, la
  société de la fiche, les gestes de la fiche — et trois copies auraient divergé
  au premier ajustement : c'est pour cela qu'il vit ici plutôt que recopié.

  Une icône dans sa tuile, l'intitulé, puis la phrase qui dit ce que le clic
  change. Sans cette phrase, « Archiver » et « Supprimer » se ressemblent assez
  pour qu'on hésite, et c'est l'hésitation qui fait cliquer de travers.
*/

/*
  Le survol reste neutre. La teinte d'accent de la palette — orange dans
  certaines — se lisait comme une alerte sur un geste ordinaire. Seule la
  suppression garde sa couleur, parce qu'elle en est une.
*/
export const MENU_ITEM =
  "items-start gap-2.5 px-2 py-2 focus:bg-muted focus:text-foreground not-data-[variant=destructive]:focus:**:text-foreground";

/** La même rangée, quand l'entrée est destructrice : elle garde sa teinte. */
export const MENU_ITEM_DANGER = "items-start gap-2.5 px-2 py-2";

/** L'étiquette qui coiffe un groupe d'entrées. */
export const MENU_LABEL =
  "text-muted-foreground px-2 pt-1 pb-1.5 text-[0.7rem] font-medium tracking-wide uppercase";

export function MenuAction({
  icon,
  label,
  hint,
  danger = false,
  trailing,
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  danger?: boolean;
  /** Ce qui se pose à droite de l'intitulé — une coche, un repère. */
  trailing?: ReactNode;
}) {
  return (
    <>
      <span
        className={
          danger
            ? "bg-danger-soft text-danger mt-0.5 grid size-7 shrink-0 place-items-center rounded-md [&_svg]:size-3.5"
            : "bg-muted text-muted-foreground mt-0.5 grid size-7 shrink-0 place-items-center rounded-md [&_svg]:size-3.5"
        }
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1.5 font-medium">
          {label}
          {trailing}
        </span>
        <span className={danger ? "text-danger/70 text-xs" : "text-muted-foreground text-xs"}>
          {hint}
        </span>
      </span>
    </>
  );
}
