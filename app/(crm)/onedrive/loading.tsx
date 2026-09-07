import { PageSkeleton, ListSkeleton } from "@/shared/ui/loading";

/*
L'attente pendant que le script de l'écran arrive.

Next monte cette silhouette dès la navigation, avant même que le module ne soit
téléchargé : c'est le seul endroit qui couvre ce temps-là. Le squelette du
composant, lui, couvre l'attente des données — les deux se relaient sans que la
page saute, parce qu'ils ont la même forme.
*/
export default function Loading() {
  return (
    <PageSkeleton
      title="OneDrive"
      hint="L'arborescence de l'entreprise, telle qu'elle est."
      hue="slate"
    >
      <ListSkeleton rows={9} hue="slate" />
    </PageSkeleton>
  );
}
