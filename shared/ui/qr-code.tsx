"use client";

import { useMemo } from "react";
import { create } from "qrcode";

/**
 * Un QR code, en SVG, rendu à partir de la matrice du paquet `qrcode`.
 *
 * **Pourquoi une dépendance et pas quarante lignes à nous.** Un encodeur QR,
 * c'est la segmentation du texte, un code correcteur de Reed-Solomon, le choix
 * de version, huit masques à évaluer et leur pénalité : quelques centaines de
 * lignes dont la moindre erreur donne un code que les téléphones refusent
 * silencieusement. C'est le même arbitrage que React Flow — l'algorithme est
 * à eux, le rendu reste à nous.
 *
 * Le dessin est donc le nôtre, et c'est ce qui compte ici : pas de `<canvas>`
 * (flou sur les écrans à haute densité, invisible à l'impression), pas d'image
 * en `data:` — un SVG net à toutes les tailles, qui prend les couleurs du
 * thème. `currentColor` pour les modules, transparent pour le fond : un QR code
 * noir sur blanc collé dans une interface sombre est un rectangle blanc.
 *
 * La correction d'erreur est volontairement **moyenne** : ces codes vivent à
 * l'écran, pas sur un carton froissé, et une correction plus haute densifie la
 * grille pour rien.
 */
export function QrCode({
  value,
  className,
  label,
}: {
  value: string;
  className?: string;
  /** Ce que lisent les lecteurs d'écran : un QR code n'est pas une décoration. */
  label: string;
}) {
  const grid = useMemo(() => {
    // `create` est pur et synchrone — il rend la matrice, sans jamais toucher
    // au disque ni au réseau. Les fonctions de fichier du paquet, elles, ne
    // sont pas importées ici.
    const { modules } = create(value, { errorCorrectionLevel: "M" });
    return { size: modules.size, data: modules.data };
  }, [value]);

  // Une marge de quatre modules est exigée par la spécification : sans elle,
  // un lecteur ne trouve pas les bords du code.
  const quiet = 4;
  const side = grid.size + quiet * 2;

  const carres: string[] = [];
  for (let y = 0; y < grid.size; y += 1) {
    for (let x = 0; x < grid.size; x += 1) {
      if (grid.data[y * grid.size + x]) {
        carres.push(`M${x + quiet} ${y + quiet}h1v1h-1z`);
      }
    }
  }

  return (
    <svg
      viewBox={`0 0 ${side} ${side}`}
      className={className}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <path d={carres.join("")} fill="currentColor" />
    </svg>
  );
}
