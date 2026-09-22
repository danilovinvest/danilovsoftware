"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { rememberReturnRoute } from "../lib/return-route";

/**
 * Note la page courante, hors réglages, pour le « Retour » des réglages.
 *
 * Les paramètres comptent : revenir sur la liste des fiches, c'est revenir sur
 * ses filtres. `useSearchParams` impose une frontière Suspense : la coque monte
 * ce composant, qui ne rend rien, dans la sienne — le reste de la page n'en
 * dépend pas.
 */
export function ReturnRouteTracker() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    rememberReturnRoute(search ? `${pathname}?${search}` : pathname);
  }, [pathname, search]);

  return null;
}
