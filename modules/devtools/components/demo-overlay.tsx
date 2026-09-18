"use client";

import { Suspense, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEMOS, type Demo, type DemoStep } from "../lib/demos";
import { goToStep, stopTour, useTour } from "../lib/tour";

type Box = { top: number; left: number; width: number; height: number };

/** La marge autour d'une zone : le halo ne doit pas mordre sur ce qu'il montre. */
const PAD = 6;
/** Au-delà, la zone est déclarée introuvable plutôt que d'attendre sans fin. */
const SEARCH_MS = 8000;

/**
 * La visite guidée : l'écran s'assombrit, la zone modifiée s'éclaire.
 *
 * Rendue dans `body`, au-dessus de tout — y compris d'un tiroir ou d'une boîte
 * de dialogue qu'une étape vient d'ouvrir, puisque c'est parfois là que se
 * trouve la nouveauté.
 */
export function DemoOverlay() {
  const tour = useTour();
  const demo = tour ? DEMOS.find((entry) => entry.id === tour.demoId) : undefined;
  const step = demo && tour ? demo.steps[tour.step] : undefined;
  if (!demo || !tour || !step || typeof document === "undefined") return null;

  return createPortal(
    // La clé remonte le projecteur à chaque étape : la recherche de la zone
    // repart de zéro au lieu d'hériter du halo précédent. La borne Suspense
    // tient `useSearchParams`, que l'export statique exige de borner.
    <Suspense>
      <Spotlight key={`${demo.id}·${tour.step}`} demo={demo} index={tour.step} step={step} />
    </Suspense>,
    document.body,
  );
}

function Spotlight({ demo, index, step }: { demo: Demo; index: number; step: DemoStep }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  // Une fiche porte son identifiant en paramètre (`shared/lib/routes.ts`) :
  // l'écran d'une étape se compare donc au chemin **et** à ses paramètres.
  const here = search ? `${pathname}?${search}` : pathname;
  const [box, setBox] = useState<Box | null>(null);
  const [missing, setMissing] = useState(false);
  const last = index === demo.steps.length - 1;

  /*
    Trouver la zone, et la suivre.

    Elle n'existe pas forcément tout de suite : l'écran se charge, un onglet
    s'ouvre, une boîte de dialogue s'anime. La recherche tourne donc à chaque
    image, clique une fois ce qu'il faut ouvrir, fait défiler jusqu'à la zone,
    puis suit sa position — le contenu défile, la fenêtre change de taille.
  */
  useEffect(() => {
    if (step.path && here !== step.path) {
      router.push(step.path);
      return;
    }
    const started = performance.now();
    let clicked = !step.click;
    let scrolled = false;
    let frame = 0;

    const tick = () => {
      if (!clicked && step.click) {
        const trigger = document.querySelector<HTMLElement>(step.click);
        if (trigger) {
          activate(trigger);
          clicked = true;
        }
      }
      const found = Array.from(document.querySelectorAll<HTMLElement>(step.target)).filter(
        (element) => element.getClientRects().length > 0,
      );
      if (found.length > 0) {
        if (!scrolled) {
          found[0].scrollIntoView({ block: "center", behavior: "smooth" });
          scrolled = true;
        }
        const next = union(found);
        setBox((previous) => (same(previous, next) ? previous : next));
        setMissing(false);
      } else if (performance.now() - started > SEARCH_MS) {
        setMissing(true);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [here, router, step]);

  // Les flèches avancent, Échap quitte : on présente, on ne vise pas des boutons.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        if (last) stopTour();
        else goToStep(index + 1);
      } else if (event.key === "ArrowLeft" && index > 0) {
        goToStep(index - 1);
      } else if (event.key === "Escape") {
        stopTour();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, last]);

  const card = placeCard(box);

  return (
    <div className="pointer-events-none fixed inset-0 z-[100]">
      {box ? (
        <div
          className="absolute rounded-xl ring-2 ring-[var(--brand)] motion-safe:transition-all motion-safe:duration-300"
          style={{
            top: box.top - PAD,
            left: box.left - PAD,
            width: box.width + PAD * 2,
            height: box.height + PAD * 2,
            // Une seule ombre démesurée assombrit tout sauf la zone.
            boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.45)",
          }}
        >
          <span className="absolute inset-0 rounded-xl ring-4 ring-[var(--brand)]/40 motion-safe:animate-pulse" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-black/30" />
      )}

      <div
        className="bg-popover text-popover-foreground pointer-events-auto absolute w-80 rounded-xl border p-4 shadow-xl"
        style={card}
        role="dialog"
        aria-label={`Démo — ${step.title}`}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-semibold tracking-wide text-[var(--brand-text)] uppercase">
            Démo · {index + 1} / {demo.steps.length}
          </p>
          <button
            type="button"
            onClick={stopTour}
            className="text-muted-foreground hover:text-foreground -mt-1 -mr-1 rounded-md p-1"
            aria-label="Quitter la démo"
          >
            <XIcon className="size-4" />
          </button>
        </div>
        <p className="mt-1 text-sm font-semibold">{step.title}</p>
        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
          {missing
            ? "Cette zone n'est pas visible ici — la fiche d'exemple a peut-être changé. Passez à l'étape suivante."
            : step.body}
        </p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-muted-foreground/70 truncate text-[11px]">{demo.title}</p>
          <div className="flex shrink-0 gap-1.5">
            {index > 0 && (
              <Button size="xs" variant="ghost" onClick={() => goToStep(index - 1)}>
                Précédent
              </Button>
            )}
            <Button size="xs" onClick={() => (last ? stopTour() : goToStep(index + 1))}>
              {last ? "Terminer" : "Suivant"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Ouvrir ce qu'une étape désigne, comme le ferait une souris.
 *
 * Un simple `click()` ne suffit pas : les onglets Radix s'activent au
 * `mousedown`, les menus au `pointerdown`. La séquence complète couvre les
 * deux, et un bouton ordinaire n'y réagit qu'une fois, au clic.
 */
function activate(element: HTMLElement) {
  const init = { bubbles: true, cancelable: true, button: 0 };
  element.dispatchEvent(new PointerEvent("pointerdown", { ...init, pointerType: "mouse" }));
  element.dispatchEvent(new MouseEvent("mousedown", init));
  element.dispatchEvent(new PointerEvent("pointerup", { ...init, pointerType: "mouse" }));
  element.dispatchEvent(new MouseEvent("mouseup", init));
  element.click();
}

function union(elements: HTMLElement[]): Box {
  const rects = elements.map((element) => element.getBoundingClientRect());
  const top = Math.min(...rects.map((r) => r.top));
  const left = Math.min(...rects.map((r) => r.left));
  const bottom = Math.max(...rects.map((r) => r.bottom));
  const right = Math.max(...rects.map((r) => r.right));
  return { top, left, width: right - left, height: bottom - top };
}

function same(a: Box | null, b: Box): boolean {
  return (
    a !== null &&
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

/**
 * Où poser la bulle : sous la zone s'il y a la place, au-dessus sinon, et
 * toujours dans la fenêtre. Sans zone, au centre.
 */
function placeCard(box: Box | null): React.CSSProperties {
  const width = 320;
  const height = 190;
  const margin = 12;
  if (typeof window === "undefined" || !box) {
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }
  const below = box.top + box.height + PAD + margin;
  const top =
    below + height < window.innerHeight
      ? below
      : Math.max(margin, box.top - PAD - margin - height);
  const left = Math.min(
    Math.max(margin, box.left),
    window.innerWidth - width - margin,
  );
  return { top, left };
}
