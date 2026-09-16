/**
 * La cérémonie WebAuthn, côté navigateur.
 *
 * Aucune dépendance ajoutée : le CRM ne s'autorise que `@xyflow/react` pour
 * l'interface, et tout ce qu'il faut ici tient en une quarantaine de lignes.
 * Les bibliothèques du domaine ne font pas autre chose — traduire deux champs
 * de base64url vers des `ArrayBuffer`, puis l'inverse.
 *
 * **base64url, jamais base64.** Le serveur encode en `base64.RawURLEncoding` :
 * pas de `+`, pas de `/`, pas de `=` de remplissage. `atob` et `btoa` ne
 * connaissent que l'alphabet standard, d'où les deux traductions.
 */

import {
  beginPasskeyLogin,
  beginPasskeyRegistration,
  finishPasskeyLogin,
  finishPasskeyRegistration,
} from "./api";

function fromBase64Url(value: string): ArrayBuffer {
  const standard = value.replaceAll("-", "+").replaceAll("_", "/");
  // `atob` exige un remplissage à un multiple de quatre, que l'encodage brut
  // du serveur omet par définition.
  const padded = standard.padEnd(Math.ceil(standard.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let at = 0; at < binary.length; at++) bytes[at] = binary.charCodeAt(at);
  return bytes.buffer;
}

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

/** L'appareil sait-il faire une passkey ? */
export function passkeysSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential === "function" &&
    !!navigator.credentials
  );
}

/*
 * Les options que le serveur envoie, telles que la spécification les décrit :
 * les champs binaires y voyagent en base64url. On ne retype pas tout le
 * protocole — seuls les champs qu'il faut traduire sont nommés, le reste passe
 * tel quel vers le navigateur, qui est l'autorité sur ce qu'il accepte.
 */
type ServerCreationOptions = {
  challenge: string;
  user: { id: string; name: string; displayName: string };
  excludeCredentials?: { id: string; type: string; transports?: string[] }[];
} & Record<string, unknown>;

type ServerRequestOptions = {
  challenge: string;
  allowCredentials?: { id: string; type: string; transports?: string[] }[];
} & Record<string, unknown>;

/**
 * Crée une passkey à partir des options du serveur et rend ce qu'il attend en
 * retour.
 *
 * L'objet rendu est exactement la forme que lit `protocol.ParseCredentialCreationResponseBody` :
 * les noms de champs viennent de la spécification, pas d'un choix local.
 */
export async function createPasskey(options: ServerCreationOptions) {
  const publicKey = {
    ...options,
    challenge: fromBase64Url(options.challenge),
    user: { ...options.user, id: fromBase64Url(options.user.id) },
    excludeCredentials: options.excludeCredentials?.map((credential) => ({
      ...credential,
      id: fromBase64Url(credential.id),
    })),
  } as unknown as PublicKeyCredentialCreationOptions;

  const credential = (await navigator.credentials.create({
    publicKey,
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error("La création de la clé a été annulée.");

  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: toBase64Url(credential.rawId),
    type: credential.type,
    // L'attachement dit si la clé vit dans l'appareil ou sur une clé USB. Le
    // serveur s'en sert pour nommer la ligne dans les réglages.
    authenticatorAttachment: credential.authenticatorAttachment ?? undefined,
    clientExtensionResults: credential.getClientExtensionResults(),
    response: {
      clientDataJSON: toBase64Url(response.clientDataJSON),
      attestationObject: toBase64Url(response.attestationObject),
      transports: response.getTransports?.() ?? [],
    },
  };
}

/**
 * Présente une passkey déjà enregistrée.
 *
 * Sans `allowCredentials`, le navigateur propose les clés qu'il connaît pour ce
 * domaine : c'est ce qui permet de se connecter **sans taper d'adresse**. C'est
 * tout l'intérêt d'une clé découvrable, et la raison pour laquelle
 * l'enregistrement l'exige.
 */
export async function presentPasskey(options: ServerRequestOptions) {
  const publicKey = {
    ...options,
    challenge: fromBase64Url(options.challenge),
    allowCredentials: options.allowCredentials?.map((credential) => ({
      ...credential,
      id: fromBase64Url(credential.id),
    })),
  } as unknown as PublicKeyCredentialRequestOptions;

  const credential = (await navigator.credentials.get({
    publicKey,
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error("La connexion par clé a été annulée.");

  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: toBase64Url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment ?? undefined,
    clientExtensionResults: credential.getClientExtensionResults(),
    response: {
      clientDataJSON: toBase64Url(response.clientDataJSON),
      authenticatorData: toBase64Url(response.authenticatorData),
      signature: toBase64Url(response.signature),
      // Le handle est ce qui dit *qui* se connecte quand personne n'a tapé
      // d'adresse. Absent, le serveur retrouve le compte par l'identifiant de
      // la clé — mais il n'a alors rien à recouper.
      userHandle: response.userHandle ? toBase64Url(response.userHandle) : null,
    },
  };
}

/*
 * Les deux cérémonies complètes.
 *
 * Elles vivent ici plutôt que dans les écrans : le protocole est l'affaire du
 * module d'authentification, et un écran de réglages n'a pas à savoir qu'une
 * inscription se fait en deux appels avec un défi qui fait l'aller-retour.
 */

/** Enregistre une nouvelle clé sur le compte connecté. */
export async function registerPasskey(name: string) {
  const { options, challenge } = await beginPasskeyRegistration();
  const credential = await createPasskey(
    options.publicKey as unknown as ServerCreationOptions,
  );
  return finishPasskeyRegistration(challenge, credential, name);
}

/**
 * Ouvre une session par une clé, sans qu'aucune adresse ait été saisie.
 *
 * Rend la session telle que l'API la renvoie : c'est `adoptSession` du contexte
 * d'authentification qui l'adopte, exactement comme après une invitation.
 */
export async function loginWithPasskey() {
  const { options, challenge } = await beginPasskeyLogin();
  const credential = await presentPasskey(
    options.publicKey as unknown as ServerRequestOptions,
  );
  return finishPasskeyLogin(challenge, credential);
}

/**
 * Un geste annulé n'est pas une panne.
 *
 * Fermer la feuille de Touch ID lève `NotAllowedError` : afficher « erreur »
 * ferait croire à un défaut là où l'utilisateur a simplement changé d'avis.
 */
export function ceremonyCancelled(cause: unknown): boolean {
  return (
    cause instanceof DOMException &&
    (cause.name === "NotAllowedError" || cause.name === "AbortError")
  );
}
