/**
 * Pourquoi la session s'est fermée — les seules raisons que la page de
 * connexion sait dire.
 *
 * Le paramètre `?raison=` vient de l'URL, donc de n'importe qui : l'afficher
 * tel quel laisserait un lien forgé écrire un faux message officiel sur la
 * page où l'on tape son mot de passe. Seul un **code connu** est traduit, et
 * tout le reste se tait — la même règle que `?erreur=` au retour d'OAuth.
 */
export type SignOutReason = "mot-de-passe" | "sessions-fermees";

const MESSAGES: Record<SignOutReason, string> = {
  "mot-de-passe":
    "Votre mot de passe a été changé. Toutes vos sessions ont été fermées : reconnectez-vous avec le nouveau.",
  "sessions-fermees":
    "Toutes vos sessions ont été fermées, sur cet appareil comme sur les autres. Reconnectez-vous pour continuer.",
};

export function signOutReasonMessage(raw: string | null | undefined): string | null {
  if (!raw || !Object.hasOwn(MESSAGES, raw)) return null;
  return MESSAGES[raw as SignOutReason];
}

/** L'adresse de connexion qui dit pourquoi on y revient. */
export function loginHrefWithReason(reason: SignOutReason): string {
  return `/login?raison=${reason}`;
}
