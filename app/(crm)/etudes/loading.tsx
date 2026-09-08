import { CardsSkeleton, PageSkeleton } from "@/shared/ui/loading";

export default function Loading() {
  return (
    <PageSkeleton
      title="Études"
      hint="Le carnet du bureau d'études : ce qui est en production, ce qui est rendu."
      hue="indigo"
    >
      <div className="p-3">
        <CardsSkeleton count={8} hue="indigo" />
      </div>
    </PageSkeleton>
  );
}
