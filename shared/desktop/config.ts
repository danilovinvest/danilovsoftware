/**
 * La configuration que la coque pose avant la page.
 *
 * `src-tauri/src/config.rs` est le seul endroit qui nomme l'API et le portail :
 * la coque en a besoin pour la session, la page pour ses requêtes, et deux
 * copies auraient fini par diverger. Elle injecte donc `window.__OMPT__` avant
 * le premier script de la page — la valeur est lisible dès le premier rendu.
 *
 * Hors de l'application (`bun run dev` ouvert dans un navigateur ordinaire),
 * l'objet n'existe pas : on retombe sur `NEXT_PUBLIC_API_URL`, puis sur l'API
 * locale. La session, elle, ne fonctionne que dans l'application.
 */
type DesktopConfig = { apiBase: string; webUrl: string };

declare global {
  interface Window {
    __OMPT__?: DesktopConfig;
  }
}

const FALLBACK_API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8080";

function injected(): DesktopConfig | undefined {
  return typeof window === "undefined" ? undefined : window.__OMPT__;
}

/** La base absolue de l'API. */
export function apiBase(): string {
  return injected()?.apiBase.replace(/\/$/, "") ?? FALLBACK_API;
}

/**
 * Le portail : l'adresse web des pages qu'on ouvre dans un navigateur ou qu'on
 * envoie à quelqu'un — invitation, enrôlement d'une clé, connexion par passkey.
 * `window.location.origin` vaut `tauri://localhost` dans l'application : un
 * lien bâti dessus ne s'ouvrirait nulle part ailleurs.
 */
export function webUrl(): string {
  return injected()?.webUrl.replace(/\/$/, "") ?? FALLBACK_API;
}
