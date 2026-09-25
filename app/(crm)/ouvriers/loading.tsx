import { TableSkeleton } from "@/shared/ui/loading";

/**
 * L'attente du téléchargement du script, avant celle des données.
 *
 * Même forme et même teinte que le squelette du composant : entre les deux,
 * aucune ligne ne bouge.
 */
export default function Loading() {
  return <TableSkeleton hue="amber" />;
}
