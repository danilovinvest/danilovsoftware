/**
 * Identité de l'espace de travail.
 *
 * Le CRM est mono-espace : il n'y a rien à aller chercher côté API. Ces
 * libellés apparaissent dans le sélecteur en haut du tiroir et dans les
 * réglages généraux — ils sont déclarés une fois pour ne pas diverger.
 *
 * Le nom est celui de l'enseigne, pas celui de la holding : les affaires se
 * signent OMPT STRUCTURE et OMPT GROUPE, et c'est ce logo-là qui est sur les
 * devis. DANILOV INVEST reste dans `modules/group` — c'est une société du
 * groupe, pas la marque.
 *
 * La marque, elle, vit dans `shared/ui/logo.tsx` : les tracés du fichier
 * fourni par l'entreprise, et non une initiale dans une pastille.
 */
export const WORKSPACE = {
  name: "OMPT",
  tagline: "Bureau d'études techniques et travaux",
  /**
   * La version courte, pour la ligne sous le nom dans le tiroir.
   *
   * Deux cent trente-six pixels de colonne : la phrase complète s'y coupe au
   * troisième mot, et « Bureau d'études techn… » ne dit rien de plus qu'un
   * blanc. Deux métiers en trois mots, c'est tout ce que cette ligne doit.
   */
  short: "Études & travaux",
} as const;
