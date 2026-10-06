import { notifyHint } from "@/shared/ui/toaster";
import { isMobileAgent, type ClaudeLinks } from "./claude-link";

/**
 * Ouvrir Claude, depuis un clic — jamais au rendu : l'appareil se lit sur
 * `navigator`, que le serveur n'a pas, et le lire au rendu donnerait deux
 * réponses, donc un écart d'hydratation.
 *
 * - **Téléphone et tablette** (iOS, Android) : l'adresse `https://claude.ai`,
 *   dans un nouvel onglet. C'est un lien universel : l'application Claude
 *   l'ouvre si elle est installée, le navigateur sinon — et le CRM reste dans
 *   son onglet. Le pré-remplissage d'une conversation n'est documenté par
 *   Anthropic que sur le web et le bureau : sur mobile, il n'est pas garanti.
 * - **Ordinateur** : le schéma `claude://`, qui lance l'application de bureau
 *   (macOS, Windows, Linux). Aucun navigateur ne dit si un schéma a trouvé son
 *   application ; si la page n'a pas perdu la main au bout d'un instant, un
 *   toast propose claude.ai. Un **bouton**, pas une ouverture automatique : un
 *   onglet ouvert par minuterie est bloqué comme fenêtre surgissante, et un
 *   faux négatif ouvrirait Claude deux fois.
 *
 * L'application de bureau du CRM a sa propre version de ce fichier, même
 * surface : sa webview n'ouvre pas un schéma étranger, elle le confie au
 * système par le greffon `opener` (`shared/desktop/links.ts`).
 */
export function openInClaude(links: ClaudeLinks): void {
  if (isMobileAgent(navigator.userAgent, navigator.maxTouchPoints)) {
    follow(links.web, true);
    return;
  }
  launchDesktop(links);
}

/** Le délai après lequel une page restée au premier plan veut dire « rien ne s'est ouvert ». */
const LAUNCH_GRACE_MS = 1200;

function launchDesktop(links: ClaudeLinks): void {
  let left = false;
  const onLeave = () => {
    left = true;
  };
  const onVisibility = () => {
    if (document.visibilityState === "hidden") left = true;
  };
  window.addEventListener("blur", onLeave);
  document.addEventListener("visibilitychange", onVisibility);

  follow(links.app, false);

  window.setTimeout(() => {
    window.removeEventListener("blur", onLeave);
    document.removeEventListener("visibilitychange", onVisibility);
    if (left || document.visibilityState === "hidden" || !document.hasFocus()) return;
    notifyHint(
      "Claude ne s'est pas ouvert ?",
      "L'application de bureau n'est peut-être pas installée. La même demande est prête sur claude.ai.",
      { label: "Ouvrir claude.ai", onClick: () => follow(links.web, true) },
    );
  }, LAUNCH_GRACE_MS);
}

/**
 * Un lien éphémère plutôt que `window.location` : un schéma inconnu ne remplace
 * pas la page, et un nouvel onglet garde le CRM ouvert derrière.
 */
function follow(href: string, newTab: boolean): void {
  const link = document.createElement("a");
  link.href = href;
  if (newTab) {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }
  document.body.appendChild(link);
  link.click();
  link.remove();
}
