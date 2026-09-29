import { GraphSkeleton } from "@/modules/graph";

/*
L'attente pendant que le script de l'écran arrive — Sigma et Graphology
compris. Même silhouette que celle du composant : les deux se relaient sans
que la page saute.
*/
export default function Loading() {
  return <GraphSkeleton />;
}
