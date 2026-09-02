/**
 * Identité de l'espace de travail.
 *
 * Le CRM est mono-espace : il n'y a rien à aller chercher côté API. Ces
 * libellés apparaissent dans le sélecteur en haut du tiroir et dans les
 * réglages généraux — ils sont déclarés une fois pour ne pas diverger.
 *
 * La marque, elle, vit dans `shared/ui/logo.tsx` : une initiale dans une
 * pastille n'était pas un logo, et il en existait deux qui ne se
 * ressemblaient pas.
 */
export const WORKSPACE = {
  name: "Danilov",
  tagline: "Bureau d'études techniques et travaux",
} as const;
