import type FA2Layout from "graphology-layout-forceatlas2/worker";
import type { ForceAtlas2Settings } from "graphology-layout-forceatlas2";
import type Sigma from "sigma";
import type { VisibleGraph } from "./filters";
import type { GraphModel } from "./model";
import { edgeDisplay, nodeDisplay, type ViewState } from "./reducers";
import { createCanvasGraph, syncGraph, type CanvasGraph, type EdgeAttrs, type NodeAttrs, type Point } from "./sync";
import { readPalette, rgba } from "./theme-colors";

/**
 * La toile : Sigma, Graphology et ForceAtlas2, derrière une surface de sept
 * gestes que l'écran React appelle.
 *
 * Tout ce qui touche WebGL et les workers vit ici et n'est chargé **qu'au
 * montage**, par import dynamique (`createController`) : Sigma lit `window` et
 * WebGL dès qu'il s'exécute, et le rendu serveur de Next n'a ni l'un ni
 * l'autre.
 *
 * **La disposition tourne dans un worker** (ForceAtlas2) et s'arrête d'elle-même
 * au bout d'un temps proportionné à la taille du graphe : un calcul de force
 * qu'on laisse tourner fait chauffer un portable pour déplacer des points d'un
 * pixel. Elle ne reprend qu'à une arrivée massive de nœuds ; une fiche créée
 * naît à côté de ses voisins sans que le reste ne bouge.
 */
export type HoverInfo = { id: string; x: number; y: number };

export type ControllerCallbacks = {
  onSelect: (id: string | null) => void;
  onOpen: (id: string) => void;
  onHover: (hover: HoverInfo | null) => void;
};

export type GraphController = {
  update: (visible: VisibleGraph, model: GraphModel) => void;
  select: (id: string | null) => void;
  focus: (id: string) => void;
  zoom: (direction: "in" | "out" | "reset") => void;
  refreshTheme: () => void;
  resize: () => void;
  kill: () => void;
};

type LayoutFactory = (graph: CanvasGraph) => FA2Layout;

const PULSE_MS = 2600;

function layoutDuration(order: number): number {
  return Math.min(9000, 2000 + order * 1.5);
}

export async function createController(container: HTMLElement, callbacks: ControllerCallbacks): Promise<GraphController> {
  const [{ default: SigmaClass }, { default: FA2LayoutClass }, { inferSettings }] = await Promise.all([
    import("sigma"),
    import("graphology-layout-forceatlas2/worker"),
    import("graphology-layout-forceatlas2"),
  ]);
  const makeLayout: LayoutFactory = (graph) => {
    const settings: ForceAtlas2Settings = { ...inferSettings(graph.order), slowDown: 4 };
    return new FA2LayoutClass(graph, {
      settings,
      // Un lien déduit tire moins qu'un lien posé : il rapproche sans souder.
      getEdgeWeight: (_edge, attrs) => (attrs.inferred ? 0.4 : Math.min(3, attrs.weight)),
    });
  };
  return new SigmaGraphController(SigmaClass, makeLayout, container, callbacks);
}

class SigmaGraphController implements GraphController {
  private readonly graph = createCanvasGraph();
  private readonly view: ViewState;
  private readonly sigma: Sigma<NodeAttrs, EdgeAttrs>;
  private readonly memory = new Map<string, Point>();
  private layout: FA2Layout | null = null;
  private layoutTimer: ReturnType<typeof setTimeout> | null = null;
  private pulseTimer: ReturnType<typeof setTimeout> | null = null;
  private lastModel: GraphModel | null = null;
  // Un cadrage demandé pendant la disposition attend qu'elle s'arrête : le nœud
  // visé n'est pas encore à sa place, et la caméra arriverait sur du vide.
  private pendingFocus: string | null = null;

  constructor(
    SigmaClass: typeof Sigma,
    private readonly makeLayout: LayoutFactory,
    private readonly container: HTMLElement,
    callbacks: ControllerCallbacks,
  ) {
    this.view = { palette: readPalette(container), selected: null, selection: null, hovered: null, hover: null, pulse: new Set() };
    this.sigma = createSigma(SigmaClass, this.graph, container, this.view);
    bindEvents(this.sigma, this.graph, this.view, callbacks, container);
  }

  update(visible: VisibleGraph, model: GraphModel) {
    const first = this.lastModel === null;
    const { added } = syncGraph(this.graph, visible, this.memory);
    const previous = this.lastModel;
    if (previous && model !== previous) this.pulse(added.filter((id) => !previous.byId.has(id)));
    this.lastModel = model;
    this.view.selection = this.neighbourhood(this.view.selected);
    this.sigma.setSetting("hideEdgesOnMove", this.graph.order > 2000);
    if (first || added.length > Math.max(25, this.graph.order * 0.2)) this.runLayout();
    this.sigma.refresh();
  }

  select(id: string | null) {
    this.view.selected = id && this.graph.hasNode(id) ? id : null;
    this.view.selection = this.neighbourhood(this.view.selected);
    this.sigma.refresh();
  }

  focus(id: string) {
    if (this.layout?.isRunning()) this.pendingFocus = id;
    else this.animateTo(id);
  }

  zoom(direction: "in" | "out" | "reset") {
    const camera = this.sigma.getCamera();
    if (direction === "in") void camera.animatedZoom({ duration: 250 });
    else if (direction === "out") void camera.animatedUnzoom({ duration: 250 });
    else void camera.animatedReset({ duration: 300 });
  }

  refreshTheme() {
    this.view.palette = readPalette(this.container);
    this.sigma.setSettings({ labelColor: { color: rgba(this.view.palette.foreground) }, labelFont: this.view.palette.font });
    this.sigma.refresh();
  }

  resize() {
    this.sigma.resize();
    this.sigma.refresh();
  }

  kill() {
    if (this.layoutTimer) clearTimeout(this.layoutTimer);
    if (this.pulseTimer) clearTimeout(this.pulseTimer);
    this.layout?.kill();
    this.sigma.kill();
    this.graph.clear();
  }

  private neighbourhood(id: string | null): Set<string> | null {
    return id && this.graph.hasNode(id) ? new Set([id, ...this.graph.neighbors(id)]) : null;
  }

  /** Les nœuds apparus à la relecture, mis en avant un instant. */
  private pulse(ids: string[]) {
    if (ids.length === 0) return;
    this.view.pulse = new Set(ids);
    if (this.pulseTimer) clearTimeout(this.pulseTimer);
    this.pulseTimer = setTimeout(() => {
      this.view.pulse = new Set();
      this.sigma.refresh();
    }, PULSE_MS);
  }

  private runLayout() {
    this.layout ??= this.makeLayout(this.graph);
    this.layout.start();
    if (this.layoutTimer) clearTimeout(this.layoutTimer);
    this.layoutTimer = setTimeout(() => {
      this.layout?.stop();
      if (this.pendingFocus) this.animateTo(this.pendingFocus);
      this.pendingFocus = null;
    }, layoutDuration(this.graph.order));
  }

  private animateTo(id: string) {
    this.sigma.refresh();
    const display = this.sigma.getNodeDisplayData(id);
    if (display) void this.sigma.getCamera().animate({ x: display.x, y: display.y, ratio: 0.3 }, { duration: 500 });
  }
}

function createSigma(
  SigmaClass: typeof Sigma,
  graph: CanvasGraph,
  container: HTMLElement,
  view: ViewState,
): Sigma<NodeAttrs, EdgeAttrs> {
  return new SigmaClass<NodeAttrs, EdgeAttrs>(graph, container, {
    allowInvalidContainer: true,
    renderEdgeLabels: false,
    enableEdgeEvents: false,
    zIndex: true,
    labelFont: view.palette.font,
    labelSize: 12,
    labelWeight: "500",
    labelColor: { color: rgba(view.palette.foreground) },
    // Au-delà de ce rayon à l'écran seulement : les grosses fiches, puis les
    // autres à mesure qu'on zoome.
    labelRenderedSizeThreshold: 9,
    labelDensity: 0.5,
    labelGridCellSize: 120,
    minEdgeThickness: 0.6,
    minCameraRatio: 0.03,
    maxCameraRatio: 4,
    // Le cartouche de survol de Sigma est blanc en dur : l'infobulle de l'écran le remplace.
    defaultDrawNodeHover: () => undefined,
    nodeReducer: (node, data) => nodeDisplay(node, data, view),
    edgeReducer: (edge, data) => edgeDisplay(data, graph.extremities(edge), view),
  });
}

function bindEvents(
  sigma: Sigma<NodeAttrs, EdgeAttrs>,
  graph: CanvasGraph,
  view: ViewState,
  callbacks: ControllerCallbacks,
  container: HTMLElement,
) {
  sigma.on("clickNode", ({ node }) => callbacks.onSelect(node));
  sigma.on("doubleClickNode", (payload) => {
    // Pas de zoom au double clic sur un nœud : on ouvre sa fiche.
    payload.preventSigmaDefault();
    callbacks.onOpen(payload.node);
  });
  sigma.on("clickStage", () => callbacks.onSelect(null));
  sigma.on("enterNode", ({ node, event }) => {
    view.hovered = node;
    view.hover = new Set([node, ...graph.neighbors(node)]);
    container.style.cursor = "pointer";
    callbacks.onHover({ id: node, x: event.x, y: event.y });
    sigma.refresh();
  });
  sigma.on("leaveNode", () => {
    view.hovered = null;
    view.hover = null;
    container.style.cursor = "";
    callbacks.onHover(null);
    sigma.refresh();
  });
}
