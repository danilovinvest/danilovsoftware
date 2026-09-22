/*
  La dernière page consultée hors des réglages, pour leur bouton « Retour ».

  Il menait en dur à la liste des fiches : ouvrir les réglages depuis l'agenda
  et en ressortir ramenait ailleurs que là où l'on était. La page est notée à
  chaque navigation (`ReturnRouteTracker`, monté par la coque) et lue **au
  clic**, jamais au rendu — `sessionStorage` n'existe pas côté serveur, et
  l'adresse du lien différerait entre les deux rendus. Même patron que
  `lastListHref` des fiches.

  `sessionStorage` et non `localStorage` : c'est le parcours de cet onglet, pas
  une préférence du poste.
*/
const KEY = "crm:settings:return-to";
const FALLBACK = "/dashboard";

export function rememberReturnRoute(href: string): void {
  if (href.startsWith("/settings")) return;
  try {
    sessionStorage.setItem(KEY, href);
  } catch {
    // Stockage refusé (navigation privée) : le retour mène au tableau de bord.
  }
}

export function lastReturnRoute(): string {
  try {
    const href = sessionStorage.getItem(KEY);
    // Une valeur qui ne serait pas un chemin de ce site n'est pas suivie.
    return href && href.startsWith("/") && !href.startsWith("//") ? href : FALLBACK;
  } catch {
    return FALLBACK;
  }
}
