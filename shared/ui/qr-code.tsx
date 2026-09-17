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
 * (flou sur les écrans à haute densité, mal imprimé), pas d'image en `data:` —
 * un SVG net à toutes les tailles.
 *
 * **Sa polarité ne suit pas le thème, et c'est la seule exception que ce
 * composant s'autorise.** Un QR code n'est pas un élément d'interface : c'est
 * une image lisible par machine, et la norme suppose des modules **sombres sur
 * fond clair**. Le premier jet le dessinait en `currentColor` « pour suivre le
 * thème » : en thème sombre il rendait des modules clairs sur fond sombre —
 * polarité inversée, que beaucoup de lecteurs tolèrent sans que rien ne le
 * garantisse, et justement sur le public visé, des téléphones parfois anciens.
 * À l'impression c'était pire : les navigateurs n'impriment pas les fonds mais
 * impriment les tracés, donc des modules gris clair sur papier blanc,
 * invisibles. Le fond clair est donc **dessiné** (un rectangle du SVG, qui
 * s'imprime) et l'encre est sombre, dans les deux thèmes. On ne teinte pas une
 * photographie non plus.
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
      {/* La plaque claire fait partie du dessin : c'est la « zone de silence »
          de la norme, et c'est aussi ce qui garantit le contraste sur papier,
          où les fonds CSS ne sont pas imprimés. */}
      <rect width={side} height={side} fill="#ffffff" />
      <path d={carres.join("")} fill="#111111" />
    </svg>
  );
}
