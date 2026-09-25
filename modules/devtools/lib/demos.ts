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

/*
  La fiche SDC Meynadier-Faure, qui a servi de modèle à la vue graphe : une
  copropriété gérée par un cabinet, une affaire, un devis, deux factures, trois
  virements.
*/
const FICHE_COPRO = "/customers/de2ea332-b3dd-491a-8ea4-b423612731aa";

export const DEMOS: Demo[] = [
  {
    id: "comptable-et-demi-journee",
    title: "La demi-journée, et le rapport au comptable",
    date: "2026-09-25",
    steps: [
      {
        path: "/ouvriers",
        target: '[data-demo="ouvriers-grille"]',
        title: "Une cinquième valeur : la demi-journée",
        body:
          "Les quatre premières étaient mesurées dans le classeur. Celle-ci ne s'y trouvait " +
          "pas : une matinée travaillée n'est ni une présence ni une absence, et la compter " +
          "d'un côté fausse la paie dans les deux sens. Elle vaut 0,5 jour, en ambre — " +
          "ni le vert de la réussite, ni le rouge de l'alerte.",
      },
      {
        path: "/ouvriers",
        target: '[data-demo="ouvriers-comptable"]',
        title: "Le rapport part tout seul le dernier jour du mois",
        body:
          "C'est le **seul** courriel que ce CRM envoie : la messagerie lit, les invitations " +
          "se copient à la main, les automatisations passent par Telegram. Il part par la " +
          "boîte déjà raccordée, avec le mot de passe d'application qui sert à la lire — " +
          "aucun secret de plus. Fermé tant qu'aucune adresse n'est écrite.",
      },
      {
        path: "/ouvriers",
        target: '[data-demo="ouvriers-comptable"]',
        title: "Les samedis n'y sont pas comptés",
        body:
          "Demandé tel quel : un samedi n'est pas un jour ouvré de la paie, et y retenir une " +
          "absence retiendrait une journée qui n'était pas due. Ils restent visibles dans la " +
          "grille au-dessus, où se décide s'ils ont été travaillés. « Voir ce qu'il recevrait » " +
          "montre le décompte, « Envoyer un essai » l'envoie sans consommer l'envoi du mois.",
      },
    ],
  },
  {
    id: "ouvriers-pointage",
    title: "Les ouvriers et leur pointage",
    date: "2026-09-25",
    steps: [
      {
        path: "/ouvriers",
        target: '[data-demo="ouvriers-grille"]',
        title: "La grille du mois, et les totaux que le classeur ne calculait pas",
        body:
          "Le suivi vivait dans « Calendrier ouvriers.xlsx ». Ses trois colonnes de droite — " +
          "jours travaillés, salaire, fiche de paie — étaient vides sur les trente lignes : " +
          "le comptage se faisait à la main, hors du fichier. Les deux colonnes de droite " +
          "sont maintenant comptées par le serveur. Une case se clique et tourne : " +
          "présent, absent, chômé, formation, vide.",
      },
      {
        path: "/ouvriers",
        target: '[data-demo="ouvriers-equipe"]',
        title: "L'équipe s'ajoute et se retire ici",
        body:
          "Les dix noms du classeur sont déjà là. Quelqu'un qui part est **archivé** et non " +
          "supprimé : son pointage passé reste vrai, et l'effacer trouerait les mois déjà " +
          "comptés. Seule une fiche jamais pointée s'efface pour de bon.",
      },
      {
        path: "/ouvriers",
        target: '[data-demo="ouvriers-portail"]',
        title: "L'écran de chantier, et son mot de passe",
        body:
          "L'équipe pointe depuis ouvrier.testbeforeproduction.xyz, avec un seul mot de passe " +
          "partagé : dix ouvriers sur une tablette au dépôt, c'est un secret à tenir et non " +
          "dix. Le changer ferme immédiatement les tablettes déjà déverrouillées — " +
          "ce qu'on veut d'un appareil perdu.",
      },
    ],
  },
  {
    id: "fiche-en-graphe",
    title: "La fiche client en graphe",
    date: "2026-09-24",
    steps: [
      {
        path: FICHE_COPRO,
        click: '[data-demo="tab-graphe"]',
        target: '[data-demo="customer-graph"]',
        title: "Tout ce qui gravite autour de la fiche, sur un seul plan",
        body:
          "Le syndic et ses autres immeubles à gauche, les affaires au centre, leurs devis, " +
          "factures et virements à droite, l'activité en bas. Les trois boutons du haut " +
          "masquent une couche. Survoler un nœud éclaire ses voisins, le cliquer ouvre sa fiche " +
          "à droite. Un point orange signale un champ à renseigner.",
      },
      {
        path: FICHE_COPRO,
        click: '[data-demo="tab-graphe"]',
        target: '[data-demo="graph-panel"]',
        title: "Le panneau dit ce qui manque, et le complète sur place",
        body:
          "Sur la fiche centrale : la relation, le SIRET et le syndic qui la gère. Sur une " +
          "affaire : qui l'a apportée — souvent le syndic, dessiné alors en tirets bleus.",
      },
      {
        path: `${FICHE_COPRO}?vue=details`,
        target: '[data-demo="fiche-classification"]',
        title: "Trois axes au lieu d'un",
        body:
          "Le type dit qui c'est (six nouveaux : copropriété, ingénieur, maître d'œuvre, " +
          "notaire, fournisseur, sous-traitant). La relation dit ce qu'il représente pour " +
          "nous — déduite du type tant que personne ne tranche, et l'en-tête l'écrit alors " +
          "en pointillés. Le statut reste le même.",
      },
    ],
  },
  {
    id: "modele-de-fiche",
    title: "Ce qu'est une fiche complète, et qui se règle",
    date: "2026-09-24",
    steps: [
      {
        path: "/settings/modele",
        target: '[data-demo="modele-de-fiche"]',
        title: "Meynadier est l'étalon, et le CRM le sait",
        body:
          "Mesuré sur 388 fiches : 370 n'ont aucun interlocuteur, 346 aucune adresse " +
          "de chantier, 344 aucun échange, et une seule porte un autre nom, un lien " +
          "de syndic et un document. Le modèle dit ce qui manque, fiche par fiche, " +
          "et sur toute la base.",
      },
      {
        path: "/settings/modele",
        target: '[data-demo="modele-de-fiche"]',
        title: "Deux interrupteurs, et la frontière du réglable",
        body:
          "« S'applique » dit si le contrôle est évalué, « obligatoire » s'il rend la " +
          "fiche incomplète. Les contrôles eux-mêmes restent du code : ils tournent " +
          "en SQL sur toute la base d'un coup, et une condition libre écrite ici " +
          "serait une porte d'injection autant qu'un piège d'entretien.",
      },
      {
        path: "/settings/modele",
        target: '[data-demo="modele-de-fiche"]',
        title: "Un critère facultatif se compte sans faire crier",
        body:
          "« Des échanges semblent dater de leur saisie » attrape aussi un appel noté " +
          "le jour même — en l'exigeant, 387 fiches sur 388 sortaient, et une liste " +
          "de travail qui contient tout ne trie rien. Il reste actif et facultatif : " +
          "pendant une reprise, on peut l'exiger d'un clic.",
      },
    ],
  },
  {
    id: "alias-liens-documents",
    title: "Une fiche se retrouve sous tous ses noms",
    date: "2026-09-24",
    steps: [
      {
        path: "/customers",
        target: '[data-demo="customer-table"]',
        title: "« Menadier » retrouve « Meynadier »",
        body:
          "La fiche s'appelait « 47 Rue Menadier » et tous ses documents disent " +
          "« Meynadier » : corriger l'une des deux orthographes faisait perdre l'autre. " +
          "Les autres noms se retiennent, la recherche les prend, et elle dit par lequel " +
          "la fiche remonte — un résultat sorti de nulle part est pire qu'aucun résultat.",
      },
      {
        path: "/customers",
        target: '[data-demo="customer-table"]',
        title: "Le syndic sait ce qu'il gère",
        body:
          "Un même cabinet gère plusieurs immeubles, un même architecte suit plusieurs " +
          "chantiers. Rien ne les reliait : le nom du syndic vivait dans les notes. " +
          "Les deux sens se lisent — mon syndic, et les immeubles que je gère.",
      },
      {
        path: "/customers",
        target: '[data-demo="customer-table"]',
        title: "Et fusionner ne perd plus rien",
        body:
          "Affaires, devis, interlocuteurs, échanges, courriels, liens, documents et " +
          "journal des corrections suivent — et le nom de la fiche absorbée est retenu " +
          "comme autre nom. Trois de ces tables étaient oubliées avant aujourd'hui.",
      },
    ],
  },
  {
    id: "facture-et-encaisse",
    title: "Une affaire dit enfin ce qu'elle a facturé et encaissé",
    date: "2026-09-24",
    steps: [
      {
        path: "/customers/de2ea332-b3dd-491a-8ea4-b423612731aa",
        click: '[data-demo="tab-devis"]',
        target: '[data-demo="invoice-totals"]',
        title: "Trois chiffres qu'aucune requête ne savait rendre",
        body:
          "Cette affaire porte deux factures et affichait « 0 TTC ». Elle dit désormais " +
          "facturé, encaissé et reste à payer. Le facturé écarte les factures d'acompte : " +
          "FA2025-0416 (2 860 €) est un appel de fonds sur FA2025-0421 (5 720 €), et les " +
          "additionner compterait deux fois le même marché — 8 580 € au lieu de 5 720 €.",
      },
      {
        path: "/customers/de2ea332-b3dd-491a-8ea4-b423612731aa",
        click: '[data-demo="tab-devis"]',
        target: '[data-demo="invoice-totals"]',
        title: "Et il dit ce qu'il ne sait pas",
        body:
          "Mesuré le 24/09 : 154 acomptes sont marqués encaissés, cinq portent un montant. " +
          "Annoncer un reste à payer égal à la totalité du marché sur les autres ferait " +
          "douter de tout l'écran. Le bloc compte donc les règlements dont le montant " +
          "manque et se tait sur le reste, plutôt que d'afficher un chiffre faux.",
      },
      {
        path: "/customers/de2ea332-b3dd-491a-8ea4-b423612731aa",
        click: '[data-demo="tab-devis"]',
        target: '[data-demo="invoice-totals"]',
        title: "Une pièce sait ce qu'elle est",
        body:
          "« Est-ce une facture ? » se devinait d'une expression régulière sur la référence, " +
          "à huit endroits. C'est désormais une colonne, posée à la naissance de la pièce " +
          "pour les quatre chemins qui en créent — le formulaire, la copie OneDrive, " +
          "l'import Excel et l'assistant. Le front a cessé de tenir sa propre copie de la règle.",
      },
    ],
  },
  {
    id: "enrichir-une-fiche",
    title: "L'assistant peut enfin corriger une fiche",
    date: "2026-09-24",
    steps: [
      {
        path: "/customers",
        target: '[data-demo="customer-table"]',
        title: "Le connecteur savait créer, jamais corriger",
        body:
          "Il pouvait ouvrir une fiche et n'en changer aucun champ. Mesuré le 24/09 sur " +
          "le premier enrichissement : le nom mal orthographié, le type « particulier » " +
          "posé par défaut et la ville vide sont restés faux, et seuls six échanges ont " +
          "pu être ajoutés — tous datés du jour de la saisie. Trois outils le réparent : " +
          "modifier_fiche, ajouter_contact et modifier_contact.",
      },
      {
        path: "/customers/cfd6c7df-8b0a-471b-951f-d2f4af6ad4a2",
        target: '[data-demo="contacts-card"]',
        title: "Une fiche porte autant d'interlocuteurs qu'il en faut",
        body:
          "La table existait, l'assistant ne pouvait pas y écrire : une copropriété gérée " +
          "par un cabinet a quatre interlocuteurs, et ils finissaient dans les notes. " +
          "Chacun porte désormais son employeur, qui n'est pas la fiche. Et chaque champ " +
          "corrigé laisse sa trace : qui, quand, avant, après, et d'où vient la correction.",
      },
      {
        path: "/customers/cfd6c7df-8b0a-471b-951f-d2f4af6ad4a2",
        target: '[data-demo="customer-glance"]',
        title: "Un échange à sa vraie date, et dans son sens",
        body:
          "« Visite » et « courrier » existent enfin — l'outil les annonçait depuis " +
          "l'origine, la base les refusait, et une mise en demeure partait en « e-mail ». " +
          "Un échange dit maintenant le jour où il a eu lieu, s'il était reçu ou envoyé, " +
          "et la pièce dont il est tiré.",
      },
    ],
  },
  {
    id: "connecteur-oauth",
    title: "Le connecteur d'assistant passe en OAuth",
    date: "2026-09-23",
    steps: [
      {
        path: "/settings/assistant",
        target: '[data-demo="oauth-grants"]',
        title: "Qui est branché, et depuis quand",
        body:
          "L'adresse à secret ne le disait pas : elle ne distinguait pas deux usages " +
          "du même secret, et la révoquer coupait tout le monde à la fois. Mesuré le " +
          "23/09 : quatre jetons vivants, aucun jamais utilisé. Une autorisation porte " +
          "désormais un nom, une date, un droit — et se coupe seule.",
      },
      {
        path: "/settings/assistant",
        target: '[data-demo="oauth-grants"]',
        title: "Plus rien à recopier",
        body:
          "On ajoute le CRM depuis Claude, qui renvoie ici pour l'autoriser. Le secret " +
          "ne voyage plus dans l'adresse mais dans un en-tête, et le client prouve son " +
          "identité par PKCE — sans quoi un code intercepté suffirait à entrer.",
      },
    ],
  },
  {
    id: "terminer-un-chantier",
    title: "Terminer un chantier, et le solder",
    date: "2026-09-23",
    steps: [
      {
        path: "/chantiers",
        target: '[data-demo="worksite-closure"]',
        title: "Un chantier se termine",
        body:
          "Le CRM savait dire qu'un chantier avait commencé, jamais qu'il était fini : " +
          "zéro affaire sur 535 portait une date de fin, pour 115 déclarées réalisées. " +
          "Le bouton apparaît dès que le chantier a démarré, et depuis la fiche client " +
          "comme depuis l'écran Chantiers.",
      },
      {
        path: "/chantiers",
        click: '[data-demo="worksite-closure"]',
        target: '[data-demo="project-closure"]',
        title: "Trois faits, un seul geste",
        body:
          "La fin des travaux, le procès-verbal de réception et le solde encaissé se " +
          "décident au même moment, devant le client. Le serveur les écrit en une " +
          "transaction : jamais un chantier terminé dont le solde n'est pas passé. " +
          "Le jour est demandé, jamais celui du clic — on réceptionne le mardi et on " +
          "saisit le vendredi.",
      },
      {
        path: "/chantiers",
        click: '[data-demo="worksite-closure"]',
        target: '[data-demo="project-closure"]',
        title: "Ce qui est déjà su n'est pas redemandé",
        body:
          "Un PV déjà daté s'affiche au lieu d'une case vide qui l'écraserait, et le " +
          "solde nomme le devis qui le portera. Rouvrir ne retire que la date de fin : " +
          "le PV et le solde ont eu lieu.",
      },
    ],
  },
  {
    id: "societe-de-la-fiche",
    title: "La société de la fiche se choisit, et les gestes se rangent",
    date: "2026-09-22",
    steps: [
      {
        path: FICHE_ETUDE,
        target: '[data-demo="customer-issuer"]',
        title: "Le badge est devenu le bouton",
        body: "La société se déduisait des seuls devis, et un devis rangé du mauvais côté peignait la fiche en STRUCTURE tout en la faisant disparaître de la liste de GROUPE. Le badge s'ouvre désormais : GROUPE, STRUCTURE, les deux, ou « laisser les devis décider ». Un point sur le badge dit qu'un humain a tranché.",
      },
      {
        path: FICHE_ETUDE,
        click: '[data-demo="customer-issuer"]',
        target: '[data-demo="customer-issuer-auto"]',
        title: "Chaque choix dit ce qu'il change",
        body: "Ranger la fiche dans une société la cache à l'autre : le badge et le périmètre lisent la même règle. « Les deux » est la sortie du client qui commande une étude à STRUCTURE puis des travaux à GROUPE. Le dernier choix rend la main aux devis, et la fiche dit alors qui avait tranché, et quand.",
      },
      {
        path: FICHE_ETUDE,
        target: '[data-demo="customer-more"]',
        title: "Cinq boutons, puis trois et un menu",
        body: "« Archiver » était rouge alors qu'archiver ne retire rien, et il voisinait une suppression définitive. Restent visibles Claude, la recherche dans les courriels et « Modifier » ; archiver et supprimer passent sous « … », chacun avec la phrase qui dit ce qu'il emporte, et la suppression seule sous un filet.",
      },
    ],
  },
  {
    id: "messagerie-conversations",
    title: "La messagerie : des conversations, un tri, le clavier",
    date: "2026-09-22",
    steps: [
      {
        path: "/mail",
        target: '[data-demo="mail-views"]',
        title: "« À traiter » s'ouvre d'abord",
        body: "Les conversations dont le dernier mot est celui d'un correspondant, et que personne n'a marquées traitées — sur trente jours, sans les envois en masse. Un nouveau message rouvre de lui-même une conversation traitée. « Tous », « Rapprochés », « Sans fiche » et « Envoyés » restent à un clic, avec leur compte.",
      },
      {
        path: "/mail",
        target: '[data-demo="mail-thread-list"]',
        title: "Une ligne par conversation",
        body: "La réponse et la question vivaient à deux endroits de la liste. Une ligne dit maintenant qui écrit, combien de messages, le dernier extrait, la fiche, la boîte, les pièces jointes, et « Répondu » quand le dernier mot est le nôtre. Le point cyan marque ce qui est à traiter.",
      },
      {
        path: "/mail",
        click: '[data-demo="mail-thread-list"] li:first-child button',
        target: '[data-demo="mail-thread-reader"]',
        title: "Toute la conversation, dans l'ordre",
        body: "Les anciens messages tiennent sur une ligne, le dernier est déplié. Chaque message dit qui l'a écrit, à qui (À et Cc), et quand ; le corps jamais copié arrive au dépliage, la citation recopiée est repliée. Une adresse cliquée montre tout ce qu'on s'est écrit avec elle.",
      },
      {
        path: "/mail",
        target: '[data-demo="mail-triage"]',
        title: "Traiter, puis la suivante",
        body: "« Marquer traité » — ou la touche e — range la conversation et ouvre la suivante. Le toast propose « Annuler ». j et k passent d'une conversation à l'autre, / cherche, ? montre tous les raccourcis.",
      },
      {
        path: "/mail",
        target: '[data-demo="mail-gmail"], [data-demo="mail-task"]',
        title: "Répondre dans Gmail, ou en faire une tâche",
        body: "Le CRM lit la boîte et n'envoie rien : « Répondre dans Gmail » ouvre le fil sur la bonne boîte. « Créer une tâche » prépare la tâche avec l'objet, l'expéditeur, la fiche et le lien vers la conversation.",
      },
      {
        path: `${FICHE_ETUDE}?vue=courriels`,
        click: "button[aria-expanded]",
        target: '[data-demo="customer-mail-open"]',
        title: "Sur la fiche : tout le courrier, et le chemin vers la conversation",
        body: "L'onglet Courriels ne s'arrête plus aux cent premiers : « Charger plus » continue. Un courriel déplié montre son texte entier — demandé au serveur s'il n'avait jamais été copié — et « Ouvrir dans la messagerie » mène à sa conversation. Retirer un courriel de la fiche se défait depuis le toast.",
      },
    ],
  },
  {
    id: "cadre-des-reglages",
    title: "Les réglages dans un seul cadre",
    date: "2026-09-22",
    steps: [
      {
        path: "/settings/general",
        target: '[data-demo="settings-frame"]',
        title: "Les réglages dans un seul cadre",
        body: "Les sections sont à gauche, dans le cadre des réglages, et le fil d'Ariane en haut dit où l'on est. Le tiroir principal ne bascule plus : on quitte les réglages par n'importe quel module, ou par « Retour ». Sur un téléphone, la liste des sections devient un menu déroulant.",
      },
    ],
  },
  {
    id: "taches-a-soi-mes-dossiers-urgents",
    title: "Une tâche créée est à soi, « Mes dossiers » par urgence",
    date: "2026-09-22",
    steps: [
      {
        path: "/tasks",
        click: '[data-demo="task-new"]',
        target: "#task-assignee-field",
        title: "Une nouvelle tâche est à vous",
        body: "« Assignée à » partait sur « Personne » : une tâche saisie pour soi, sans penser à le dire, n'apparaissait ni dans « Mes tâches » ni dans la cloche. Elle vous revient désormais par défaut, et « Personne » reste un choix de la liste. Le filtre du haut attend aussi la fin de la frappe avant d'interroger le serveur.",
      },
      {
        path: "/tasks",
        click: '[data-demo="task-card-open"]',
        target: '[data-demo="task-dialog-delete"]',
        title: "Supprimer depuis la tâche ouverte",
        body: "La suppression n'existait qu'en vue Liste, sur une corbeille sans libellé : depuis le tableau, on ne pouvait pas supprimer du tout. Elle est dans la boîte de la tâche, et se confirme.",
      },
      {
        path: "/mes-dossiers",
        target: '[data-demo="my-projects-filters"]',
        title: "Les dossiers en retard d'abord",
        body: "La liste était triée par dernière modification : un dossier en retard touché il y a un mois se retrouvait tout en bas. Elle montre maintenant ce qui est en retard — une prochaine action échue ou un délai dépassé —, puis les dossiers sans prochaine action, puis le reste par échéance. Les filtres comptent chaque groupe et chaque rôle.",
      },
      {
        path: "/mes-dossiers",
        target: '[data-demo="my-projects-list"]',
        title: "Chaque ligne dit pourquoi elle est là",
        body: "La pastille « En retard », la prochaine action et le délai de l'affaire — deadline interne ou date promise — expliquent la place de la ligne. Un clic ouvre l'affaire elle-même, dépliée dans la fiche.",
      },
    ],
  },
  {
    id: "recherche-arrivee-assistant",
    title: "⌘K plus complète, arrivée selon le rôle, assistant choisi d'abord",
    date: "2026-09-22",
    steps: [
      {
        path: "/customers",
        target: '[data-sidebar="sidebar"] [aria-label="Rechercher"]',
        title: "La recherche trouve par l'interlocuteur et dans le courriel",
        body: "Chercher l'architecte ou le syndic retrouve désormais la fiche qu'il suit, et la palette dit « via » qui elle remonte. Les courriels se cherchent aussi dans leur texte, plus seulement dans le sujet. Chaque résultat ouvre l'élément lui-même : l'affaire dépliée, le devis sur son onglet, la tâche ouverte, le courriel.",
      },
      {
        path: "/settings/assistant",
        target: '[data-demo="mcp-create"]',
        title: "Lecture ou écriture, avant de créer l'adresse",
        body: "Le choix venait sous les boutons, éteint par défaut : l'adresse naissait en lecture seule sans qu'on l'ait vu, et il fallait la révoquer pour recommencer. Il vient désormais en premier, rien n'est coché d'office, et les boutons attendent qu'on ait choisi.",
      },
      {
        path: "/dashboard",
        target: '[data-sidebar="sidebar"]',
        title: "Chacun arrive sur un écran qu'il peut ouvrir",
        body: "Un rôle sur mesure sans accès aux fiches arrivait sur « Accès refusé » à chaque connexion. L'accueil le renvoie maintenant vers le premier écran de la colonne que son rôle ouvre, et un refus propose toujours un chemin de retour. L'écran OneDrive, lui, est gardé comme son entrée de menu.",
      },
    ],
  },
  {
    id: "interlocuteurs-et-notes",
    title: "Interlocuteurs et notes dans l'en-tête, notes d'affaire",
    date: "2026-09-22",
    steps: [
      {
        path: FICHE_ETUDE,
        target: '[data-demo="customer-glance"]',
        title: "Qui appeler, sans changer d'onglet",
        body: "Les interlocuteurs et les notes de la fiche vivaient dans le sixième onglet : au téléphone, le numéro de l'architecte était à deux clics. Ils sont sous le nom du client, le numéro s'appelle et l'adresse s'écrit d'un geste. Un clic sur un nom le corrige, le crayon corrige les notes sur place.",
      },
      {
        path: `${FICHE_ETUDE}?vue=details`,
        target: '[data-demo="contacts-card"]',
        title: "Un interlocuteur se corrige",
        body: "Corriger un numéro obligeait à supprimer puis recréer l'interlocuteur. Le crayon ouvre sa fiche, avec ses notes, et n'envoie que ce qui a changé.",
      },
      {
        path: FICHE_ETUDE,
        target: '[data-demo="project-notes"]',
        title: "Chaque affaire a ses notes",
        body: "Le contexte d'une affaire — accès, digicode, contraintes — s'écrivait dans les notes de la fiche, mêlé aux autres affaires. Il se lit maintenant dans l'affaire dépliée, se corrige sur place, et « Modifier l'affaire » le propose aussi.",
      },
    ],
  },
  {
    id: "client-prospect-acompte-archive",
    title: "Client ou prospect à la main, acompte daté, affaire archivée",
    date: "2026-09-22",
    steps: [
      {
        path: FICHE_ETUDE,
        target: '[data-demo="client-toggle"]',
        title: "Client ou prospect, dans les deux sens",
        body: "Une fiche que ses pièces disaient cliente ne pouvait pas redevenir prospect : la promotion automatique la reclassait au tour suivant. Le bouton pose désormais un choix, qui l'emporte sur les pièces dans la liste, les compteurs et la fiche. L'écran dit qui l'a fait et quand, et « laisser les pièces décider » le retire.",
      },
      {
        path: FICHE_ETUDE,
        click: '[data-demo="tab-apres"]',
        target: '[data-demo="jalon-deposit_paid_at"]',
        title: "L'acompte dit le jour où il est arrivé",
        body: "« Encaisser » et « Modifier » demandent le jour du relevé, et il se corrige ensuite. La ligne affiche ce jour-là — ou « jour inconnu » pour un encaissement repris —, plus jamais la date d'émission du devis. Le formulaire du devis le demande aussi quand on passe l'acompte à « reçu », et la fiche d'un chantier ouvre l'éditeur sur le vrai jour.",
      },
      {
        path: FICHE_ETUDE,
        click: '[data-demo="project-delete"]',
        target: '[data-demo="project-archive"]',
        title: "Archiver une affaire",
        body: "Une affaire morte encombrait Chantiers, Études, Marketing et les dossiers à attribuer, et seule la supprimer l'en sortait — devis et factures compris. Archiver la range sans rien retirer : elle quitte ces listes et reste sur la fiche, repliée sous « Affaires archivées », d'où « Désarchiver » la rend telle qu'elle était.",
      },
    ],
  },
  {
    id: "documents-et-pieces-jointes",
    title: "Les sous-dossiers se déplient, les pièces jointes s'ouvrent",
    date: "2026-09-22",
    steps: [
      {
        path: `${FICHE_ETUDE}?vue=documents`,
        target: '[data-demo="documents-subfolder"]',
        title: "Un sous-dossier se déplie sur place",
        body: "« Photos · 312 éléments » n'était qu'un lien vers OneDrive : un plan rangé dans « Plans » restait invisible depuis la fiche. Un clic sur le dossier le déplie, un niveau à la fois, et son contenu s'affiche décalé sous lui pour qu'on sache où l'on est. Chaque fichier s'ouvre dans la même fenêtre d'aperçu que ceux du dessus, et « Ouvrir » mène toujours au dossier dans OneDrive.",
      },
      {
        path: "/mail",
        click: '[data-demo="mail-row-with-attachments"]',
        target: '[data-demo="mail-attachments"]',
        title: "Une pièce jointe s'ouvre au lieu de répondre « 401 »",
        body: "Le clic ouvrait une page d'erreur : le lien partait sans la session. Un PDF ou une image s'affiche maintenant dans la fenêtre d'aperçu, le reste s'enregistre sur l'ordinateur. Une pièce de plus de 8 Mo est grisée : seul son nom a été conservé, elle reste dans la messagerie.",
      },
    ],
  },
  {
    id: "fermer-ses-sessions",
    title: "Fermer ses sessions, et le savoir",
    date: "2026-09-22",
    steps: [
      {
        path: "/settings",
        target: '[data-demo="profil-tout-fermer"]',
        title: "« Tout fermer » demande confirmation",
        body: "Le bouton déconnectait tous les appareils d'un clic, sans rien dire. Il demande maintenant de confirmer, puis ramène à la connexion avec un message : « Toutes vos sessions ont été fermées ». Changer de mot de passe fait de même, avec sa propre phrase. Dans les deux cas le compte est retiré de la mémoire de la page, là où il y restait jusqu'ici.",
      },
    ],
  },
  {
    id: "historique-echanges-complet",
    title: "L'historique des échanges en entier",
    date: "2026-09-22",
    steps: [
      {
        path: FICHE_ETUDE,
        click: '[role="tab"][id$="-trigger-echanges"]',
        target: '[data-demo="historique-echanges"]',
        title: "Le vrai nombre d'échanges, et la suite à la demande",
        body: "La fiche ne montrait que les cinquante derniers échanges, et l'onglet en affichait le nombre comme s'il n'y en avait pas d'autres. Le compteur dit désormais le total réel, et « Charger plus » lit les plus anciens, cinquante à la fois.",
      },
    ],
  },
  {
    id: "plus-vite-plus-clair",
    title: "Plus vite, plus clair, chacun chez soi",
    date: "2026-09-22",
    steps: [
      {
        path: "/customers",
        target: '[data-demo="fiche-tri-colonne"]',
        title: "La liste trouve un devis et se trie par colonne",
        body: "Taper « DE2026-0092 », « STR-2026-0148 » ou un numéro de téléphone, espaces ou +33 compris, retrouve la fiche. Un clic sur « Fiche » ou « Signé TTC » trie. Au téléphone, la liste passe en cartes et le numéro s'appelle d'un toucher. Revenir sur une fiche ou une liste déjà vue l'affiche tout de suite, sans squelette.",
      },
      {
        path: FICHE_ETUDE,
        target: '[data-demo="project-delete"]',
        title: "Une barre d'affaire plus courte",
        body: "Sept boutons côte à côte devenaient des clics ratés. Restent Devis et Modifier ; le reste passe dans « … », où « Supprimer l'affaire » est séparé et en rouge.",
      },
      {
        path: FICHE_ETUDE,
        click: '[data-demo="cran-solde"]',
        target: '[data-demo="reglement-editeur"]',
        title: "Une seule saisie des règlements",
        body: "Frise, « à faire maintenant », après-signature et fiche chantier ouvrent la même saisie : montant, jour d'encaissement — demandé, jamais le jour du clic d'office — et virements. Dans le devis, le taux de TVA calcule le TTC à partir du HT, ou l'inverse, et les montants s'écrivent à la française.",
      },
      {
        path: "/tasks",
        target: '[data-demo="task-card-done"]',
        title: "Terminer une tâche d'un clic",
        body: "Une case sur chaque carte termine ou rouvre la tâche, sans la glisser. Au-delà de deux cents tâches, la liste le dit et charge la suite, et les compteurs suivent les mêmes filtres que les colonnes.",
      },
      {
        path: "/calendar",
        target: '[data-demo="agenda-week-touch"]',
        title: "Un agenda qui vit, et qui se touche",
        body: "L'heure et « aujourd'hui » avancent seuls, et revenir sur l'onglet relit les rendez-vous posés par les autres. Au téléphone, l'agenda s'ouvre en liste, la semaine défile au doigt et un appui long crée ou déplace. Un événement peut se terminer le lendemain.",
      },
      {
        path: "/settings/general",
        target: '[data-demo="settings-back"]',
        title: "Des réglages qui parlent métier",
        body: "« Retour » ramène là où l'on était. Jetons, slugs de permission et noms de variables du serveur ne s'affichent plus qu'à l'administrateur système, et le profil ne propose plus ce qui n'existe pas. Un compte d'une société ne retrouve plus, dans ⌘K, la messagerie ou Marketing, ce qui appartient à l'autre.",
      },
    ],
  },
  {
    id: "flux-du-quotidien",
    title: "Créer, retrouver, planifier sans perdre le fil",
    date: "2026-09-22",
    steps: [
      {
        path: "/customers/nouveau",
        target: '[data-demo="wizard-source"]',
        title: "Une fiche en un écran",
        body: "L'assistant en trois étapes devient un seul écran : nom, téléphone, e-mail, objet, et d'où vient le client — sans source cochée d'office. Pendant la saisie, les fiches qui ressemblent (nom, numéro ou adresse, archives comprises) s'affichent pour éviter le doublon. Ouvert depuis un courriel, il part de l'adresse et du nom de l'expéditeur.",
      },
      {
        path: "/calendar",
        target: '[data-demo="agenda-mine"]',
        title: "Mes rendez-vous, et pour qui",
        body: "Un rendez-vous dit maintenant pour qui il est posé. « Mes rendez-vous » ne montre que les siens, et l'agenda retient la vue, les filtres et ce choix d'une visite à l'autre. « Planifier le RDV » sur une affaire ouvre ce formulaire, pour le responsable de l'affaire, au lieu de créer une ligne d'historique.",
      },
      {
        path: "/settings/doublons",
        target: '[data-demo="duplicate-dismiss"]',
        title: "« Pas un doublon », et une fusion qui se confirme",
        body: "Deux homonymes s'écartent pour de bon : la paire ne revient plus. Fusionner demande confirmation en disant ce qui part où, et les autres paires de la fiche absorbée ne se tranchent plus.",
      },
    ],
  },
  {
    id: "rien-ne-se-perd",
    title: "Rien ne se perd sans prévenir",
    date: "2026-09-22",
    steps: [
      {
        path: "/settings/agenda",
        target: '[data-demo="calendar-delete"]',
        title: "La croix est devenue une corbeille, et elle demande",
        body: "La croix se lisait « fermer » et effaçait l'agenda avec tous ses événements. C'est maintenant une corbeille, et la confirmation nomme l'agenda et le nombre d'événements qui partent. Même règle partout où un clic effaçait : échange, interlocuteur, événement, invitation, connecteur d'assistant, clé d'accès. Les boîtes « OK / Annuler » du navigateur ont disparu au profit de celle du CRM.",
      },
      {
        path: "/customers/77c807e5-f0c4-4bad-b0f7-d404d2a00782",
        target: '[data-demo="next-action"]',
        title: "Le solde demande combien, et les erreurs se voient",
        body: "« Paiement reçu » cochait le solde sans montant : il ouvre maintenant la même saisie que l'acompte, montant et jour d'encaissement. Décocher « Acompte facturé » fonctionne. Et une écriture refusée ne passe plus en silence : un message apparaît en bas à droite, avec « Réessayer ». Fermer un devis, une affaire, une tâche ou une relance en cours de saisie demande confirmation.",
      },
    ],
  },
  {
    id: "correctifs-audit-critiques",
    title: "Les correctifs critiques de l'audit",
    date: "2026-09-22",
    steps: [
      {
        path: "/dashboard",
        target: '[data-demo="dashboard-blocked"]',
        title: "« Signé, mais bloqué » lit enfin la base",
        body: "Ces quatre listes étaient tirées d'une empreinte de la référence du devis : le tableau de bord pouvait réclamer un acompte déjà payé. Elles viennent maintenant des chantiers réels, par les mêmes règles que l'écran Chantiers, et chaque ligne ouvre le chantier concerné. Le reste du tableau de bord lit encore l'export du 1er septembre : c'est l'issue suivante.",
      },
      {
        path: "/customers",
        target: '[aria-label="Filtrer par statut"]',
        title: "La recherche trouve aussi les prospects",
        body: "La liste s'ouvre sur « Clients », et la recherche s'y cumulait : au téléphone, le nom d'un prospect ne donnait rien, et l'on créait un doublon. Dès qu'on tape, la recherche porte sur toutes les fiches — l'onglet « Toutes » s'allume pour le dire. Un statut choisi exprès reste respecté.",
      },
    ],
  },
  {
    id: "retirer-un-membre",
    title: "Retirer un membre",
    date: "2026-09-21",
    steps: [
      {
        path: "/settings/membres",
        target: '[data-demo="member-remove"]',
        title: "La corbeille qui manquait",
        body: "Le serveur savait retirer un compte, aucun écran ne le proposait. La corbeille n'apparaît que sur un compte de rang inférieur, jamais sur le sien, et la confirmation dit ce qui part — sessions, connecteurs, liens de clé — et ce qui reste : fiches, tâches et échanges ne partent pas avec lui.",
      },
    ],
  },
  {
    id: "supprimer-un-role-porte",
    title: "Supprimer un rôle, même attribué",
    date: "2026-09-21",
    steps: [
      {
        path: "/settings/roles",
        click: 'button[title^="Supprimer "]',
        target: '[data-demo="role-delete"]',
        title: "On nomme qui le remplace",
        body: "Un rôle porté faisait griser la corbeille. Il se supprime maintenant en choisissant le rôle que prennent ses porteurs, parmi ceux qu'on a le droit d'attribuer : ils y passent et l'ancien disparaît dans une seule transaction, sans jamais laisser personne sans rôle. Leurs sessions sont fermées, pour que le nouveau rôle s'applique tout de suite.",
      },
    ],
  },
  {
    id: "parrain-d-un-client",
    title: "De qui vient un client recommandé",
    date: "2026-09-21",
    steps: [
      {
        path: "/customers/0b66bb72-7660-43a3-aa42-5be6e5ffe2b6",
        click: '[id$="-trigger-details"]',
        target: '[data-demo="fiche-parrain"]',
        title: "Recommandé par, choisi parmi tout le CRM",
        body: "La source disait « Recommandation » sans dire par qui. La recherche porte sur toutes les fiches, archivées comprises, et sur les interlocuteurs de chacune — c'est souvent l'architecte ou le voisin d'un client qui recommande. La personne introuvable se crée d'ici, comme une fiche. Le même champ apparaît à la création d'un client dès que la source est « Recommandation ». Le parrain s'ouvre d'un clic, et s'écrit par sa propre route : corriger le téléphone de la fiche ne l'efface pas.",
      },
    ],
  },
  {
    id: "filtre-societe-des-fiches",
    title: "Filtrer les fiches par société",
    date: "2026-09-21",
    steps: [
      {
        path: "/customers",
        target: "#filtre-societe",
        title: "GROUPE ou STRUCTURE, sans changer d'adresse",
        body: "Le sélecteur de périmètre avait été retiré au profit de l'adresse — groupe.…, structure.… —, si bien que le dirigeant et l'application de bureau ne pouvaient plus trier les deux sociétés. Le filtre n'apparaît que là où l'adresse n'impose aucune société : ailleurs, le serveur impose la sienne et l'offrir serait promettre un choix qu'il ignore.",
      },
    ],
  },
  {
    id: "date-d-encaissement",
    title: "Le jour de l'acompte et du solde se corrige",
    date: "2026-09-21",
    steps: [
      {
        path: FICHE_ETUDE,
        click: '[data-demo="cran-acompte"]',
        target: '[data-demo="reglement-date"]',
        title: "Encaissé le",
        body: "Toutes les dates de la frise se corrigeaient, sauf ces deux-là : le serveur posait le jour du clic, et le solde n'avait même aucune date — la frise affichait celle de l'émission du devis. Le jour se saisit maintenant avec le montant, et ne part au serveur que s'il a changé : corriger un montant ne réécrit jamais la date.",
      },
    ],
  },
  {
    id: "devis-joints-a-la-frise",
    title: "Les devis joints à la frise, dans l'onglet Devis",
    date: "2026-09-21",
    steps: [
      {
        path: "/customers/d8ba1e88-9e2b-4cf0-bc13-54946efe1c93",
        click: '[data-demo="tab-devis"]',
        target: '[data-demo="joined-quote-docs"]',
        title: "Joint au cran, rappelé sous les devis",
        body: "Un fichier déposé sur le cran Devis, Négociation ou Signé devenait une preuve du cran, visible seulement en rouvrant le cran. Il s'affiche maintenant sous la liste des devis, avec le cran d'où il vient, et s'ouvre du même clic. Ce n'est pas un devis du CRM — ni référence, ni montant, ni statut — et l'écran ne prétend pas le contraire.",
      },
    ],
  },
  {
    id: "lien-vers-le-chantier",
    title: "Une affaire signée mène à son chantier",
    date: "2026-09-21",
    steps: [
      {
        path: "/customers/77c807e5-f0c4-4bad-b0f7-d404d2a00782",
        target: '[data-demo="project-worksite-link"]',
        title: "Sous l'adresse, le chemin vers le chantier",
        body: "Il fallait quitter la fiche, ouvrir Chantiers et y rechercher l'affaire qu'on venait de lire. Le lien ouvre directement la fiche latérale de ce chantier — ou de cette étude, pour STRUCTURE —, sur le modèle du lien vers la fiche d'un rendez-vous dans l'agenda. Il n'apparaît que sur une affaire signée ou réalisée : les écrans Chantiers et Études ne listent que celles-là.",
      },
    ],
  },
  {
    id: "frise-reordonnable",
    title: "La frise se réordonne au glisser-déposer",
    date: "2026-09-21",
    steps: [
      {
        path: FICHE_ETUDE,
        target: '[data-demo="frise-reordonner"]',
        title: "L'ordre des crans appartient à l'entreprise",
        body: "La frise suivait un ordre écrit dans le code. Elle le garde par défaut, et ce bouton ouvre la fenêtre qui le change — réservée aux comptes qui règlent le CRM, parce que l'ordre choisi vaut pour toutes les affaires du parcours, sur toutes les fiches et pour tout le monde.",
      },
      {
        path: FICHE_ETUDE,
        click: '[data-demo="frise-reordonner"]',
        target: '[data-demo="frise-ordre"]',
        title: "Un ordre par parcours, glissé comme une tâche",
        body: "Même geste que le tableau des tâches. Il y a quatre parcours et non deux sociétés : GROUPE fait des travaux, STRUCTURE a trois missions qui n'ont pas les mêmes crans. Déplacer un cran ne coche ni ne décoche rien — seul l'ordre change, et le cran en cours devient le premier non franchi dans le nouvel ordre. Les crans du sondage, en pointillé, se rangent même quand l'affaire n'en vend pas : c'est là qu'ils tomberont le jour où elle en vendra un. « Ordre par défaut » retire l'ordre choisi au lieu d'en enregistrer une copie, qui divergerait du code au premier cran ajouté.",
      },
    ],
  },
  {
    id: "bandeau-d-etat",
    title: "Le pied de page dit la version et l'état du CRM",
    date: "2026-09-21",
    steps: [
      {
        path: "/dashboard",
        target: '[data-demo="status-bar"]',
        title: "Un point vert, une version, et rien de plus quand tout va bien",
        body: "Le bandeau relit l'état du serveur chaque minute : la base de données, et les trois copies automatiques — messagerie, agenda Google, OneDrive. Tout va bien, c'est un point vert qu'on ne lit pas. Une copie qui n'a rien réussi depuis quatre tours passe en orange, une copie qui échoue en rouge, un serveur muet aussi — c'est le moment de ne pas saisir un devis qui ne serait pas enregistré. Un clic ouvre le détail, et chaque ligne mène aux réglages de l'intégration, où vit son journal. À droite, la version de la page chargée ; quand un déploiement a eu lieu depuis, un bouton « Recharger » apparaît à côté.",
      },
    ],
  },
  {
    id: "virements-d-un-acompte",
    title: "Les virements d'un acompte, un par ligne",
    date: "2026-09-21",
    steps: [
      {
        path: FICHE_ETUDE,
        click: '[data-demo="tab-devis"]',
        target: '[data-demo="quote-payment-add"]',
        title: "Un acompte se paie rarement d'un coup",
        body: "« 2 400 € encaissés » ne disait ni combien de virements ni quand : le client fractionne, une avance tombe à la signature et le reste à la commande des matériaux, et le devis ne portait qu'un nombre. Chaque virement a désormais sa ligne — sa date, son montant, la référence qui permet de le retrouver sur le relevé. Le bloc reste replié tant qu'aucun virement n'est saisi : un formulaire vide sous chacun des cinq cent trente-six devis ferait de la liste un écran de saisie. Et la somme fait autorité dès qu'une ligne existe : le serveur la recopie dans le montant de l'acompte, pour que le CRM n'affiche jamais deux nombres qui pourraient se contredire. Retirer le dernier virement rend le montant à vide — la somme d'aucune ligne n'est pas zéro euro, c'est « on ne sait plus ». Le statut, lui, ne bouge pas : un premier virement sur trois ne rend pas l'acompte encaissé, et c'est à l'entreprise de le dire.",
      },
    ],
  },
  {
    id: "societe-de-la-fiche",
    title: "La société se lit sur la ligne, sans cliquer",
    date: "2026-09-21",
    steps: [
      {
        path: "/customers",
        target: '[data-demo="fiche-societe"]',
        title: "Bleu pour GROUPE, vert pour STRUCTURE",
        body: "Il fallait déplier une fiche, puis lire la société de chacune de ses affaires, pour une question qu'on se pose en parcourant deux cents lignes. L'API ne servait d'ailleurs aucune société au niveau de la fiche : elle est calculée par la même règle que le filtre de périmètre — ses devis et ses affaires attribuées — pour qu'une ligne peinte en vert ne puisse pas manquer à la liste STRUCTURE. Mesuré le 21/09 sur 418 fiches : 193 GROUPE, 75 STRUCTURE, 34 mixtes, 116 que rien ne range. Les deux derniers cas restent gris — peindre une fiche mixte de la couleur de l'une des deux serait faux une fois sur deux. Au passage, la pastille de société d'un devis change de teinte pour parler la même langue : elle disait bleu pour STRUCTURE, ce qui aurait contredit la ligne.",
      },
    ],
  },
  {
    id: "montant-du-solde",
    title: "Le solde dit enfin combien",
    date: "2026-09-21",
    steps: [
      {
        path: FICHE_ETUDE,
        click: '[data-demo="cran-solde"]',
        target: '[data-demo="reglement-editeur"]',
        title: "Encaisser le solde, c'est dire combien",
        body: "« Solde encaissé » était une case : on affirmait avoir été payé sans jamais écrire le montant, alors que c'est ce chiffre qu'on rapproche du relevé de banque. L'acompte avait reçu son montant en juin ; le solde en avait autant besoin, et pour la même raison — ce n'est pas le reste à payer calculé du devis, un avenant ou une remise de fin de chantier le déplacent. C'est le même éditeur que l'acompte, pas un second : seuls les mots changent. Mesuré en production : quatre devis sont marqués soldés, aucun ne portait de montant. Le formulaire du devis porte le même champ, qui n'apparaît que si un solde est attendu ou reçu. Au passage, encaisser un solde ne renvoie plus le devis entier : il a sa route à lui, comme l'acompte — le remplacement complet effaçait la provenance du montant lu dans le PDF, si bien que solder un devis remettait sa lecture en file d'attente.",
      },
    ],
  },
  {
    id: "dates-de-chantier-dans-la-fiche",
    title: "Les deux bornes du chantier, dans la fiche",
    date: "2026-09-21",
    steps: [
      {
        /*
          Le Faucheur porte deux affaires datées — c'est la fiche où la mention
          apparaît deux fois, donc celle où le changement se voit.
        */
        path: "/customers/77c807e5-f0c4-4bad-b0f7-d404d2a00782",
        target: '[data-demo="project-periode"]',
        title: "La ligne de l'affaire dit quand le chantier a lieu",
        body: "Il fallait déplier l'affaire, puis ouvrir son formulaire, pour savoir si un chantier était daté. La ligne repliée le dit maintenant d'elle-même : « du 3 au 17 juin » quand les deux bornes sont connues, « depuis le 3 juin » quand il a commencé sans finir, « terminé le 17 juin » quand seule la fin est saisie. Rien ne s'affiche quand aucune date n'existe — une mention vide pousserait le nom du responsable hors de la ligne. Mesuré en production : 140 affaires sur 522 portent une date de démarrage, et aucune n'en portait de fin, faute d'un endroit où la saisir.",
      },
      {
        /*
          La fiche d'exemple des démos : une seule affaire, dépliée d'office,
          donc « Modifier » est atteignable en un clic. Le Faucheur en porte
          plusieurs et resterait replié.
        */
        path: FICHE_ETUDE,
        click: '[data-demo="project-edit"]',
        target: '[data-demo="project-dates"]',
        title: "Et la fin du chantier se saisit enfin",
        body: "La colonne existait depuis mars et l'agenda l'écrivait déjà : poser un événement « Chantier » avec sa date de fin la renseignait. Mais l'API ne la servait dans aucune réponse et aucun formulaire ne l'envoyait — une affaire terminée ne savait le dire qu'à l'événement qui l'avait datée, sans que la fiche puisse le montrer ni le corriger. C'est ici, et ici seulement, qu'une date se retire : un événement d'agenda n'écrit que ce qu'il sait et n'efface jamais, la fiche voit l'état complet et fait autorité.",
      },
    ],
  },
  {
    id: "cycle-dates-sondage-deux-societes",
    title: "Le cycle d'une affaire : les dates rendues, le sondage à sa place, deux sociétés",
    date: "2026-09-18",
    steps: [
      {
        /*
          SCI Baleine : l'affaire porte douze crans franchis et quatre dates de
          rendez-vous que la règle de monotonie masquait. C'est la fiche citée
          par le dirigeant.
        */
        path: "/customers/9b327b3b-6696-4f21-bb56-22a3858dac98",
        target: '[data-demo="project-cycle"]',
        title: "Les dates des rendez-vous passés sont revenues",
        body: "La frise masquait toute date qui reculait par rapport à la précédente. L'intention était bonne — « RDV 18 juin » suivi de « Signé 12 juin » fait douter de tout le reste — mais la règle se retournait contre elle : les dates d'une affaire ne sont pas saisies dans l'ordre où les crans se franchissent, et il suffisait qu'un rendez-vous soit enregistré après coup pour qu'il disparaisse de l'écran. Un rendez-vous passé n'en a pas moins eu lieu. La règle est retirée : chaque cran affiche la date qu'il porte, et l'ordre de la frise reste celui des étapes, pas celui du calendrier. Mesuré sur cette affaire : quatre dates réapparaissent.",
      },
      {
        path: "/customers/9b327b3b-6696-4f21-bb56-22a3858dac98",
        target: '[data-demo="next-action"]',
        title: "On ne réclame plus une facture d'acompte déjà encaissée",
        body: "« Facture d'acompte à émettre », lisait-on ici, alors que l'acompte était encaissé et que le dossier était parti au contrôle. La cause : « à faire maintenant » cherchait le premier cran non franchi en partant du début, sans regarder ce qui l'était plus loin. Or un cran postérieur franchi rend les précédents caducs — on ne calcule pas une note de structure avant d'avoir été payé. La prochaine action se lit désormais après le dernier cran franchi, et cette affaire affiche « Calcul à réaliser — l'acompte est encaissé : l'ingénieur peut commencer. »",
      },
      {
        /*
          ROUGET : devis `etude + sondages`, donc mission « étude » — le cas où
          le cran sondage doit s'intercaler sans remplacer la mission déduite.
        */
        path: "/customers/aeb64050-c806-4628-bc3a-7f1d5974956e",
        target: '[data-demo="cran-sondage"]',
        title: "Le sondage se place entre l'acompte et la facture",
        body: "Le sondage n'existait comme étape que pour les affaires dont c'est la mission entière. Une étude qui comporte aussi un sondage — ce que porte cette affaire, dont les devis sont une étude et des sondages — n'avait nulle part où le dire : le terrain se fait pourtant après l'acompte et avant qu'on facture le solde. Les deux crans s'insèrent donc dans la frise de l'étude, juste après l'acompte, sans déplacer la mission déduite des devis. Mesuré ici : le sondage tombe en septième position, entre l'acompte en sixième et le solde en douzième.",
      },
      {
        /*
          Reuvenn Keil : une affaire portant des devis des deux sociétés. Elles
          sont trente et une fiches dans ce cas, sept affaires — le cas est réel
          et rare, donc il se démontre sur une fiche nommée.
        */
        path: "/customers/f8000da5-ce8a-497b-881c-3fa59a9226c9",
        target: '[data-demo="project-cycle-second"]',
        title: "Une affaire des deux sociétés porte deux frises",
        body: "L'étude et les travaux ne se déroulent pas pareil : là où les travaux réservent une date et commandent des matériaux, l'étude remet un rapport de visite puis des plans d'exécution. Une affaire qui porte des devis des deux sociétés n'avait qu'une frise, celle de la société dominante, et la moitié de son parcours n'apparaissait nulle part. Elle en a désormais deux, chacune coiffée du nom de sa société. La seconde se lit seulement : cocher un de ses crans écrirait sur un devis qui appartient à l'autre société, et l'écran le dit au lieu d'offrir un bouton sans effet.",
      },
    ],
  },
  {
    id: "chercher-dans-les-courriels",
    title: "« Chercher dans les courriels » répond enfin",
    date: "2026-09-17",
    steps: [
      {
        /*
          La fiche de la capture d'écran du dirigeant : elle porte des
          courriels, ce qui est la condition d'apparition du bouton — une fiche
          sans courrier ne le montre pas, et la démo s'ouvrirait sur du vide.
        */
        path: "/customers/d4804e98-5283-42fe-ab4e-3f14d17b1720",
        target: '[data-demo="bouton-chercher-courriels"]',
        title: "Le bouton qui ne rendait qu'une erreur",
        body: "Cette fonctionnalité n'avait jamais abouti une seule fois en production : un appel, cinq minutes d'attente, puis un encadré rouge portant une erreur de transport brute. La cause n'était ni le réseau, ni la clé, ni le compte — tous mesurés sains — mais le modèle demandé. Le CRM réclamait « moonshotai/kimi-k3 », que le catalogue de NVIDIA annonce toujours et qui ne renvoie plus rien du tout : pas un refus, pas un quota dépassé, aucun octet. Passés un par un, quatre-vingt-deux identifiants du catalogue donnent trois modèles qui répondent, quatre qui rendent 404 tout en étant listés, et cinq muets — dont celui-là, et dont le 90B vision demandé le matin même.",
      },
      {
        path: "/customers/d4804e98-5283-42fe-ab4e-3f14d17b1720",
        click: '[data-demo="bouton-chercher-courriels"]',
        target: '[data-demo="chercher-messagerie"]',
        title: "Le modèle qui répond, et qui le dit (comptez une minute)",
        body: "Le modèle retenu a été mesuré avant d'être choisi : il répond en 171 millisecondes, et il sait lire une image, si bien que l'analyse des devis en PDF n'aura pas à en changer. La fenêtre annonce désormais quel modèle a lu et en combien de temps — c'est la même phrase qu'avant, mais elle a enfin quelque chose à dire. Deux garde-fous l'accompagnent. Le silence est borné à une minute au lieu de cinq : un modèle qui n'a pas commencé à répondre en une minute ne répondra pas, alors qu'une génération déjà commencée peut légitimement durer, et les deux ne se règlent pas ensemble. Et une erreur de transport ne s'affiche plus jamais : le détail va au journal, l'écran reçoit une phrase qui dit quoi faire. Les refus déjà rédigés en français, eux, continuent de s'afficher tels quels — « le modèle est saturé », « le dossier est trop long » sont écrits pour être lus.",
      },
    ],
  },
  {
    id: "enroler-une-cle-par-lien",
    title: "La société se choisit, et la clé d'accès s'enrôle par lien",
    date: "2026-09-17",
    steps: [
      {
        path: "/settings/membres",
        click: 'button:has-text("Inviter")',
        target: "#invite-company",
        title: "La société est obligatoire, et « tout le groupe » se coche exprès",
        body: "Elle était facultative, donc son absence valait accès aux deux sociétés : on ouvrait tout en ne remplissant pas le champ — exactement ce que le découpage des accès venait d'empêcher. « Tout le groupe » est désormais une valeur de la liste, plus le silence du formulaire, et rien ne part tant que personne n'a choisi. Le serveur applique la même règle de son côté, pour les appels qui ne passent pas par cet écran : la création d'un compte par l'API ignorait purement et simplement la société, et un compte né là voyait les deux. Un compte déjà rattaché à une société, lui, n'a rien à choisir : on ne fait entrer quelqu'un que dans la sienne.",
      },
      {
        path: "/settings/membres",
        target: '[data-demo="cles-par-compte"]',
        title: "Qui n'a pas encore de clé",
        body: "C'est la seule question qui commande la bascule voulue : on ne coupe les mots de passe que lorsque plus personne n'est à zéro. Mesuré le 17 septembre, deux clés existaient en production, toutes deux celles du dirigeant — couper ce jour-là aurait mis les deux autres comptes dehors. Le compte est affiché ici plutôt qu'ajouté à la fiche d'un membre, parce qu'un champ « nombre de clés » y aurait valu zéro partout sauf dans cette liste : une demi-vérité qu'un écran finit toujours par afficher.",
      },
      {
        path: "/settings/membres",
        click: 'button[title^="Enrôler"]',
        target: '[data-demo="lien-de-cle"]',
        title: "Une clé ne s'envoie pas : ce qui s'envoie, c'est un lien",
        body: "La moitié privée d'une clé d'accès naît dans l'appareil de son porteur et n'en sort jamais : personne, pas même le dirigeant, ne peut en fabriquer une pour quelqu'un d'autre. Ce qui se transmet est ce lien à usage unique, valable sept jours, dont la base ne garde que l'empreinte — il n'est affiché qu'une fois, comme une invitation. Le QR code n'est pas une coquetterie : la clé doit naître sur l'appareil qui servira à entrer, et c'est le téléphone. Scanner l'écran y amène la personne en un geste, là où un lien de soixante caractères collé dans un SMS se retape mal. Un lien déjà en circulation n'est jamais remplacé en silence : celui qui a été transmis hier doit continuer de fonctionner jusqu'à ce qu'on décide le contraire.",
      },
    ],
  },
  {
    id: "deux-crm-une-societe-par-compte",
    title: "Deux CRM, un par société — et le compte y est lié",
    date: "2026-09-17",
    steps: [
      {
        path: "/settings/membres",
        target: '[data-demo="member-companies"]',
        title: "Un compte appartient désormais à une société",
        body: "Le périmètre de travail était une lentille : chacun cochait STRUCTURE ou GROUPE dans sa barre latérale, et le serveur filtrait sur ce que le navigateur lui demandait — retirer le paramètre de l'adresse suffisait à voir l'autre société. C'est devenu une appartenance : la société est écrite sur le compte, elle voyage dans le jeton d'accès, et c'est le serveur qui l'impose à chaque lecture. Une pastille à côté du rôle le dit, parce que ce sont les deux dimensions d'un compte — ce qu'il peut faire, et pour laquelle des sociétés. Aucune pastille pour le dirigeant : lui voit tout le groupe, et l'écrire sur chaque ligne ne distinguerait personne. La fiche d'un client, elle, reste entière des deux côtés : seules ses affaires et ses devis se filtrent, sans quoi on perdrait l'historique travaux de son propre client au moment précis où il rappelle.",
      },
      {
        path: "/settings/membres",
        click: 'button[title^="Modifier"]',
        target: '#member-company',
        title: "La société se change seule, et ferme les sessions",
        body: "Elle a sa propre route, comme le rôle, et pour une raison très concrète : enregistrer le formulaire remplace la ligne entière du compte, si bien qu'une société qui y voyagerait serait effacée le jour où l'on corrige une faute de frappe dans un prénom. Changer la société déconnecte la personne — elle voyage dans le jeton, et sans cela elle verrait encore un quart d'heure durant la société qu'on vient de lui retirer. Deux garde-fous s'appliquent : on n'agit que sur un compte de rang inférieur au sien, et on ne fait entrer quelqu'un que dans sa propre société — sinon la gestion des comptes serait le contournement du découpage. Le lien d'invitation porte la même société : le compte naît déjà rangé, plutôt que d'être classé après coup.",
      },
      {
        path: "/dashboard",
        target: '[data-demo="retour-portail"]',
        title: "Et par où l'on ressort : le portail",
        body: "Chaque société a désormais son adresse — groupe.… et structure.… — et le domaine principal est devenu un portail : on s'y authentifie une fois, puis on choisit. Ce bouton y ramène de n'importe quel écran du CRM. On y trouve les deux CRM, des raccourcis vers les listes qu'on ouvre le plus, les applications du quotidien — Gmail, Slack, le coffre à mots de passe, OneDrive — et, pour l'administration seulement, un groupe Dev. Rien à retaper en chemin : les trois adresses partagent une seule session, parce que le cookie porte le domaine principal, et une seule clé d'accès les ouvre toutes les trois puisque son domaine de référence est celui du portail.",
      },
    ],
  },
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
