import { revalidatePrefixes } from "@/shared/api/cache";

/**
 * Ce qu'une écriture de l'espace syndic périme ailleurs qu'à son écran : le
 * portefeuille des cabinets, la gestion des immeubles, la fiche (qui porte le
 * syndic courant) et la liste du recouvrement.
 */
export function refreshSyndicViews(): void {
  revalidatePrefixes(
    "customers:portfolio:",
    "customers:management:",
    "customers:detail:",
    "billing:recovery:",
  );
}
