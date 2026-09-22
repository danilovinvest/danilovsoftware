/**
 * Le retour du consentement Google, traduit.
 *
 * La route de rappel ne met dans `?erreur=` qu'un code connu
 * (`api/internal/calendar/handler.go`, `googleErrorCode`), et cet écran
 * n'affiche que ce qu'il sait traduire : une URL se fabrique, et afficher son
 * texte laisserait un lien forgé poser un « message officiel » dans le CRM.
 * Tout autre contenu donne la phrase générique.
 *
 * Ce qui se corrige dans la console Google Cloud ne parle qu'à qui
 * l'administre ; pour les autres, l'écran dit seulement qui prévenir.
 */
const FOR_EVERYONE: Record<string, string> = {
  admin_policy_enforced:
    "L'administrateur du domaine Google Workspace interdit à cette application d'accéder à l'agenda.",
  org_internal:
    "Cette application est réservée aux comptes de l'organisation qui l'a déclarée ; le compte utilisé n'en fait pas partie.",
};

const FOR_ADMIN: Record<string, string> = {
  access_denied:
    "Google a refusé l'accès. Soit l'autorisation a été annulée, soit l'application est encore en mode « Test » dans la console Google Cloud — dans ce cas seuls les comptes déclarés testeurs peuvent entrer. Publiez l'application, ou ajoutez ce compte aux testeurs.",
  redirect_uri_mismatch:
    "L'URI de redirection déclarée dans la console Google ne correspond pas à celle du serveur, au caractère près.",
  invalid_client:
    "Identifiant ou secret client Google invalide : vérifiez CRM_GOOGLE_CLIENT_ID et CRM_GOOGLE_CLIENT_SECRET sur le serveur.",
};

const FOR_USER: Record<string, string> = {
  access_denied:
    "Google a refusé l'accès : l'autorisation a été annulée, ou ce compte n'est pas autorisé. Réessayez ; si cela persiste, prévenez l'administrateur du CRM.",
  redirect_uri_mismatch:
    "Le raccordement Google est mal configuré sur le serveur : prévenez l'administrateur du CRM.",
  invalid_client:
    "Le raccordement Google est mal configuré sur le serveur : prévenez l'administrateur du CRM.",
};

const GENERIC =
  "Le raccordement Google a échoué. Réessayez ; si cela persiste, prévenez l'administrateur du CRM.";

export function googleConsentMessage(code: string | null, isAdmin: boolean): string | null {
  if (code === null) return null;
  if (Object.hasOwn(FOR_EVERYONE, code)) return FOR_EVERYONE[code];
  const table = isAdmin ? FOR_ADMIN : FOR_USER;
  if (Object.hasOwn(table, code)) return table[code];
  return GENERIC;
}
