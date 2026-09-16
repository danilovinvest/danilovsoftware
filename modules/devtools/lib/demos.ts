/**
 * Les démos des fonctionnalités livrées, de la plus récente à la plus ancienne.
 *
 * **Chaque fonctionnalité terminée ajoute la sienne ici**, en tête de liste, et
 * marque ses zones à l'écran (`data-demo`). C'est la demande du dirigeant :
 * voir ce qui a changé comme lors d'une démonstration, plutôt que de le lire
 * dans un compte rendu — une zone entourée se comprend avant d'être expliquée.
 *
 * Une étape désigne sa zone par un **sélecteur CSS**. `data-demo` est la
 * convention, mais un `id` ou un `aria-label` existants suffisent quand le
 * composant ne transmet pas d'attribut. Plusieurs éléments trouvés forment une
 * seule zone, qui les englobe tous.
 */

export type DemoStep = {
  /** L'écran où se trouve la zone. Absent, l'étape reste sur l'écran courant. */
  path?: string;
  /** Un élément à cliquer d'abord — un onglet, un bouton qui ouvre un tiroir. */
  click?: string;
  /** La zone à entourer. */
  target: string;
  title: string;
  body: string;
};

export type Demo = {
  id: string;
  title: string;
  /** Le jour de la livraison, `YYYY-MM-DD`. */
  date: string;
  steps: DemoStep[];
};

/*
  La fiche qui sert d'exemple aux démos STRUCTURE : une étude envoyée, une seule
  affaire, dépliée d'office. Si elle disparaît, l'étape le dit au lieu de rester
  muette — la zone introuvable est signalée à l'écran.
*/
const FICHE_ETUDE = "/customers/7419530d-fbb2-4937-aaf5-2403b315f71b";

export const DEMOS: Demo[] = [
  {
    id: "sous-traitance",
    title: "La sous-traitance d'une affaire",
    date: "2026-09-16",
    steps: [
      {
        path: FICHE_ETUDE,
        click: '[data-demo="tab-devis"]',
        target: '[data-demo="subcontracting"]',
        title: "Qui sous-traite, et pour combien",
        body: "Igor, Alex, Vladimir, Maxime : on en ajoute un ou plusieurs, chacun avec son montant — tout est facultatif. Le bloc affiche le total, la part que ça prend du chiffré et la marge estimée, quand les devis portent un montant.",
      },
    ],
  },
  {
    id: "prochaine-action-assignee",
    title: "La prochaine action, et qui la porte",
    date: "2026-09-15",
    steps: [
      {
        path: FICHE_ETUDE,
        target: '[data-demo="next-assignment"]',
        title: "Quoi, par qui, pour quand",
        body: "Sous « à faire maintenant » : la tâche en cours, son responsable, son échéance et sa priorité. Sans elle, « Assigner » crée la tâche pré-remplie — l'étape, la bonne personne (ingénieur, dessinateur, responsable), la deadline interne. « M'attribuer » pose le responsable de l'affaire d'un clic.",
      },
      {
        path: "/dashboard",
        target: '[data-demo="unassigned-panel"]',
        title: "À attribuer",
        body: "Les dossiers actifs sans responsable ou sans prochaine action, les signés et les deadlines proches d'abord. On s'en attribue un d'un clic, sans passer par la fiche. « Mes dossiers » montre ensuite la prochaine action de chacun.",
      },
    ],
  },
  {
    id: "affaire-societe-suppression",
    title: "Basculer une affaire de société, la supprimer",
    date: "2026-09-15",
    steps: [
      {
        path: FICHE_ETUDE,
        target: '[data-demo="project-issuer"]',
        title: "La société de l'affaire",
        body: "STRUCTURE ou GROUPE : un clic pour la basculer. Ses devis peuvent suivre (c'est eux qui portent le SIREN et la TVA), et une référence déjà prise dans l'autre société est signalée sans rien écrire. « déduite » veut dire qu'elle se lit encore sur les devis.",
      },
      {
        path: FICHE_ETUDE,
        target: '[data-demo="project-edit"], [data-demo="project-delete"]',
        title: "Modifier et supprimer, en toutes lettres",
        body: "Supprimer demande deux confirmations : la première liste ce qui part (devis, factures, preuves, jalons) et ce qui reste (échanges, rendez-vous, dossier OneDrive), la seconde dit que c'est définitif. La copie OneDrive ne recrée plus une affaire supprimée.",
      },
    ],
  },
  {
    id: "apercu-documents",
    title: "Voir un document sans quitter le CRM",
    date: "2026-09-15",
    steps: [
      {
        path: FICHE_ETUDE,
        click: '[data-demo="cran-devis"]',
        target: '[data-demo="step-proofs"] button[title^="Aperçu de"]',
        title: "Un clic, le document s'ouvre ici",
        body: "Devis, factures, preuves, onglet Documents : le fichier s'affiche dans une fenêtre du CRM, sans passer par OneDrive. Word, Excel et PowerPoint sont convertis en PDF par Microsoft. « Ouvrir dans OneDrive » reste là pour ce que l'aperçu ne sait pas montrer, comme un plan DWG.",
      },
    ],
  },
  {
    id: "preuves-et-clients",
    title: "Prouver un cran de la frise",
    date: "2026-09-15",
    steps: [
      {
        path: FICHE_ETUDE,
        click: '[data-demo="cran-devis"]',
        target: '[data-demo="step-proofs"]',
        title: "Ce qui prouve déjà le cran",
        body: "Le PDF du devis, la facture, le compte rendu du rendez-vous : ce que l'affaire porte déjà s'ouvre d'un clic. Le trombone sous un cran dit combien de preuves il a.",
      },
      {
        path: FICHE_ETUDE,
        click: '[data-demo="cran-calcul"]',
        target: '[data-demo="step-proofs"]',
        title: "Joindre une preuve",
        body: "Un fichier de l'ordinateur part dans le dossier OneDrive de l'affaire, rangé par thème (Devis, Factures, Plans, Rapports, Photos…) et nommé « date_cran_nom ». Un courriel y copie ses pièces jointes. On peut aussi choisir un document déjà dans le dossier, écrire une note et dire quand c'est arrivé.",
      },
    ],
  },
  {
    id: "taches-automatiques",
    title: "Les tâches automatiques de STRUCTURE",
    date: "2026-09-15",
    steps: [
      {
        path: FICHE_ETUDE,
        target: '[data-demo="next-action"]',
        title: "Chaque étape crée la suivante",
        body: "Devis signé → « Émettre la facture d'acompte ». Acompte encaissé → « Réaliser le calcul » pour l'ingénieur. Calcul terminé → « Dessiner les plans » pour le dessinateur. Plans rendus → « Valider les plans ». Dossier définitif → « Envoyer le dossier ». Dossier livré → « Vérifier la satisfaction ».",
      },
      {
        path: FICHE_ETUDE,
        click: '[data-demo="tab-apres"]',
        target:
          '[data-demo="jalon-deposit_paid_at"], [data-demo="jalon-calc_done_at"], [data-demo="jalon-plans_review_at"], [data-demo="jalon-final_ready_at"], [data-demo="jalon-plans_sent_at"]',
        title: "Les étapes qui déclenchent",
        body: "Une tâche naît quand une de ces étapes devient vraie — jamais sur une étape déjà cochée avant, et une seule fois par affaire. Cocher l'étape suivante ferme la tâche d'elle-même.",
      },
      {
        path: FICHE_ETUDE,
        target: '[data-demo="tab-taches"]',
        title: "Elles arrivent dans les Tâches",
        body: "Assignées à l'ingénieur, au dessinateur ou au responsable de l'affaire, avec l'échéance de la deadline interne si elle est posée. La pastille « Auto » dit quelle étape l'a créée.",
      },
    ],
  },
  {
    id: "structure-production",
    title: "STRUCTURE : missions, production, numéro et délais",
    date: "2026-09-15",
    steps: [
      {
        path: FICHE_ETUDE,
        target: '[data-demo="project-reference"]',
        title: "Le numéro de dossier",
        body: "Chaque affaire a son numéro, STR- pour une étude, GRP- pour des travaux. Les 515 affaires existantes ont été numérotées, et ⌘K le retrouve avec ou sans préfixe.",
      },
      {
        path: FICHE_ETUDE,
        target: '[data-demo="project-mission"]',
        title: "La mission",
        body: "Étude structurelle, rapport / attestation ou sondage. Elle se déduit des devis tant que personne ne la choisit, et elle décide du parcours de l'affaire.",
      },
      {
        path: FICHE_ETUDE,
        target: '[data-demo="project-cycle"]',
        title: "Une frise par mission",
        body: "L'étude structurelle gagne Calcul et Dossier entre l'acompte et l'envoi. Une attestation se paie puis se rédige, sans acompte. Un sondage se fait puis se rend.",
      },
      {
        path: FICHE_ETUDE,
        target: '[data-demo="next-action"]',
        title: "À faire maintenant suit la production",
        body: "« Calcul à réaliser », « Plans à valider », « Dossier à envoyer » : le bouton date l'étape d'un clic, et le délai s'affiche dès qu'il est posé.",
      },
      {
        path: FICHE_ETUDE,
        click: '[data-demo="tab-apres"]',
        target:
          '[data-demo="jalon-calc_started_at"], [data-demo="jalon-calc_done_at"], [data-demo="jalon-plans_started_at"], [data-demo="jalon-plans_review_at"], [data-demo="jalon-corrections_at"], [data-demo="jalon-final_ready_at"], [data-demo="jalon-plans_sent_at"]',
        title: "La production, étape par étape",
        body: "Qui agit, et quel livrable chaque étape date : calcul terminé = note de calcul, dossier définitif = plans validés. Les corrections sont facultatives et ne bloquent rien.",
      },
      {
        path: FICHE_ETUDE,
        click: '[data-demo="project-edit"]',
        target: '#project-mission, [data-demo="project-delais"]',
        title: "Choisir la mission, poser les délais",
        body: "« Promis au client » engage l'entreprise, « Deadline interne » est la marge qu'on se donne. Tant que rien n'est rendu, l'affaire affiche le temps qu'il reste.",
      },
      {
        path: "/etudes",
        target: '[data-demo="work-lists"]',
        title: "L'écran Études",
        body: "Une étude est « rendue » selon sa mission — dossier, rapport ou rapport de sondage — et les dossiers en retard passent en tête de la production.",
      },
    ],
  },
  {
    id: "acompte-montant",
    title: "Le montant de l'acompte",
    date: "2026-09-14",
    steps: [
      {
        path: FICHE_ETUDE,
        click: '[data-demo="tab-apres"]',
        target: '[data-demo="jalon-deposit_paid_at"]',
        title: "Encaisser, c'est dire combien",
        body: "« Encaissé » ouvre la saisie du montant, pré-remplie et corrigeable ensuite avec « Modifier » quand le client le change. La même saisie existe sur la frise, dans « à faire maintenant » et sur la fiche d'un chantier.",
      },
    ],
  },
  {
    id: "demander-a-claude",
    title: "Le bouton « Demander à Claude » (aperçu)",
    date: "2026-09-14",
    steps: [
      {
        path: "/dashboard",
        target: 'button[aria-label^="Demander à Claude"]',
        title: "Là où un écran a de quoi confier",
        body: "Le panneau montre ce que Claude recevrait et ce qu'il pourrait faire. Il n'est pas encore branché : rien n'est envoyé.",
      },
      {
        path: FICHE_ETUDE,
        target: 'button[aria-label^="Demander à Claude"]',
        title: "Sur la fiche, chaque affaire et chaque devis",
        body: "Enrichir la fiche, suivre l'affaire depuis ses pièces, lire un devis PDF : chaque suggestion dit ce qu'elle modifierait, toujours après validation.",
      },
    ],
  },
];
