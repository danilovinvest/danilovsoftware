import { invoke } from "@tauri-apps/api/core";

/**
 * Le bandeau de la fenêtre suit le thème du CRM.
 *
 * Le cadre, les feux de circulation et la barre de titre sont dessinés par le
 * système, qui les accorde à l'apparence du **poste**. Un Mac en sombre posait
 * donc un bandeau noir au-dessus d'une application en thème clair : deux
 * moitiés de fenêtre qui ne se ressemblent pas. La coque le règle en une
 * ligne (`src-tauri/src/appearance.rs`) ; encore faut-il lui dire quoi.
 *
 * **On écoute la classe `dark` du document, pas les préférences.** C'est elle
 * le thème *résolu* — « système » y est déjà tranché — et c'est la seule chose
 * que les deux chemins qui l'appliquent ont en commun : `applyPreferences` au
 * rendu, et le script anti-scintillement qui la pose avant la première
 * peinture. Lire les préférences obligerait `shared/desktop` à dépendre d'un
 * module, et manquerait le second chemin.
 */

let last: boolean | null = null;

function push(dark: boolean) {
  // Le système ne fait rien d'un ordre qu'il a déjà reçu, et une bascule de
  // palette change la classe sans changer le thème.
  if (dark === last) return;
  last = dark;
  // Hors de l'application — `bun run dev` dans un navigateur ordinaire — il n'y
  // a aucune coque pour répondre, et ce n'est pas une panne.
  void invoke("window_theme", { dark }).catch(() => {});
}

/**
 * Aligne la fenêtre maintenant, puis à chaque changement de thème. Rend la
 * fonction qui arrête d'écouter.
 */
export function followDocumentTheme(): () => void {
  const root = document.documentElement;
  const sync = () => push(root.classList.contains("dark"));

  sync();
  const observer = new MutationObserver(sync);
  observer.observe(root, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}
