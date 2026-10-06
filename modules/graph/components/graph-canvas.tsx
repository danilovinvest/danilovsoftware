"use client";

import { useEffect, useRef, useState } from "react";
import { MaximizeIcon, MinusIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/shared/ui/feedback";
import { CATEGORY_META } from "../lib/categories";
import { createController, type GraphController, type HoverInfo } from "../lib/controller";
import type { VisibleGraph } from "../lib/filters";
import type { GraphModel } from "../lib/model";
import { HUE } from "@/shared/ui/hue";
import { cn } from "@/lib/utils";

/**
 * La toile, et rien d'autre : elle monte Sigma, lui passe ce qu'il faut
 * dessiner, et remonte les gestes. Tout ce qui se décide — quoi montrer, qui
 * est choisi — vit dans l'écran.
 *
 * **Tout se démonte avec elle** : Sigma et ses contextes WebGL, le worker de
 * disposition, les minuteries, l'observateur de taille et celui du thème. Un
 * aller-retour entre deux écrans ne laisse rien tourner derrière soi.
 */
export type FocusRequest = { id: string; nonce: number };

export function GraphCanvas({
  model,
  visible,
  selectedId,
  focusRequest,
  onSelect,
  onOpen,
}: {
  model: GraphModel;
  visible: VisibleGraph;
  selectedId: string | null;
  focusRequest: FocusRequest | null;
  onSelect: (id: string | null) => void;
  onOpen: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [controller, setController] = useState<GraphController | null>(null);
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  // Les rappels changent à chaque rendu ; la toile, elle, ne se remonte pas pour autant.
  const callbacks = useRef({ onSelect, onOpen });
  useEffect(() => {
    callbacks.current = { onSelect, onOpen };
  }, [onSelect, onOpen]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let alive = true;
    let instance: GraphController | null = null;
    createController(container, {
      onSelect: (id) => callbacks.current.onSelect(id),
      onOpen: (id) => callbacks.current.onOpen(id),
      onHover: setHover,
    })
      .then((created) => {
        if (!alive) return created.kill();
        instance = created;
        setController(created);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    const resize = new ResizeObserver(() => instance?.resize());
    resize.observe(container);
    // Le thème vit dans la classe et l'attribut `data-theme` de <html>.
    const theme = new MutationObserver(() => instance?.refreshTheme());
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
    return () => {
      alive = false;
      resize.disconnect();
      theme.disconnect();
      instance?.kill();
    };
  }, []);

  useEffect(() => controller?.update(visible, model), [controller, visible, model]);
  useEffect(() => controller?.select(selectedId), [controller, selectedId, visible]);
  useEffect(() => {
    if (controller && focusRequest) controller.focus(focusRequest.id);
  }, [controller, focusRequest]);

  const hovered = hover ? model.byId.get(hover.id) : undefined;

  return (
    <div className="absolute inset-0">
      <div ref={containerRef} className="absolute inset-0 touch-none" aria-label="Graphe des fiches" role="img" />
      {failed && (
        <div className="absolute inset-x-4 top-4">
          <ErrorNotice message="La toile n'a pas pu s'ouvrir : ce navigateur ne permet pas le dessin WebGL." />
        </div>
      )}
      {hovered && hover && (
        <div
          className="bg-popover text-popover-foreground pointer-events-none absolute z-10 max-w-64 rounded-md border px-2.5 py-1.5 text-xs shadow-md"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          <p className="truncate font-medium">{hovered.label}</p>
          <p className="text-muted-foreground flex items-center gap-1.5">
            <span className={cn("size-2 shrink-0 rounded-full", HUE[CATEGORY_META[hovered.category].hue].solid)} />
            {CATEGORY_META[hovered.category].label}
            {hovered.fiche && ` · ${hovered.fiche.degree} connexion${hovered.fiche.degree > 1 ? "s" : ""}`}
            {hovered.hub && ` · ${hovered.hub.fiches.length} fiches`}
          </p>
        </div>
      )}
      <div className="absolute bottom-3 left-3 flex flex-col gap-1" data-demo="graphe-zoom">
        <Button variant="outline" size="icon-sm" aria-label="Zoomer" onClick={() => controller?.zoom("in")}>
          <PlusIcon />
        </Button>
        <Button variant="outline" size="icon-sm" aria-label="Dézoomer" onClick={() => controller?.zoom("out")}>
          <MinusIcon />
        </Button>
        <Button variant="outline" size="icon-sm" aria-label="Voir tout" onClick={() => controller?.zoom("reset")}>
          <MaximizeIcon />
        </Button>
      </div>
    </div>
  );
}
