import type { Hue } from "@/modules/shell";

/**
 * Les classes d'une teinte de module.
 *
 * Tailwind n'expanse pas les noms de classe construits à l'exécution :
 * `bg-h-${hue}-3` n'existerait dans aucune feuille. La table est donc écrite en
 * entier — dix lignes qui garantissent que la couleur sort du build.
 *
 * Trois usages, trois entrées :
 *  - `soft` — le fond des pastilles et de l'entrée de navigation active ;
 *  - `text` — la couleur lisible sur ce fond ;
 *  - `solid` — la couleur pleine, pour un point ou un liseré.
 */
export const HUE: Record<Hue, { soft: string; text: string; solid: string }> = {
  violet: { soft: "bg-h-violet-3", text: "text-h-violet-11", solid: "bg-h-violet-9" },
  indigo: { soft: "bg-h-indigo-3", text: "text-h-indigo-11", solid: "bg-h-indigo-9" },
  amber: { soft: "bg-h-amber-3", text: "text-h-amber-11", solid: "bg-h-amber-9" },
  jade: { soft: "bg-h-jade-3", text: "text-h-jade-11", solid: "bg-h-jade-9" },
  grass: { soft: "bg-h-grass-3", text: "text-h-grass-11", solid: "bg-h-grass-9" },
  crimson: { soft: "bg-h-crimson-3", text: "text-h-crimson-11", solid: "bg-h-crimson-9" },
  cyan: { soft: "bg-h-cyan-3", text: "text-h-cyan-11", solid: "bg-h-cyan-9" },
  pink: { soft: "bg-h-pink-3", text: "text-h-pink-11", solid: "bg-h-pink-9" },
  orange: { soft: "bg-h-orange-3", text: "text-h-orange-11", solid: "bg-h-orange-9" },
  slate: { soft: "bg-h-slate-3", text: "text-h-slate-11", solid: "bg-h-slate-9" },
};

/** Le survol : un cran plus soutenu que le fond doux. */
export const HUE_HOVER: Record<Hue, string> = {
  violet: "hover:bg-h-violet-4",
  indigo: "hover:bg-h-indigo-4",
  amber: "hover:bg-h-amber-4",
  jade: "hover:bg-h-jade-4",
  grass: "hover:bg-h-grass-4",
  crimson: "hover:bg-h-crimson-4",
  cyan: "hover:bg-h-cyan-4",
  pink: "hover:bg-h-pink-4",
  orange: "hover:bg-h-orange-4",
  slate: "hover:bg-h-slate-4",
};
