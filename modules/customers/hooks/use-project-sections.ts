"use client";

import { useCallback, useRef, useState } from "react";
import type { ProjectSection } from "../lib/project-sections";

/**
 * Les sections ouvertes d'une affaire, et le geste qui en amène une à l'écran.
 *
 * Plusieurs peuvent être ouvertes à la fois — on lit un devis en regardant
 * l'après-signature. Rien n'est retenu : rouvrir la fiche repart de la section
 * que l'affaire réclame, et c'est voulu, puisque cette section change avec
 * l'affaire.
 *
 * `reveal` remplace l'ancien changement d'onglet : « Réserver une date »
 * basculait sur l'onglet Après-signature, il ouvre désormais la section et la
 * fait venir à l'écran — ouverte hors de vue, elle n'aurait rien montré.
 */
export function useProjectSections(initial: ProjectSection): {
  isOpen: (section: ProjectSection) => boolean;
  setOpen: (section: ProjectSection, open: boolean) => void;
  reveal: (section: ProjectSection) => void;
  refFor: (section: ProjectSection) => (element: HTMLDivElement | null) => void;
} {
  const [opened, setOpened] = useState<ReadonlySet<ProjectSection>>(() => new Set([initial]));
  const elements = useRef(new Map<ProjectSection, HTMLDivElement>());

  const setOpen = useCallback((section: ProjectSection, open: boolean) => {
    setOpened((previous) => {
      if (previous.has(section) === open) return previous;
      const next = new Set(previous);
      if (open) next.add(section);
      else next.delete(section);
      return next;
    });
  }, []);

  const reveal = useCallback(
    (section: ProjectSection) => {
      setOpen(section, true);
      // Une image plus tard : le contenu vient d'être monté, la section a sa
      // vraie hauteur et le défilement tombe au bon endroit.
      requestAnimationFrame(() =>
        elements.current.get(section)?.scrollIntoView({ block: "start", behavior: "smooth" }),
      );
    },
    [setOpen],
  );

  const refFor = useCallback(
    (section: ProjectSection) => (element: HTMLDivElement | null) => {
      if (element) elements.current.set(section, element);
      else elements.current.delete(section);
    },
    [],
  );

  return { isOpen: (section) => opened.has(section), setOpen, reveal, refFor };
}
