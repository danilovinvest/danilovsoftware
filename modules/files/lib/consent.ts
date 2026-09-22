/**
 * Le retour du consentement Microsoft, traduit.
 *
 * La route de rappel ne met dans `?erreur=` qu'un **code** (`api/internal/
 * onedrive/consent.go`), et cet écran n'affiche que ce qu'il sait traduire :
 * une URL se fabrique, et afficher son texte laisserait un lien forgé poser
 * dans le CRM un « message officiel » de son choix. Un code inconnu — ou une
 * phrase glissée à sa place — donne la phrase générique.
 *
 * Les causes qui se corrigent dans le portail Entra ne parlent qu'à qui
 * l'administre : pour les autres, elles disent seulement de le prévenir.
 */
const FOR_EVERYONE: Record<string, string> = {
  refuse: "L'accès a été refusé, ou l'administrateur du compte Microsoft ne l'a pas accordé.",
  consentement: "Microsoft demande un consentement explicite : relancez le raccordement.",
  expire: "L'autorisation a expiré : relancez le raccordement.",
};

const FOR_ADMIN: Record<string, string> = {
  redirection:
    "L'URL de redirection ne correspond pas à celle enregistrée dans Entra : ajoutez-la à l'identique, plateforme « Web ».",
  secret:
    "Secret client refusé : recopiez la valeur du secret, pas son identifiant, et vérifiez qu'il n'a pas expiré.",
  permission:
    "La permission Files.ReadWrite.All n'est pas accordée : ajoutez-la dans Entra puis accordez le consentement administrateur.",
  application: "Application inconnue de Microsoft : vérifiez l'identifiant client.",
};

const GENERIC = "Le raccordement OneDrive a échoué. Réessayez ; si cela persiste, prévenez l'administrateur du CRM.";

export function consentErrorMessage(code: string | null, isAdmin: boolean): string | null {
  if (code === null) return null;
  if (Object.hasOwn(FOR_EVERYONE, code)) return FOR_EVERYONE[code];
  if (Object.hasOwn(FOR_ADMIN, code)) {
    return isAdmin
      ? FOR_ADMIN[code]
      : "Le raccordement OneDrive est mal configuré sur le serveur : prévenez l'administrateur du CRM.";
  }
  return GENERIC;
}
