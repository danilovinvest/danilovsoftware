import { cn } from "@/lib/utils";

/**
 * La marque OMPT.
 *
 * Les tracés viennent tels quels de `public/omptcrm.svg`, le fichier fourni
 * par l'entreprise : les recopier à la main aurait produit une ressemblance,
 * pas le logo. Ils sont découpés en deux, parce que la marque a deux emplois
 * qui ne demandent pas la même chose.
 *
 * - Le **profilé** seul (`Logo`) sert partout où la place est carrée ou
 *   minuscule : la pastille du tiroir, l'onglet du navigateur. À seize pixels
 *   « OMPT » n'est plus qu'une bavure, alors que le profilé reste un profilé —
 *   il est purement géométrique, et c'est l'élément qui distingue la marque
 *   avant qu'on l'ait lue.
 * - Le **bloc-marque** (`Wordmark`) sert là où il y a de la largeur : la page
 *   de connexion et l'invitation, deux écrans pleine page où la marque est le
 *   sujet. Il a quitté l'en-tête du tiroir, où un dessin de deux cents pixels
 *   posé sans contenant flottait à côté d'un chevron esseulé : là, c'est la
 *   pastille et le nom écrit qui répondent au sélecteur de périmètre du
 *   dessous.
 *
 * Les couleurs ne sont pas prises dans la palette mais dans `--logo-*` : une
 * marque qui vire au violet parce qu'on a changé de thème n'est plus une
 * marque. Seul le lettrage bascule au blanc en thème sombre — le bleu nuit y
 * disparaîtrait.
 */

/** Le profilé métallique, seul. Rapport 1013 × 171. */
const BEAM_PATH =
  "M332.85 496.46 l-2.82 -4.16 -103.72 0 c-57.19 0 -103.85 -0.37 -103.85 -0.86 -0.12 -0.61 -0.37 -5.88 -0.61 -11.76 l-0.49 -10.90 29.88 -14.45 30 -14.57 0 -33.55 0 -33.68 -7.72 -3.18 c-4.16 -1.71 -17.51 -7.23 -29.64 -12.25 l-22.04 -9.18 -0.12 -12.86 -0.12 -12.98 505.64 0 505.64 0 -0.37 13.23 -0.37 13.10 -9.18 4.53 c-5.02 2.57 -10.04 4.65 -11.02 4.65 -1.10 0 -2.94 0.73 -4.29 1.59 -1.35 0.98 -7.10 3.43 -12.86 5.51 -5.76 2.08 -12.98 4.90 -16.16 6.37 l-5.88 2.57 0 32.82 0 32.82 29.76 14.57 29.64 14.57 0.37 11.39 0.37 11.27 -101.40 0.12 c-55.72 0.12 -101.89 0 -102.62 -0.24 -0.61 -0.24 -7.59 -0.49 -15.31 -0.37 -7.72 0 -62.33 0 -121.24 0 -341.54 -0.24 -430.21 0 -431.43 1.22 -0.49 0.49 -0.24 1.71 0.61 2.57 2.33 2.82 -0.98 4.04 -10.90 4.04 -4.78 0 -10.16 0.49 -11.76 1.10 -2.69 1.10 -3.43 0.73 -6 -3.06z m675.25 -50.09 l13.23 -6.12 0 -30.86 0 -30.98 -388.45 0.12 c-213.69 0 -390.77 0.37 -393.47 0.86 l-4.90 0.86 -0.37 30.13 -0.24 30 13.72 6.37 13.84 6.37 366.77 -0.37 366.77 -0.24 13.10 -6.12z";

/** O, M, P, T — un tracé par lettre, contre-formes comprises. */
const LETTER_PATHS = [
  "M121.24 710.27 l0 -221.65 106.30 0 106.17 0 3.43 4.78 c3.80 5.51 4.04 6.25 1.35 6.25 -1.10 0 -1.71 0.73 -1.35 1.59 0.24 0.86 10.78 14.33 23.39 30 l22.78 28.41 -0.12 156.38 0 156.51 -12.49 10.65 c-6.86 5.88 -22.17 19.23 -33.92 29.64 l-21.43 18.98 -97.11 0.12 -96.99 0 0 -221.65z m179.77 6 l-0.37 -142.05 -48.25 0.12 c-26.57 0 -48.74 0.37 -49.23 0.73 -0.61 0.37 -1.10 64.29 -1.10 142.05 l0 141.32 49.60 0 49.60 0 -0.24 -142.18z",
  "M704.76 931.93 c-5.51 -0.61 -7.84 -2.08 -23.27 -14.08 -9.43 -7.47 -30.25 -23.39 -46.29 -35.39 l-29.02 -22.04 0 -116.09 c0 -69.31 -0.49 -116.09 -1.10 -116.09 -0.61 0 -17.14 16.41 -36.74 36.49 l-35.64 36.37 -12.49 -12.86 c-44.70 -45.68 -58.90 -60.01 -59.39 -59.64 -0.24 0.24 -0.37 52.54 -0.37 116.22 l0 115.73 -47.39 35.64 -47.51 35.76 -12.86 -0.12 -12.86 0 12.74 -11.88 c7.10 -6.49 20.08 -18.49 28.78 -26.70 l16.04 -14.82 0.37 -163.85 0.24 -163.73 -17.39 -26.82 c-15.68 -24.49 -17.51 -26.82 -20.45 -26.57 -2.94 0.37 -3.18 0 -3.18 -4.53 l0 -4.90 39.31 -0.37 c33.92 -0.24 39.55 0 40.90 1.59 1.22 1.59 1.10 1.84 -1.10 1.84 -1.35 0 -2.57 0.49 -2.57 1.22 0 0.61 19.96 22.53 44.45 48.62 24.37 26.08 46.54 49.84 49.23 52.78 l5.02 5.39 11.02 -11.51 c6 -6.25 15.19 -15.80 20.21 -21.19 5.02 -5.39 22.53 -24 38.94 -41.27 l29.76 -31.59 19.47 0 19.47 0 0 196.30 0.12 196.18 14.57 16.53 c23.51 26.45 26.08 29.39 25.59 29.76 -0.24 0.24 -3.18 0 -6.61 -0.37z",
  "M721.78 922.50 c-4.78 -5.27 -14.82 -16.41 -22.29 -24.74 l-13.72 -15.19 0 -195.82 c0 -172.91 -0.24 -195.82 -1.84 -196.43 -0.98 -0.49 -1.84 -1.22 -1.84 -1.84 0 -0.61 45.07 -1.10 107.03 -1.10 93.56 0 107.15 0.24 108.50 1.84 1.22 1.47 1.22 1.84 -0.37 1.84 -1.10 0 -2.20 0.49 -2.57 0.98 -0.37 0.61 12.61 14.82 28.66 31.59 l29.39 30.49 0 72.86 0 72.86 -25.35 25.35 -25.47 25.47 -64.29 0.24 -64.29 0.37 -0.37 90.38 -0.24 90.25 -21.19 0 -21.19 0 -8.57 -9.43z m147.69 -300.03 l0 -54.62 -47.03 0.73 c-25.84 0.49 -47.88 1.22 -48.98 1.59 -1.71 0.73 -1.96 6.12 -1.96 53.88 l0 53.15 48.98 0 48.98 0 0 -54.74z",
  "M978.46 737.83 c0 -186.75 -0.12 -194.10 -2.20 -196.18 -1.35 -1.22 -12.37 -12.98 -24.86 -26.08 -12.37 -13.10 -22.90 -24.12 -23.39 -24.25 -0.49 -0.24 -0.98 -1.22 -0.98 -2.20 0 -1.47 14.94 -1.71 102.87 -1.71 l102.87 0 0 27.55 0 27.55 -30.62 0 -30.62 0 0 194.71 0 194.71 -46.54 0 -46.54 0 0 -194.10z",
];

/**
 * Cadre serré sur le profilé seul.
 *
 * Il s'arrête à 493, quatre unités au-dessus du bas du tracé : le fichier
 * d'origine laisse un ergot sous l'arête basse, là où le profilé rejoint la
 * pointe du M. Dans le bloc-marque il se perd derrière la lettre ; isolé et
 * agrandi, il se voit. Le cadre de vue le coupe.
 */
const BEAM_BOX = "121 322 1013 171";
/** Cadre serré sur le bloc entier, profilé et lettrage. */
const MARK_BOX = "121 322 1013 611";

/**
 * Le profilé, à l'encre courante.
 *
 * Il prend `currentColor` plutôt que sa propre couleur : sur la pastille il
 * est orange, dans un bouton il suivrait le texte. Le rapport est de 5,7 pour
 * 1 — on lui donne donc une largeur et la hauteur suit, l'inverse de ce qu'on
 * fait d'une icône carrée.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox={BEAM_BOX}
      fill="currentColor"
      className={cn("h-auto w-full", className)}
      role="img"
      aria-label="OMPT"
    >
      <path d={BEAM_PATH} />
    </svg>
  );
}

/**
 * Le bloc-marque : le profilé posé sur le nom.
 *
 * Deux encres, donc deux groupes — le profilé ne suit pas `currentColor` ici,
 * sans quoi le logo deviendrait monochrome partout où on le pose sur du texte.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <svg
      viewBox={MARK_BOX}
      className={cn("h-8 w-auto", className)}
      role="img"
      aria-label="OMPT"
    >
      <g fill="var(--logo-ink)">
        {LETTER_PATHS.map((d) => (
          <path key={d.slice(0, 12)} d={d} />
        ))}
      </g>
      <g fill="var(--logo-beam)">
        <path d={BEAM_PATH} />
      </g>
    </svg>
  );
}

/**
 * La marque sur sa pastille, là où la place est carrée : l'en-tête du tiroir,
 * y compris replié en colonne d'icônes, et l'onglet du navigateur.
 *
 * **L'orange remplit la plaque, le profilé est blanc** — l'inverse de ce qui
 * était fait au départ. Un profilé orange sur une plaque bleu nuit donne, à
 * seize pixels, une barre fine et sombre sur un fond sombre : dans une barre
 * d'onglets ce n'est plus qu'une tache. À cette taille c'est la **masse
 * colorée** qui identifie, et l'orange est la seule des deux couleurs de la
 * marque qui ne ressemble à aucune autre.
 *
 * Les deux encres ne suivent pas la palette : une pastille qui virerait au
 * violet ne dirait plus « OMPT », elle dirait « le réglage du moment ».
 * `app/icon.svg` reprend exactement ces valeurs — les deux doivent bouger
 * ensemble, sinon l'onglet et le tiroir cessent de se ressembler.
 */
export function LogoTile({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "bg-logo-beam grid size-9 shrink-0 place-items-center rounded-lg text-white",
        className,
      )}
    >
      {/* Le profilé occupe une fraction de la pastille, pas une taille en
          pixels : la pastille change de côté d'un écran à l'autre, et deux
          réglages à tenir d'accord auraient fini par diverger.

          La largeur est forcée : dans le tiroir, `SidebarMenuButton` impose
          `[&_svg]:size-4` à tout ce qu'il contient, et le profilé s'y
          retrouvait à seize pixels de large. La hauteur, elle, peut rester
          contrainte — un cadre de vue trop haut ajoute du vide au-dessus et
          au-dessous du tracé, il ne l'écrase pas. */}
      {/* 82 % et non 72 : sous quarante pixels, chaque point de marge coûte
          un pixel de trait, et le profilé est déjà six fois plus large que
          haut. */}
      <Logo className="w-[82%]!" />
    </span>
  );
}
