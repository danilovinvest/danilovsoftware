import { ListSkeleton, PageSkeleton } from "@/shared/ui/loading";

/*
Une seule attente pour tous les réglages : ils partagent la même forme — un
titre, puis des panneaux empilés — et dix fichiers identiques ne diraient rien
de plus que celui-ci.
*/
export default function Loading() {
  return (
    <PageSkeleton
      title="Paramètres"
      hint="Le compte, l'espace de travail et les raccordements."
      hue="indigo"
    >
      <ListSkeleton rows={6} hue="indigo" />
    </PageSkeleton>
  );
}
