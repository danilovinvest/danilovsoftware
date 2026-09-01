"use client";

import { createContext, useContext, useEffect, useState } from "react";

type PageTitleState = {
  title: string | null;
  setTitle: (title: string | null) => void;
};

const PageTitleContext = createContext<PageTitleState | null>(null);

/**
 * Permet à une page de nommer le dernier fil d'Ariane de l'en-tête (par
 * exemple le nom de la fiche ouverte), que la barre de navigation ne peut pas
 * deviner depuis l'URL seule.
 */
export function PageTitleProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitle] = useState<string | null>(null);
  return (
    <PageTitleContext.Provider value={{ title, setTitle }}>
      {children}
    </PageTitleContext.Provider>
  );
}

export function usePageTitle() {
  return useContext(PageTitleContext)?.title ?? null;
}

/** À appeler dans une page : le titre est nettoyé au démontage. */
export function useSetPageTitle(title: string | null) {
  const context = useContext(PageTitleContext);
  const setTitle = context?.setTitle;

  useEffect(() => {
    if (!setTitle) return;
    setTitle(title);
    return () => setTitle(null);
  }, [setTitle, title]);
}
