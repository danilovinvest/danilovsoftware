import type { MailView } from "./types";

/**
 * Les vues de la messagerie, et ce que chacune promet.
 *
 * « À traiter » vient d'abord et s'ouvre par défaut : c'est la question qu'on
 * pose le matin — qu'est-ce qui attend une réponse ? « Déjà lus » a disparu :
 * il voulait dire « corps copié en base », ce qui n'intéresse que la copie.
 *
 * Chaque vue dit aussi quoi faire quand elle est vide : une liste vide sans
 * phrase se lit comme une panne.
 */
export type ViewSpec = {
  key: MailView;
  label: string;
  hint: string;
  empty: { title: string; description: string };
};

export const VIEWS: ViewSpec[] = [
  {
    key: "a_traiter",
    label: "À traiter",
    hint: "Le dernier mot est celui d'un correspondant, et personne ne l'a traité",
    empty: {
      title: "Rien à traiter",
      description:
        "Toutes les conversations des trente derniers jours ont une réponse ou ont été marquées traitées. Un nouveau message les rouvrira de lui-même.",
    },
  },
  {
    key: "tous",
    label: "Tous",
    hint: "Toute la boîte, envois en masse compris",
    empty: {
      title: "Aucune conversation",
      description: "Rien ne correspond. Retirez un filtre ou changez de boîte.",
    },
  },
  {
    key: "rapproches",
    label: "Rapprochés",
    hint: "Rattachés à une fiche client",
    empty: {
      title: "Aucune conversation rapprochée",
      description:
        "Rattachez une conversation à sa fiche depuis « Sans fiche » : l'adresse retenue ramènera aussi son passé.",
    },
  },
  {
    key: "sans_fiche",
    label: "Sans fiche",
    hint: "Correspondants inconnus du CRM, hors envois en masse",
    empty: {
      title: "Tout est rapproché",
      description: "Chaque conversation de cette recherche est rattachée à une fiche.",
    },
  },
  {
    key: "envoyes",
    label: "Envoyés",
    hint: "Les conversations où l'entreprise a écrit",
    empty: {
      title: "Aucun envoi",
      description: "Aucune conversation de cette recherche ne porte de message écrit par l'entreprise.",
    },
  },
];

export const DEFAULT_VIEW: MailView = "a_traiter";

export function viewSpec(key: MailView): ViewSpec {
  return VIEWS.find((view) => view.key === key) ?? VIEWS[0];
}

export function isView(value: string | null): value is MailView {
  return VIEWS.some((view) => view.key === value);
}
