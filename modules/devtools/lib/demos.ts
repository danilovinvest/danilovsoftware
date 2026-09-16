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
    id: "connexion-par-passkey",
    title: "Entrer par une clé d'accès, sans mot de passe",
    date: "2026-09-16",
    steps: [
      {
        path: "/settings",
        target: '[data-demo="passkeys"]',
        title: "Une empreinte à la place du mot de passe — mais le mot de passe reste",
        body: "Une clé d'accès s'enregistre sur un appareil : c'est lui qui prouve votre identité, par Touch ID, Face ID ou le code de l'écran de verrouillage. Rien à retenir, rien à taper, et rien à voler — la moitié secrète ne quitte jamais l'appareil, et le CRM n'en garde que la moitié publique, celle qui sert à vérifier et qui ne permet pas d'entrer. Le mot de passe, lui, n'est pas retiré : une bascule sèche vous laisserait dehors le jour où un iPhone se perd. C'est pourquoi retirer sa dernière clé reste permis, et pourquoi changer de mot de passe ne supprime aucune clé — c'est justement le recours quand le mot de passe est perdu.",
      },
      {
        path: "/settings",
        target: '[data-demo="passkey-add"]',
        title: "Une clé s'ajoute en un geste, et se nomme",
        body: "« Ajouter une clé » demande à l'appareil de fabriquer la sienne : une empreinte, et c'est fait. Le nom est facultatif — sans lui le CRM nomme la ligne d'après ce que la clé dit d'elle-même, « Cet appareil » ou « Clé de sécurité », plutôt que de laisser une ligne anonyme qu'on n'oserait pas supprimer. La pastille « Synchronisée » dit que la clé vit aussi ailleurs que sur cet appareil, dans votre trousseau iCloud ou Google : la perdre ne fait alors pas perdre l'accès. Ensuite, sur l'écran de connexion, un bouton « Se connecter avec une clé d'accès » suffit : aucune adresse à saisir, le navigateur sait déjà lesquelles il détient pour ce domaine.",
      },
    ],
  },
  {
    id: "taches-a-la-github",
    title: "Le tableau des tâches, à la GitHub Projects",
    date: "2026-09-16",
    steps: [
      {
        path: "/tasks",
        target: '[data-demo="task-filter"]',
        title: "Filtrer d'abord, en pleine largeur",
        body: "C'est le premier geste qu'on fait en arrivant sur l'écran, et il était coincé dans un champ de deux cent quatre-vingts pixels entre deux groupes de boutons. Il prend désormais toute la largeur, au-dessus de tout le reste, comme sur un tableau GitHub Projects. Les filtres qui restent en dessous sont ceux qu'on choisit — mes tâches, un client, une échéance — pas ceux qu'on tape.",
      },
      {
        path: "/tasks",
        target: '[data-demo="task-column-hint"]',
        title: "Chaque colonne dit quand une carte y a sa place",
        body: "Les catégories restent celles du CRM — à faire, en cours, en attente, terminée — parce que les colonnes de GitHub parlent de pull requests, ce qui ne veut rien dire pour un mur porteur. Ce qui est copié, c'est la phrase sous l'en-tête, et c'est elle qui manquait : « À faire » et « En attente » se ressemblent assez pour qu'on hésite à chaque dépôt, si bien que deux personnes ne rangent pas pareil. L'émoji du titre n'est pas un ornement — il rend la colonne reconnaissable avant d'être lue, même quand la largeur tronque le mot.",
      },
      {
        path: "/tasks",
        click: '[data-demo="task-new"]',
        target: "#task-size-field",
        title: "La taille d'une tâche, et le droit de ne pas savoir",
        body: "Les quatre crans de GitHub — Small, Regular, Large, X-Large — avec leurs libellés anglais, puisque ce sont ceux que vous lisez sur votre propre tableau. Ils apparaissent en pastille sur la carte, à côté de l'urgence. Le champ reste facultatif et part sur « Non estimée » : « on ne sait pas » n'est pas « moyenne », et une tâche que personne n'a regardée ne doit pas peser comme une tâche moyenne dans ce qu'on lira demain. Les tâches que le CRM crée seul n'en portent aucune — une machine ne sait pas combien de temps prend une note de calcul. La carte, elle, se lit maintenant en trois étages : d'où ça vient (le client et le numéro de dossier, avec l'avatar de l'assigné à droite), ce qu'il y a à faire, puis les pastilles.",
      },
    ],
  },
  {
    id: "montants-des-factures",
    title: "Les factures disent enfin leur montant",
    date: "2026-09-16",
    steps: [
      {
        /*
          La fiche Baubillier : une seule affaire — donc dépliée d'office — et
          deux factures dont le montant a été mesuré lisible avant d'écrire
          cette étape, 704,00 € et 13 108,95 €. Une fiche à plusieurs affaires
          ne conviendrait pas : une seule est dépliée, et une étape ne porte
          qu'un clic.
        */
        path: "/customers/7b258702-e98d-49be-b2f2-4197cf335fc8",
        click: '[data-demo="tab-devis"]',
        target: '[data-demo="quote-amount-source"]',
        title: "Ce n'était pas invisible, c'était un mot qui manquait",
        body: "Cent vingt-sept des cent quarante-quatre documents dont le CRM n'arrivait pas à lire le montant étaient des factures — et le chiffre y était écrit en clair depuis le début. Ce qui manquait n'était pas un œil, c'était le vocabulaire : une facture dit « Montant de la facture HT » ou « Total acompte HT », et aucune de ces phrases ne contient « Total HT ». Vingt-cinq factures reprises au hasard : vingt-cinq lues, aucune en désaccord avec son propre document, et trente et une lectures du lot dont le TTC retombe au centime sur 10 % ou 20 %. Le mot « acompte » reste piégeux et la règle en tient compte : sur une facture d'acompte c'est le montant de la pièce, sur un devis ce n'est qu'une fraction — la référence tranche. Enfin une facture d'avoir, à montants négatifs, se refuse en le disant plutôt que de se faire lire à l'envers : celle qui portait « -1 976,00 € » était lue « 1 976,00 ». Quatre devis rédigés en russe et trois PDF sans aucune couche de texte restent illisibles, et l'écran le dit au lieu de le deviner.",
      },
    ],
  },
  {
    id: "ecart-entre-saisie-et-pdf",
    title: "Quand une saisie contredit son propre PDF",
    date: "2026-09-16",
    steps: [
      {
        /*
          La fiche Lisa Meilhac : une seule affaire, un seul devis, et un écart
          net — 9 437,00 € saisis là où le document dit 10 699,00 €. Une fiche à
          plusieurs affaires ne conviendrait pas : une seule est dépliée, et une
          étape ne porte qu'un clic.
        */
        path: "/customers/02086ac2-2cc1-455c-8c49-daeebc73048b",
        click: '[data-demo="tab-devis"]',
        target: '[data-demo="quote-amount-divergence"]',
        title: "Le CRM le dit, il ne le corrige pas",
        body: "Quatorze devis sur les quarante-neuf qui portaient à la fois un montant saisi et un PDF ont un écart entre les deux — et à chaque fois c'est le document qui a raison : le chiffre saisi n'y figure nulle part, tandis que le chiffre lu est confirmé par le TTC imprimé. Une remise accordée, une révision, ou un TTC rond ramené en HT (13 636,36 € = 15 000 € / 1,1). Le CRM n'écrase rien, parce qu'une remise est une décision commerciale et non une erreur : il affiche ce que le document dit, son infobulle montre la ligne exacte qui le justifie, et vous tranchez. Réglages → Fichiers compte combien de saisies sont ainsi contredites.",
      },
    ],
  },
  {
    id: "montants-lus-des-pdf",
    title: "Les montants lus dans les PDF des devis",
    date: "2026-09-16",
    steps: [
      {
        path: "/settings/fichiers",
        target: '[data-demo="quote-amounts"]',
        title: "Le montant était déjà écrit, dans le PDF",
        body: "531 devis, 136 montants saisis — alors que 382 devis ont leur PDF dans OneDrive : le chiffre dormait dans une pièce que le CRM sait ouvrir. Il en lit vingt à chaque tour de copie et remplit le HT, la TVA et le TTC quand il est sûr, sans jamais toucher un montant saisi à la main. Ce bloc dit combien viennent d'un humain, combien du document, combien restent, et pourquoi les autres ont échoué — une facture d'acompte ou un devis scanné n'ont aucun total à lire, et c'est dit plutôt que devine. La règle a d'abord écrit sept montants faux en confondant l'en-tête du tableau avec une ligne de total : le devis qu'elle avait mis à 15 € porte aujourd'hui 152 502,00 €, confirmé par le TTC imprimé dans le même document.",
      },
      {
        // La fiche Mattatia n'a qu'une affaire et qu'un devis : la pastille est
        // donc forcement dans l'affaire affichee. La fiche essayee d'abord en
        // portait plusieurs, dont une seule est depliee, et la zone n'etait pas
        // trouvee -- constate en production avant de livrer cette etape.
        path: "/customers/cf5f2622-d368-4e68-9e47-990ee24a46c1",
        click: '[data-demo="tab-devis"]',
        target: '[data-demo="quote-amount-source"]',
        title: "D'où vient le chiffre, et comment le vérifier",
        body: "La pastille « lu du PDF » dit que ce montant vient du document et non d'une saisie, et son infobulle montre la ligne exacte qui l'a justifié — de quoi vérifier sans rouvrir le PDF. Ici 320 256,50 € HT, que le TTC imprimé du même document confirme au centime. La règle a été mesurée sur 89 devis réels des deux sociétés, dont 49 dont vous aviez saisi le montant : aucun montant faux. Une découverte au passage — sur ces 49, quatorze saisies diffèrent de leur document, et c'est le document qui a raison ; celles-là ne sont pas corrigées, un montant saisi n'étant jamais écrasé.",
      },
    ],
  },
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
