"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask } from "pdfjs-dist";

/*
  Au-delà, on ne dessine plus : un devis tient en trois pages, et un dossier de
  plans de cent pages s'ouvre mieux dans OneDrive que dans une fenêtre.
*/
const MAX_PAGES = 40;

/**
 * Un PDF dessiné par le CRM lui-même, page par page.
 *
 * L'aperçu confiait le PDF au lecteur du navigateur, dans un cadre `blob:`. Dans
 * l'application Windows, ce cadre hérite de la politique de sécurité de la page,
 * et `object-src 'none'` y bloque le lecteur, qui est un greffon : « on ne peut
 * pas visualiser les devis ». pdf.js — le lecteur de Firefox, Apache-2.0 — dessine
 * dans une toile : ni greffon, ni cadre, donc rien que cette politique puisse
 * refuser. Vérifié sous Chromium avec la politique exacte de l'application.
 *
 * La bibliothèque ne se charge qu'à l'ouverture d'un aperçu. Si elle échoue, on
 * rend la main au cadre d'avant : jamais moins bien qu'avant.
 */
export function PdfPages({
  blob,
  name,
  onFail,
}: {
  blob: Blob;
  name: string;
  /** pdf.js n'a pas su le lire : l'appelant retombe sur le lecteur du navigateur. */
  onFail: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [tronque, setTronque] = useState<{ blob: Blob; total: number } | null>(null);

  useEffect(() => {
    const container = box.current;
    if (!container) return;
    let annule = false;
    // En v6, c'est la tâche de chargement qui se détruit, avec son document.
    let chargement: PDFDocumentLoadingTask | null = null;
    const worker = new Worker(new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url), {
      type: "module",
    });

    /*
      Un worker qui ne démarre pas ne fait pas échouer pdf.js : il attend. Sans
      ce délai, la fenêtre resterait vide sans rien dire.
    */
    const delai = window.setTimeout(() => {
      if (!annule) onFail();
    }, 20_000);

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerPort = worker;
        chargement = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
        const doc = await chargement.promise;
        const largeur = Math.max(320, container.clientWidth - 32);
        const ratio = window.devicePixelRatio || 1;

        for (let numero = 1; numero <= Math.min(doc.numPages, MAX_PAGES); numero++) {
          if (annule) return;
          const page = await doc.getPage(numero);
          const echelle = largeur / page.getViewport({ scale: 1 }).width;
          const viewport = page.getViewport({ scale: echelle * ratio });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = `${largeur}px`;
          canvas.className = "mx-auto block bg-white shadow-sm";
          canvas.setAttribute("role", "img");
          canvas.setAttribute("aria-label", `${name}, page ${numero}`);
          container.appendChild(canvas);
          await page.render({ canvas, viewport }).promise;
          window.clearTimeout(delai);
        }
        if (!annule && doc.numPages > MAX_PAGES) setTronque({ blob, total: doc.numPages });
      } catch {
        if (!annule) onFail();
      }
    })();

    return () => {
      annule = true;
      window.clearTimeout(delai);
      void chargement?.destroy();
      worker.terminate();
      // Les toiles sont posées hors de React : on les retire nous-mêmes.
      container.replaceChildren();
    };
  }, [blob, name, onFail]);

  return (
    <div className="h-full overflow-y-auto">
      {/* Ce conteneur ne porte aucun enfant React : pdf.js y pose ses toiles. */}
      <div ref={box} className="flex flex-col gap-4 p-4" />
      {tronque?.blob === blob && (
        <p className="text-muted-foreground pb-4 text-center text-xs">
          {MAX_PAGES} pages affichées sur {tronque.total} : la suite s&apos;ouvre dans OneDrive.
        </p>
      )}
    </div>
  );
}
