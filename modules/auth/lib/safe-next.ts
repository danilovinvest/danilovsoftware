/**
 * Où revenir après une connexion — la seule fonction qui lise `next`.
 *
 * Le paramètre vient de l'URL, donc de n'importe qui : un lien forgé
 * `/login?next=https://ailleurs.example` enverrait vers un site tiers une
 * personne qui vient de prouver son identité au CRM. On n'accepte donc qu'un
 * chemin **de ce site** : il commence par une seule barre oblique. `//hote`
 * est une adresse relative au protocole, et `/\hote` en devient une pour les
 * navigateurs, qui lisent la contre-oblique comme une barre — les deux sortent
 * du site. Un caractère de contrôle est refusé aussi : un navigateur retire
 * tabulations et retours à la ligne d'une URL, `/\t/hote` redeviendrait `//hote`.
 *
 * Tout le reste retombe sur le tableau de bord, plutôt que d'échouer : un
 * `next` illisible ne mérite pas qu'on bloque une connexion réussie.
 */
export const DEFAULT_AFTER_LOGIN = "/dashboard";

export function safeNext(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_AFTER_LOGIN;
  if (!raw.startsWith("/")) return DEFAULT_AFTER_LOGIN;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return DEFAULT_AFTER_LOGIN;
  // Par les codes plutôt que par une expression régulière : `no-control-regex`
  // refuse à juste titre les caractères de contrôle dans un motif.
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return DEFAULT_AFTER_LOGIN;
  }
  // Une connexion qui ramènerait à la page de connexion tournerait en rond.
  if (raw === "/login" || raw.startsWith("/login?") || raw.startsWith("/login/")) {
    return DEFAULT_AFTER_LOGIN;
  }
  return raw;
}

/** L'adresse de connexion qui ramènera ici : chemin **et** paramètres. */
export function loginHref(pathname: string, search: string): string {
  return `/login?next=${encodeURIComponent(pathname + search)}`;
}
