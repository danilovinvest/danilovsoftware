"use client";

import type { ReactNode, Ref } from "react";
import { ChevronRightIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

/**
 * Une section repliable d'une affaire ouverte : un titre, ce qu'elle contient
 * en un mot, et son contenu.
 *
 * Le compte (« 3/7 », « 12 ») se lit replié : c'est ce qui permet de ne pas
 * ouvrir une section pour savoir s'il y a quelque chose dedans. Le repère de
 * démo est posé sur le déclencheur, pour qu'une démo l'ouvre d'un clic — le
 * moteur ne clique pas ce qui est déjà ouvert (`aria-expanded`).
 */
export function ProjectSection({
  title,
  count,
  hint,
  open,
  onOpenChange,
  demo,
  sectionRef,
  children,
}: {
  title: string;
  /** Le compte affiché dans une pastille, à côté du titre. */
  count?: string | null;
  /** Une précision en gris, à droite — l'aperçu d'une note, par exemple. */
  hint?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  demo?: string;
  sectionRef?: Ref<HTMLDivElement>;
  children: ReactNode;
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <div ref={sectionRef} className="scroll-mt-4 border-t pt-3">
        <CollapsibleTrigger
          data-demo={demo}
          className="hover:text-foreground flex w-full items-center gap-2 text-left"
        >
          <ChevronRightIcon
            className={cn(
              "text-muted-foreground size-4 shrink-0 transition-transform",
              open && "rotate-90",
            )}
          />
          <span className="text-sm font-medium">{title}</span>
          {count && (
            <span className="bg-foreground/10 rounded-full px-1.5 text-[0.7rem] font-medium tabular-nums">
              {count}
            </span>
          )}
          {hint && !open && (
            <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">{hint}</span>
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">{children}</CollapsibleContent>
      </div>
    </Collapsible>
  );
}
