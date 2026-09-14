"use client";

import { SearchIcon } from "lucide-react";
import { setSearchOpen } from "../lib/search-palette";

/**
 * Le champ de recherche de la barre latérale.
 *
 * Comme celui de la barre du haut, il a l'air d'un champ et n'en est pas un :
 * il ouvre la palette, où vivent la saisie, le curseur et le clavier. La
 * palette est unique, ses déclencheurs sont deux — celui-ci sur un écran
 * large, celui du haut là où la colonne n'est pas affichée.
 *
 * Le raccourci reste ⌘K et non ⌘F : ⌘F est la recherche dans la page du
 * navigateur, et la confisquer priverait de chercher un mot dans une fiche.
 */
export function SidebarSearch() {
  return (
    <button
      type="button"
      onClick={() => setSearchOpen(true)}
      aria-label="Rechercher"
      title="Rechercher (⌘K)"
      className="bg-card/70 hover:bg-card text-muted-foreground hover:text-foreground focus-visible:ring-ring flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-[13.5px] shadow-xs transition-colors focus-visible:ring-2 focus-visible:outline-none group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
    >
      <SearchIcon className="size-4 shrink-0" />
      <span className="truncate group-data-[collapsible=icon]:hidden">Rechercher</span>
      <kbd className="bg-muted text-muted-foreground ml-auto rounded-md px-1.5 py-0.5 font-sans text-[11px] leading-4 group-data-[collapsible=icon]:hidden">
        ⌘K
      </kbd>
    </button>
  );
}
