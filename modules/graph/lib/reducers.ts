import type { EdgeDisplayData, NodeDisplayData } from "sigma/types";
import type { EdgeAttrs, NodeAttrs } from "./sync";
import { blend, rgba, type CanvasPalette } from "./theme-colors";

/**
 * Ce que Sigma peint de chaque nœud et de chaque trait, à l'instant.
 *
 * Les attributs du graphe ne portent que des faits (catégorie, taille,
 * archivée) ; la couleur, l'estompe et les étiquettes forcées sont décidées
 * ici, au dessin, à partir de l'état de la vue. C'est ce qui permet de
 * sélectionner, survoler ou changer de thème sans toucher au graphe — un
 * simple rafraîchissement.
 *
 * Module sans DOM, testé : la toile ne fait que brancher ces deux fonctions.
 */
export type ViewState = {
  palette: CanvasPalette;
  selected: string | null;
  /** Le nœud sélectionné et ses voisins. */
  selection: Set<string> | null;
  hovered: string | null;
  /** Le nœud survolé et ses voisins, quand rien n'est sélectionné. */
  hover: Set<string> | null;
  /** Les nœuds apparus à la dernière relecture, mis en avant un instant. */
  pulse: Set<string>;
};

export function nodeDisplay(id: string, data: NodeAttrs, view: ViewState): Partial<NodeDisplayData> {
  const { palette } = view;
  const base = palette.categories[data.category];
  const out: Partial<NodeDisplayData> = {
    x: data.x,
    y: data.y,
    size: data.size,
    label: data.label,
    color: data.archived ? blend(base, palette.background, 0.35) : rgba(base),
    zIndex: data.hub ? 0 : 1,
  };
  const focus = view.selection ?? view.hover;
  if (focus && !focus.has(id)) {
    out.color = blend(base, palette.background, 0.14);
    out.label = null;
    out.zIndex = 0;
  } else if (focus) {
    out.forceLabel = true;
    out.zIndex = 2;
  }
  if (id === view.selected || id === view.hovered) {
    out.highlighted = true;
    out.forceLabel = true;
    out.zIndex = 3;
  }
  if (id === view.selected) out.size = data.size * 1.3;
  if (view.pulse.has(id)) {
    out.highlighted = true;
    out.forceLabel = true;
    out.size = Math.max(data.size * 1.6, 8);
  }
  return out;
}

function edgeColor(data: EdgeAttrs, palette: CanvasPalette): string {
  if (data.family === "referred_project" || data.family === "referred_customer") {
    return rgba(palette.categories.apporteur, 0.75);
  }
  if (data.family === "link") return rgba(palette.foreground, 0.55);
  if (data.family === "shared_contact") return rgba(palette.categories.interlocuteur, 0.4);
  return rgba(palette.muted, 0.3);
}

/**
 * `ends` : les deux extrémités du trait. Pendant une sélection, seuls les
 * traits qui touchent le nœud choisi restent ; au survol, les autres
 * s'estompent sans disparaître — on ne fait que passer.
 */
export function edgeDisplay(data: EdgeAttrs, ends: [string, string], view: ViewState): Partial<EdgeDisplayData> {
  const out: Partial<EdgeDisplayData> = {
    size: data.size,
    type: data.type,
    color: edgeColor(data, view.palette),
    zIndex: data.inferred ? 0 : 1,
  };
  if (view.selected) {
    const touches = ends[0] === view.selected || ends[1] === view.selected;
    if (!touches) out.hidden = true;
    else out.size = data.size + 0.8;
    return out;
  }
  if (view.hovered) {
    const touches = ends[0] === view.hovered || ends[1] === view.hovered;
    out.color = touches ? edgeColor(data, view.palette) : rgba(view.palette.border, 0.35);
  }
  return out;
}
