/**
 * Préférences d'affichage, propres au poste.
 *
 * Elles ne partent pas à l'API : le thème et l'échelle décrivent un écran, pas
 * un compte. Les stocker côté serveur les ferait voyager d'un poste à l'autre,
 * ce qui est exactement ce qu'on ne veut pas — le portable du chargé
 * d'affaires et l'écran du bureau n'ont pas les mêmes besoins.
 */

import { DEFAULT_PALETTE, isPaletteId } from "./palettes";

export type ThemeChoice = "light" | "dark" | "system";

export type Preferences = {
  theme: ThemeChoice;
  /**
   * Palette de couleur. Orthogonale au clair/sombre : chaque palette existe
   * dans les deux modes, on ne choisit donc pas « Corail sombre » mais
   * « Corail » puis « Sombre ».
   */
  palette: string;
  /** Taille de l'interface en pourcentage : 100 = réglage du navigateur. */
  scale: number;
};

export const DEFAULT_PREFERENCES: Preferences = {
  theme: "system",
  palette: DEFAULT_PALETTE,
  scale: 100,
};

export const SCALE_OPTIONS = [90, 100, 110, 125] as const;

const STORAGE_KEY = "danilov-crm.preferences";

/*
 * Le stockage est un « external store » au sens de React : une valeur qui vit
 * hors de l'arbre, que plusieurs composants lisent. `useSyncExternalStore`
 * s'en charge sans effet de synchronisation ni setState au montage — et sert
 * un instantané serveur distinct, ce qui évite l'écart d'hydratation qu'un
 * `useState(() => localStorage…)` provoquerait.
 */

let cache: Preferences | null = null;
const listeners = new Set<() => void>();

function read(): Preferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return {
      theme:
        parsed.theme === "light" || parsed.theme === "dark" || parsed.theme === "system"
          ? parsed.theme
          : DEFAULT_PREFERENCES.theme,
      palette: isPaletteId(parsed.palette)
        ? parsed.palette
        : DEFAULT_PREFERENCES.palette,
      scale:
        typeof parsed.scale === "number" && parsed.scale >= 75 && parsed.scale <= 150
          ? parsed.scale
          : DEFAULT_PREFERENCES.scale,
    };
  } catch {
    // Navigation privée, stockage refusé : les défauts font l'affaire.
    return DEFAULT_PREFERENCES;
  }
}

export function subscribePreferences(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function preferencesSnapshot(): Preferences {
  cache ??= read();
  return cache;
}

export function preferencesServerSnapshot(): Preferences {
  return DEFAULT_PREFERENCES;
}

export function writePreferences(patch: Partial<Preferences>) {
  cache = { ...preferencesSnapshot(), ...patch };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Le réglage vaut pour la session même si on ne peut pas l'écrire.
  }
  for (const listener of listeners) listener();
}

/** Résout « système » en interrogeant le poste. */
export function resolveTheme(choice: ThemeChoice): "light" | "dark" {
  if (choice !== "system") return choice;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Applique le thème et l'échelle au document.
 *
 * Le même code est repris tel quel dans le script anti-scintillement du layout :
 * si l'un des deux change, l'autre doit suivre, d'où la forme réduite.
 */
export function applyPreferences(preferences: Preferences) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolveTheme(preferences.theme) === "dark");

  // La palette par défaut est celle de :root, sans attribut — l'absence de
  // `data-theme` est donc une valeur, pas un oubli.
  if (preferences.palette === DEFAULT_PALETTE) {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", preferences.palette);
  }

  root.style.fontSize = preferences.scale === 100 ? "" : `${preferences.scale}%`;
}
