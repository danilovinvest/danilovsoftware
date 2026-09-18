import { listen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";

/**
 * Les liens qui sortent de l'application.
 *
 * Dans une webview, un `target="_blank"` ne s'ouvre nulle part, et un lien
 * externe ordinaire remplacerait l'interface par la page visée — sans barre
 * d'adresse pour en revenir. Tout ce qui sort passe donc par le navigateur du
 * système.
 */
export function openExternal(url: string): Promise<void> {
  return openUrl(url);
}

function external(anchor: HTMLAnchorElement): boolean {
  if (!anchor.href) return false;
  if (anchor.target === "_blank") return true;
  // Un lien absolu vers un autre site, même sans `_blank`, quitterait l'interface.
  return /^(https?:|mailto:|tel:)/.test(anchor.href) && new URL(anchor.href).origin !== window.location.origin;
}

/**
 * Détourne vers le navigateur tout lien externe cliqué dans la page.
 *
 * Un seul écouteur, posé sur le document, plutôt qu'une modification de chaque
 * lien : le CRM en ouvre depuis une dizaine d'écrans (OneDrive, pièces jointes,
 * portail Entra…), et le prochain qu'on écrira sera couvert sans y penser.
 * Rend la fonction qui le retire.
 */
export function interceptExternalLinks(): () => void {
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0) return;
    const anchor = (event.target as Element | null)?.closest?.("a");
    if (!(anchor instanceof HTMLAnchorElement) || !external(anchor)) return;
    event.preventDefault();
    void openExternal(anchor.href);
  };
  document.addEventListener("click", onClick);
  return () => document.removeEventListener("click", onClick);
}

/**
 * Écoute les retours du navigateur vers un écran de l'interface
 * (`omptcrm://app/settings/agenda?connecte=…`, après un raccordement Google ou
 * Microsoft). La coque a déjà vérifié que le chemin est interne.
 */
export function onNavigateRequest(navigate: (path: string) => void): () => void {
  const pending = listen<string>("app://navigate", (event) => navigate(event.payload));
  return () => void pending.then((unlisten) => unlisten());
}
