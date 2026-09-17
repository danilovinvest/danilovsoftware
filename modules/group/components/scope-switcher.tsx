"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SCOPES,
  setScope,
  useScope,
  useScopeLocked,
  type Scope,
} from "../lib/scope";

/**
 * Le sélecteur de périmètre, en tête de la barre latérale.
 *
 * Il est là et pas dans les réglages parce qu'on en change plusieurs fois par
 * jour : c'est la question « je travaille pour laquelle des deux ? », pas un
 * paramètre qu'on pose une fois.
 *
 * **Une pastille qui s'ouvre, et non trois boutons côte à côte.** Le segmenté
 * précédent étalait les trois choix en permanence : dans une colonne de deux
 * cent trente-six pixels, les libellés se coupaient et l'on ne lisait plus
 * lequel était actif. Ici la pastille montre **où l'on est**, et les trois
 * choix n'apparaissent qu'au moment de choisir.
 *
 * Chaque société porte sa marque — deux lettres sur un aplat de sa teinte.
 * C'est ce qui rend le périmètre reconnaissable du coin de l'œil, une fois
 * qu'on ne lit plus le libellé.
 */
const MARQUES: Record<Scope, { sigle: string; classe: string }> = {
  tous: { sigle: "TG", classe: "bg-h-slate-9 text-white" },
  "ompt-structure": { sigle: "OS", classe: "bg-h-indigo-9 text-white" },
  "ompt-groupe": { sigle: "OG", classe: "bg-h-amber-9 text-h-amber-11" },
};

export function ScopeSwitcher() {
  const scope = useScope();
  const locked = useScopeLocked();
  const [open, setOpen] = useState(false);
  const bloc = useRef<HTMLDivElement>(null);

  // Un clic ailleurs referme, comme tout menu. Le panneau étant posé dans le
  // flux et non téléporté, il suffit de regarder si la cible est dedans.
  useEffect(() => {
    if (!open) return;
    function ailleurs(event: MouseEvent) {
      if (!bloc.current?.contains(event.target as Node)) setOpen(false);
    }
    function echap(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", ailleurs);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", ailleurs);
      document.removeEventListener("keydown", echap);
    };
  }, [open]);

  const actif = SCOPES.find((entry) => entry.id === scope) ?? SCOPES[0];
  const marque = MARQUES[scope];

  /*
    Un compte lié à sa société n'a rien à choisir : le serveur lui répond sur
    son périmètre quoi qu'il demande, et un sélecteur qui ne sélectionne rien
    fait chercher pourquoi il ne répond pas. Il s'efface — l'écran dit déjà
    dans quelle société on est, par son sous-domaine et par le portail.

    L'effacement est décidé **après** les crochets et jamais avant : un retour
    anticipé placé plus haut changerait le nombre de crochets appelés entre
    deux rendus, ce que React interdit.
  */
  if (locked) return null;

  return (
    <div ref={bloc} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        title={actif.hint}
        onClick={() => setOpen((value) => !value)}
        /*
          Le verre dépoli : un fond translucide et un flou d'arrière-plan
          plutôt qu'un aplat. Sur la toile teintée de la barre latérale, c'est
          ce qui détache la pastille sans lui donner de bordure franche.
        */
        className="bg-card/60 hover:bg-card/80 border-border/60 flex h-10 w-full items-center gap-2 rounded-full border px-1.5 shadow-sm backdrop-blur-md transition-colors"
      >
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
            marque.classe,
          )}
        >
          {marque.sigle}
        </span>
        <span className="min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden">
          <span className="block truncate text-xs font-medium">{actif.label}</span>
        </span>
        <ChevronsUpDownIcon className="text-muted-foreground mr-1 size-3.5 shrink-0 group-data-[collapsible=icon]:hidden" />
      </button>

      {/*
        Le panneau reste monté et s'efface : une apparition en fondu et en
        échelle se lit comme un mouvement, là où un montage sec fait sauter la
        colonne. `pointer-events-none` l'empêche d'intercepter les clics quand
        il est invisible.
      */}
      <ul
        role="listbox"
        aria-label="Périmètre de travail"
        className={cn(
          "bg-popover/95 border-border/60 absolute top-[calc(100%+0.375rem)] left-0 z-30 w-full origin-top overflow-hidden rounded-xl border p-1 shadow-lg backdrop-blur-md transition-[opacity,transform] duration-150",
          open
            ? "pointer-events-auto scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0",
        )}
      >
        {SCOPES.map((entry) => {
          const choisi = entry.id === scope;
          const sien = MARQUES[entry.id];
          return (
            <li key={entry.id}>
              <button
                type="button"
                role="option"
                aria-selected={choisi}
                onClick={() => {
                  setScope(entry.id);
                  setOpen(false);
                }}
                className="hover:bg-accent flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors"
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                    sien.classe,
                  )}
                >
                  {sien.sigle}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">
                    {entry.label}
                  </span>
                  <span className="text-muted-foreground/70 block truncate text-[10px] leading-tight">
                    {entry.hint}
                  </span>
                </span>
                <CheckIcon
                  className={cn(
                    "text-brand-text size-3.5 shrink-0",
                    !choisi && "invisible",
                  )}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
