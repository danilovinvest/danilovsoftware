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
const FICHE_ETUDE = "/customers/fiche?id=7419530d-fbb2-4937-aaf5-2403b315f71b";

export const DEMOS: Demo[] = [
  {
    id: "lien-vers-le-chantier",
    title: "Une affaire signée mène à son chantier",
    date: "2026-09-21",
    steps: [
      {
        path: "/customers/fiche?id=77c807e5-f0c4-4bad-b0f7-d404d2a00782",
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
        path: "/customers/fiche?id=77c807e5-f0c4-4bad-b0f7-d404d2a00782",
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
    id: "application-de-bureau",
    title: "Le CRM devient une application de bureau",
    date: "2026-09-18",
    steps: [
      {
        path: "/dashboard",
        target: '[data-demo="changer-de-societe"]',
        title: "La société se choisit ici, et non plus par l'adresse",
        body: "Sur le web, on choisissait sa société en choisissant son adresse — groupe.… ou structure.… — depuis le portail. L'application n'a qu'une fenêtre et pas d'adresse : le choix se fait dans ce menu, à la place du bouton de retour au portail, et l'ordinateur le retient. Il ne sert qu'à qui voit tout le groupe : un compte lié à sa société la garde quoi qu'il arrive, c'est le serveur qui l'impose. Le portail reste à un clic, en bas du menu : il s'ouvre dans le navigateur.",
      },
      {
        path: "/settings",
        target: '[data-demo="passkey-add"]',
        title: "Une clé d'accès se crée dans le navigateur",
        body: "Une clé d'accès est liée au domaine du CRM, et l'application n'en a pas : aucune empreinte ne peut s'y enregistrer. « Ajouter une clé » montre donc un QR code à scanner avec son téléphone — l'appareil qu'on a toujours sur soi — ou ouvre la création dans le navigateur de cet ordinateur. La connexion suit le même chemin : « Se connecter avec une clé d'accès » ouvre le portail dans le navigateur, on y pose son empreinte, on autorise l'application d'un clic, et elle reprend la main toute seule. Le mot de passe, lui, se tape dans l'application comme avant.",
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
        path: "/customers/fiche?id=9b327b3b-6696-4f21-bb56-22a3858dac98",
        target: '[data-demo="project-cycle"]',
        title: "Les dates des rendez-vous passés sont revenues",
        body: "La frise masquait toute date qui reculait par rapport à la précédente. L'intention était bonne — « RDV 18 juin » suivi de « Signé 12 juin » fait douter de tout le reste — mais la règle se retournait contre elle : les dates d'une affaire ne sont pas saisies dans l'ordre où les crans se franchissent, et il suffisait qu'un rendez-vous soit enregistré après coup pour qu'il disparaisse de l'écran. Un rendez-vous passé n'en a pas moins eu lieu. La règle est retirée : chaque cran affiche la date qu'il porte, et l'ordre de la frise reste celui des étapes, pas celui du calendrier. Mesuré sur cette affaire : quatre dates réapparaissent.",
      },
      {
        path: "/customers/fiche?id=9b327b3b-6696-4f21-bb56-22a3858dac98",
        target: '[data-demo="next-action"]',
        title: "On ne réclame plus une facture d'acompte déjà encaissée",
        body: "« Facture d'acompte à émettre », lisait-on ici, alors que l'acompte était encaissé et que le dossier était parti au contrôle. La cause : « à faire maintenant » cherchait le premier cran non franchi en partant du début, sans regarder ce qui l'était plus loin. Or un cran postérieur franchi rend les précédents caducs — on ne calcule pas une note de structure avant d'avoir été payé. La prochaine action se lit désormais après le dernier cran franchi, et cette affaire affiche « Calcul à réaliser — l'acompte est encaissé : l'ingénieur peut commencer. »",
      },
      {
        /*
          ROUGET : devis `etude + sondages`, donc mission « étude » — le cas où
          le cran sondage doit s'intercaler sans remplacer la mission déduite.
        */
        path: "/customers/fiche?id=aeb64050-c806-4628-bc3a-7f1d5974956e",
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
        path: "/customers/fiche?id=f8000da5-ce8a-497b-881c-3fa59a9226c9",
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
        path: "/customers/fiche?id=d4804e98-5283-42fe-ab4e-3f14d17b1720",
        target: '[data-demo="bouton-chercher-courriels"]',
        title: "Le bouton qui ne rendait qu'une erreur",
        body: "Cette fonctionnalité n'avait jamais abouti une seule fois en production : un appel, cinq minutes d'attente, puis un encadré rouge portant une erreur de transport brute. La cause n'était ni le réseau, ni la clé, ni le compte — tous mesurés sains — mais le modèle demandé. Le CRM réclamait « moonshotai/kimi-k3 », que le catalogue de NVIDIA annonce toujours et qui ne renvoie plus rien du tout : pas un refus, pas un quota dépassé, aucun octet. Passés un par un, quatre-vingt-deux identifiants du catalogue donnent trois modèles qui répondent, quatre qui rendent 404 tout en étant listés, et cinq muets — dont celui-là, et dont le 90B vision demandé le matin même.",
      },
      {
        path: "/customers/fiche?id=d4804e98-5283-42fe-ab4e-3f14d17b1720",
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
        path: "/customers/fiche?id=7b258702-e98d-49be-b2f2-4197cf335fc8",
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
        path: "/customers/fiche?id=02086ac2-2cc1-455c-8c49-daeebc73048b",
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
        path: "/customers/fiche?id=cf5f2622-d368-4e68-9e47-990ee24a46c1",
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
