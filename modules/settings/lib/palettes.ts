/**
 * Palettes de couleur du CRM.
 *
 * Le registre ne sert qu'à l'interface de choix : les couleurs réelles vivent
 * dans `app/themes.css`, sous `:root[data-theme="…"]`. On ne garde ici que de
 * quoi peindre une vignette — l'accent et deux surfaces, en clair comme en
 * sombre — pour que l'aperçu montre la palette sans avoir à l'appliquer.
 *
 * Ajouter une palette = l'ajouter au script de génération (voir CLAUDE.md),
 * régénérer `themes.css`, puis ajouter une entrée ici.
 */

export type PaletteSwatch = { base: string; raised: string };

export type Palette = {
  id: string;
  label: string;
  accent: { light: string; dark: string };
  surface: { light: PaletteSwatch; dark: PaletteSwatch };
};

export const PALETTES: Palette[] = [
  {
    // La palette de la maison : l'orange du profilé, sur le gris froid que
    // demande le bleu nuit du lettrage. Elle est en tête parce que c'est
    // celle qu'un poste neuf reçoit.
    id: "ompt",
    label: "OMPT",
    accent: { light: "#f76b15", dark: "#f76b15" },
    surface: {
      light: { base: "#fcfcfd", raised: "#e8e8ec" },
      dark: { base: "#111113", raised: "#212225" },
    },
  },
  {
    id: "azur",
    label: "Azur",
    accent: { light: "#3e63dd", dark: "#3e63dd" },
    surface: {
      // Slate en clair, comme l'échelle de `:root` : la vignette mentirait si
      // elle montrait le gris neutre qu'Azur avait avant.
      light: { base: "#fcfcfd", raised: "#e8e8ec" },
      dark: { base: "#171717", raised: "#1d1d1d" },
    },
  },
  {
    id: "ocean",
    label: "Océan",
    accent: { light: "#00a2c7", dark: "#00a2c7" },
    surface: {
      light: { base: "#fcfcfd", raised: "#f0f0f3" },
      dark: { base: "#111113", raised: "#212225" },
    },
  },
  {
    id: "emeraude",
    label: "Émeraude",
    accent: { light: "#29a383", dark: "#29a383" },
    surface: {
      light: { base: "#fbfdfc", raised: "#eef1f0" },
      dark: { base: "#101211", raised: "#202221" },
    },
  },
  {
    id: "menthe",
    label: "Menthe",
    accent: { light: "#12a594", dark: "#12a594" },
    surface: {
      light: { base: "#fbfdfc", raised: "#eef1f0" },
      dark: { base: "#101211", raised: "#202221" },
    },
  },
  {
    id: "citron",
    label: "Citron",
    accent: { light: "#bdee63", dark: "#bdee63" },
    surface: {
      light: { base: "#fcfdfc", raised: "#eff1ef" },
      dark: { base: "#111210", raised: "#212220" },
    },
  },
  {
    id: "ambre",
    label: "Ambre",
    accent: { light: "#ffc53d", dark: "#ffc53d" },
    surface: {
      light: { base: "#fdfdfc", raised: "#f1f0ef" },
      dark: { base: "#111110", raised: "#222221" },
    },
  },
  {
    id: "corail",
    label: "Corail",
    accent: { light: "#f76b15", dark: "#f76b15" },
    surface: {
      light: { base: "#fdfdfc", raised: "#f1f0ef" },
      dark: { base: "#111110", raised: "#222221" },
    },
  },
  {
    id: "grenat",
    label: "Grenat",
    accent: { light: "#e93d82", dark: "#e93d82" },
    surface: {
      light: { base: "#fdfcfd", raised: "#f2eff3" },
      dark: { base: "#121113", raised: "#232225" },
    },
  },
  {
    id: "violette",
    label: "Violette",
    accent: { light: "#6e56cf", dark: "#6e56cf" },
    surface: {
      light: { base: "#fdfcfd", raised: "#f2eff3" },
      dark: { base: "#121113", raised: "#232225" },
    },
  },
  {
    id: "magenta",
    label: "Magenta",
    accent: { light: "#d6409f", dark: "#d6409f" },
    surface: {
      light: { base: "#fdfcfd", raised: "#f2eff3" },
      dark: { base: "#121113", raised: "#232225" },
    },
  },
];

/**
 * Palette servie par :root et .dark, sans attribut `data-theme`.
 *
 * C'est celle reprise de Twenty, et elle reste le socle du fichier de styles :
 * l'absence de `data-theme` est donc une valeur, pas un oubli. Elle n'est plus
 * celle qu'on reçoit par défaut — ce sont deux questions différentes, et les
 * confondre obligerait à réécrire :root à chaque changement de marque.
 */
export const ROOT_PALETTE = "azur";

/** Palette d'un poste qui n'a rien choisi. */
export const DEFAULT_PALETTE = "ompt";

export function isPaletteId(value: unknown): value is string {
  return typeof value === "string" && PALETTES.some((p) => p.id === value);
}
