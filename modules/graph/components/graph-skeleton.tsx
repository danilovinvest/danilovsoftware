import { Bar } from "@/shared/ui/loading";

/**
 * L'attente du graphe, à la forme de l'écran : la colonne des filtres, la
 * barre des chiffres, la toile. Indigo, la teinte des fiches. Le `loading.tsx`
 * de la route la reprend telle quelle — les deux attentes se relaient sans
 * qu'une ligne ne bouge.
 */
export function GraphSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Bar hue="indigo" className="h-5 w-48" />
        <Bar className="h-2.5 w-80 max-w-full" />
      </div>
      <div className="grid min-h-[70dvh] flex-1 gap-3 md:min-h-0 md:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="hidden flex-col gap-3 md:flex">
          <Bar className="h-8 w-full" />
          {Array.from({ length: 9 }, (_, index) => (
            <Bar key={index} className={index % 3 === 0 ? "w-2/3" : "w-5/6"} />
          ))}
        </div>
        <div className="bg-card flex flex-col gap-3 rounded-xl border p-3">
          <div className="flex gap-3">
            <Bar className="w-20" />
            <Bar className="w-16" />
            <Bar className="w-28" />
          </div>
          <Bar hue="indigo" className="h-auto flex-1 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
