/**
 * La relecture des fiches.
 *
 * Deux cent quarante-quatre fiches sont entrées d'un coup — dossiers OneDrive,
 * agenda, courriels — et personne ne les a encore ouvertes une à une. Les deux
 * crans disent où en est ce travail-là, qui n'a rien à voir avec le cycle
 * commercial : une affaire peut être signée sur une fiche dont l'adresse est
 * fausse.
 *
 * Les deux filtres proposés sont ceux du manque. « Vérifiées » et « complètes »
 * existent côté serveur pour relire ce qu'on a coché, mais ils n'ont pas leur
 * place dans une barre : on cherche ce qui reste, pas ce qui est fait.
 */
export const REVIEW_FILTERS: Array<{ key: string; label: string; hint: string }> = [
  {
    key: "a_verifier",
    label: "À vérifier",
    hint: "Fiches dont personne n'a encore confirmé la première lecture",
  },
  {
    key: "a_completer",
    label: "À compléter",
    hint: "Fiches qui n'ont pas encore été déclarées complètes",
  },
];
