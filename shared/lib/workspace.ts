/**
 * Identité de l'espace de travail.
 *
 * Le CRM est mono-espace : il n'y a rien à aller chercher côté API. Ces
 * libellés apparaissent dans le sélecteur en haut du tiroir et dans les
 * réglages généraux — ils sont déclarés une fois pour ne pas diverger.
 */
export const WORKSPACE = {
  name: "Danilov",
  tagline: "Bureau d'études techniques",
  /** Initiale affichée dans la pastille carrée du sélecteur. */
  initial: "D",
} as const;
