import { CATEGORY_META, CATEGORY_ORDER, type GraphCategory } from "./categories";
import { recordOf } from "./records";

/**
 * Les couleurs du thème, traduites pour Sigma.
 *
 * Sigma peint en WebGL et ne comprend que `#rrggbb` et `rgb(a)()` : ni
 * `var(--…)`, ni `color(display-p3 …)`, ni `color-mix()`. Or le CRM ne donne
 * que des variables, et ses teintes passent en P3 sur un écran qui le permet.
 * On laisse donc le navigateur résoudre : une sonde reçoit `color: var(--x)`,
 * sa couleur calculée est peinte sur un pixel de canevas sRGB, et le pixel
 * rendu est l'octet que Sigma attend. Aucune couleur n'est écrite ici — la
 * toile relit tout au changement de thème ou de palette.
 */
export type Rgb = readonly [number, number, number];

export type CanvasPalette = {
  categories: Record<GraphCategory, Rgb>;
  foreground: Rgb;
  muted: Rgb;
  border: Rgb;
  background: Rgb;
  brand: Rgb;
  font: string;
};

export function rgba(color: Rgb, alpha = 1): string {
  return `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
}

/** Mêle une couleur au fond : un nœud estompé reste une couleur pleine, sans transparence à trier. */
export function blend(color: Rgb, background: Rgb, amount: number): string {
  const mix = (i: 0 | 1 | 2) => Math.round(color[i] * amount + background[i] * (1 - amount));
  return `rgb(${mix(0)},${mix(1)},${mix(2)})`;
}

export function readPalette(host: HTMLElement): CanvasPalette {
  const probe = document.createElement("span");
  probe.style.display = "none";
  host.appendChild(probe);
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  const read = (variable: string): Rgb => {
    probe.style.color = `var(${variable})`;
    const computed = getComputedStyle(probe).color;
    if (!ctx) return [128, 128, 128];
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = computed;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return [r, g, b];
  };

  const palette: CanvasPalette = {
    categories: recordOf(CATEGORY_ORDER, (category) => read(`--h-${CATEGORY_META[category].hue}-9`)),
    foreground: read("--foreground"),
    muted: read("--muted-foreground"),
    border: read("--border"),
    background: read("--background"),
    brand: read("--brand"),
    font: getComputedStyle(host).fontFamily || "sans-serif",
  };
  probe.remove();
  return palette;
}
