import {
  CalendarIcon,
  CheckSquareIcon,
  FolderOpenIcon,
  FileTextIcon,
  HardHatIcon,
  LayoutDashboardIcon,
  RulerIcon,
  MailIcon,
  MegaphoneIcon,
  ReceiptEuroIcon,
  CloudIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/modules/auth";
import type { Scope } from "@/modules/group";

/**
 * Registre des modules du CRM. Ajouter un module = ajouter une entrée ici ;
 * la barre latérale masque automatiquement ceux que le rôle courant ne peut
 * pas ouvrir.
 */
/**
 * Les dix teintes d'adresse du CRM.
 *
 * Une par module, fixe. Elle n'obéit pas à la palette choisie dans les
 * réglages : une adresse qui change de couleur selon les préférences n'est
 * plus une adresse, et c'est justement pour reconnaître un écran sans le lire
 * qu'elle existe.
 */
export type Hue =
  | "violet"
  | "indigo"
  | "amber"
  | "jade"
  | "grass"
  | "crimson"
  | "cyan"
  | "pink"
  | "orange"
  | "slate";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** La couleur du module, portée partout où il se montre. */
  hue: Hue;
  /**
   * Les périmètres où cette entrée a un sens. Absent = les deux sociétés.
   *
   * Un bureau d'études n'a pas de chantiers : lui montrer l'écran, filtré à
   * vide, serait pire que de ne pas le montrer — on chercherait ce qui manque.
   */
  scopes?: Array<"ompt-structure" | "ompt-groupe">;
  permission: Permission;
  /** Sous-entrées dépliables ; chacune peut exiger sa propre permission. */
  items?: Array<{ href: string; label: string; permission?: Permission }>;
};

export type NavSection = {
  /** Absent pour la tête de colonne, qui n'appartient à aucune section. */
  label?: string;
  /** Ce que la section regroupe, montré au survol de son titre. */
  hint?: string;
  items: NavItem[];
};

/**
 * Trois sections, comme les réglages en ont deux.
 *
 * Dix entrées à la file ne se lisent pas : le tableau de bord et la page
 * Développeur y avaient le même poids, alors qu'on ouvre l'un tous les matins
 * et l'autre trois fois par an. Le regroupement suit **la fréquence et le
 * sujet**, pas l'ordre dans lequel les écrans ont été écrits.
 *
 * - **Le tableau de bord** tient seul en tête, sans titre. Il n'est pas une
 *   étape du fil mais sa synthèse : le ranger sous « Suivi » en faisait la
 *   première marche d'un parcours qu'il résume.
 * - **Suivi** est le fil d'une affaire, dans l'ordre où elle se déroule : le
 *   prospect, le chantier, la facture. C'est le seul endroit du CRM où cet
 *   enchaînement se lit d'un coup d'œil.
 * - **Au quotidien** est ce qu'on ouvre pour travailler, pas pour décider.
 * - **Outils** est ce qui fait tourner la machine : rarement ouvert, jamais
 *   pendant qu'on cherche un client.
 *
 * Une section dont aucune entrée n'est autorisée disparaît en entier plutôt
 * que d'afficher un titre vide — même règle que les réglages.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      {
        href: "/dashboard",
        label: "Tableau de bord",
        icon: LayoutDashboardIcon,
        hue: "violet",
        // La synthèse ne montre rien de plus que les fiches : qui peut les lire
        // peut la lire.
        permission: "customers:read",
      },
    ],
  },
  {
    label: "Suivi",
    hint: "Le fil d'une affaire, du prospect à la facture",
    items: [
      {
        href: "/customers",
        label: "Fiches client",
        icon: FileTextIcon,
        hue: "indigo",
        permission: "customers:read",
        /*
          Un menu dépliant, et cette fois il a de quoi se déplier.

          Il avait été retiré quand il ne portait plus que « Toutes les
          fiches » : un clic de plus pour rien. Le 29/09 le dirigeant a demandé
          de « différencier les syndics, les fournisseurs, les apporteurs
          d'affaires » depuis la colonne : chaque sous-entrée est une liste
          filtrée, écrite dans le format de l'adresse de la liste
          (`customers/lib/list-query.ts`), et ses catégories sont celles du
          filtre « Catégorie » (`customers/lib/categories.ts`) — un test tient
          les deux d'accord. « Clients » est la liste par défaut, donc sans
          paramètre ; « Toutes » coche tous les statuts.

          Le graphe ferme la liste : c'est la même base, vue d'un coup.
        */
        items: [
          { href: "/customers?statut=tous", label: "Toutes" },
          { href: "/customers", label: "Clients" },
          { href: "/customers?statut=prospect", label: "Prospects" },
          { href: "/customers?type=copropriete", label: "Copropriétés" },
          { href: "/customers?type=syndic", label: "Syndics" },
          { href: "/customers?type=gestionnaire", label: "Gestionnaires" },
          {
            href: "/customers?relation=prescripteur,partenaire_technique",
            label: "Prescripteurs",
          },
          { href: "/customers?apporteur=1", label: "Apporteurs d'affaires" },
          { href: "/customers?relation=fournisseur", label: "Fournisseurs" },
          { href: "/customers?relation=sous_traitant", label: "Sous-traitants" },
          { href: "/customers?relation=intervenant", label: "Organismes" },
          { href: "/customers/graphe", label: "Graphe" },
        ],
      },
      {
        href: "/etudes",
        label: "Études",
        icon: RulerIcon,
        hue: "indigo",
        // Le carnet du bureau d'études : ce qui est en production, ce qui est
        // rendu. Un métier qui produit un document, pas un chantier.
        scopes: ["ompt-structure"],
        permission: "customers:read",
      },
      {
        href: "/chantiers",
        label: "Chantiers",
        icon: HardHatIcon,
        hue: "amber",
        // L'exécution appartient à OMPT GROUPE : c'est elle qui réserve une
        // date et commande du béton.
        scopes: ["ompt-groupe"],
        // Les affaires signées : ce qui suit la signature. Même permission que
        // les fiches — c'est la suite de la même affaire.
        permission: "customers:read",
      },
      {
        href: "/billing",
        label: "Facturation",
        icon: ReceiptEuroIcon,
        hue: "jade",
        // Faute d'une permission « invoices:read » côté API, la facturation
        // suit celle des devis. La lecture financière du groupe reste, elle,
        // derrière « users:read » — un chargé d'affaires a besoin de savoir si
        // son client a payé, pas de la TVA des cinq sociétés.
        permission: "quotes:read",
        items: [
          { href: "/billing", label: "Factures" },
          // Les virements reçus avant leur pièce (29/09) : la seule liste de
          // la facturation qui lit la base aujourd'hui.
          { href: "/billing/a-affecter", label: "À affecter" },
          // Les factures dues et l'échelle de relance de chacune (migration 109).
          { href: "/billing/recouvrement", label: "Recouvrement" },
          {
            href: "/billing/tresorerie",
            label: "Flux de trésorerie",
            permission: "users:read",
          },
        ],
      },
    ],
  },
  {
    label: "Au quotidien",
    hint: "Ce qu'on ouvre pour travailler",
    items: [
      {
        /*
          « Mes dossiers » ouvre la section du quotidien, avant les tâches.

          C'est la question qu'on se pose en arrivant le matin — qu'est-ce qui
          m'attend — et elle précède « qu'est-ce que j'ai noté ». Sous
          `customers:read` et non une permission à elle : on n'y lit que des
          affaires qu'on a déjà le droit de lire.
        */
        href: "/mes-dossiers",
        label: "Mes dossiers",
        icon: FolderOpenIcon,
        hue: "indigo",
        permission: "customers:read",
      },
      {
        href: "/tasks",
        label: "Tâches",
        icon: CheckSquareIcon,
        hue: "grass",
        permission: "tasks:read",
      },
      {
        href: "/calendar",
        // « Agenda » et non « Calendrier » : c'est le mot employé partout
        // ailleurs — dans les réglages, dans les automatisations, dans le
        // module lui-même. Deux noms pour un écran font chercher deux écrans.
        label: "Agenda",
        icon: CalendarIcon,
        hue: "crimson",
        // L'agenda ne montre rien de plus que les fiches : qui peut les lire
        // peut le lire.
        permission: "customers:read",
      },
      {
        /*
          Les ouvriers partagent l'ambre des Chantiers, et c'est délibéré.

          Les dix teintes d'adresse sont prises, et en inventer une onzième
          pour un écran voisin brouillerait celles qui servent déjà. L'ambre
          est la couleur du terrain : les chantiers et les gens qui y vont se
          lisent ensemble, et c'est la seule paire du CRM où le partage dit
          quelque chose plutôt que de créer une confusion.
        */
        href: "/ouvriers",
        label: "Ouvriers",
        icon: HardHatIcon,
        hue: "amber",
        // L'équipe de chantier appartient à OMPT GROUPE : un bureau d'études
        // n'envoie personne poser des étais.
        scopes: ["ompt-groupe"],
        permission: "workers:read",
      },
      {
        href: "/mail",
        label: "Messagerie",
        icon: MailIcon,
        hue: "cyan",
        // La boîte de l'entreprise. Sa propre permission : lire les échanges
        // d'un client est plus intrusif que lire sa fiche, et devoir retirer
        // l'un sans l'autre est un besoin réel.
        permission: "mail:read",
      },
    ],
  },
  {
    label: "Outils",
    hint: "Ce qui fait tourner la machine",
    items: [
      {
        href: "/marketing",
        label: "Marketing",
        icon: MegaphoneIcon,
        hue: "pink",
        // Les réalisations viennent des chantiers livrés : qui peut lire les
        // fiches peut les valoriser.
        permission: "customers:read",
      },
      {
        href: "/automations",
        label: "Automatisations",
        icon: ZapIcon,
        hue: "orange",
        // Regarder une automatisation et son journal se distingue de la
        // concevoir : dessiner un graphe, c'est décider que le CRM écrira tout
        // seul à des numéros. L'écriture est vérifiée par l'API, route par route.
        permission: "automations:read",
      },
      {
        href: "/onedrive",
        label: "OneDrive",
        icon: CloudIcon,
        hue: "slate",
        // L'arborescence brute de l'entreprise, avant d'en tirer des fiches.
        // Réservé à l'administration : elle montre tous les dossiers, y compris
        // ceux qui n'ont pas de fiche.
        permission: "system:admin",
      },
    ],
  },
];

/**
 * Toutes les entrées à plat.
 *
 * Le fil d'Ariane cherche l'écran courant sans se soucier de sa section, et la
 * recherche globale non plus. Dérivé plutôt que recopié : deux listes à tenir
 * divergent au premier module ajouté.
 */
export const NAVIGATION: NavItem[] = NAV_SECTIONS.flatMap(
  (section) => section.items,
);

/**
 * Une entrée s'affiche-t-elle pour ce compte, dans ce périmètre ?
 *
 * Une seule règle pour la colonne et pour la page d'arrivée : si elles
 * divergeaient, l'arrivée mènerait à un écran que la colonne ne montre pas.
 */
export function isNavItemVisible(
  item: NavItem,
  can: (permission: Permission) => boolean,
  scope: Scope,
): boolean {
  return (
    can(item.permission) &&
    // Le périmètre masque ce qui n'a pas de sens pour la société choisie ;
    // « tout le groupe » ne masque rien.
    (scope === "tous" || !item.scopes || item.scopes.includes(scope))
  );
}

/**
 * Le premier écran que ce compte peut ouvrir, dans l'ordre de la colonne.
 *
 * Tout le CRM mène au tableau de bord — la racine, la connexion, le logo — et
 * le tableau de bord exige `customers:read`. Un rôle sur mesure qui ne lit que
 * les tâches arrivait donc sur « Accès refusé » à chaque connexion (issue 95).
 * Nul quand rien n'est permis : l'écran le dit, il n'invente pas de refuge.
 */
export function firstAllowedHref(
  can: (permission: Permission) => boolean,
  scope: Scope,
): string | null {
  return NAVIGATION.find((item) => isNavItemVisible(item, can, scope))?.href ?? null;
}

/** Ce qu'il faut d'une adresse pour lire ses paramètres, `useSearchParams` compris. */
type ParamReader = { get(name: string): string | null };

/**
 * Une sous-entrée est-elle l'écran courant ?
 *
 * Le chemin ne suffit plus : « Syndics » et « Fournisseurs » mènent tous deux à
 * `/customers`, et ne diffèrent que par leurs paramètres. Une sous-entrée est
 * active quand son chemin est celui de la page **et** que chacun des paramètres
 * qui distinguent ses sœurs y vaut la même chose — absent compris. Les autres
 * paramètres (la recherche, la page, le tri) ne comptent pas : chercher un nom
 * parmi les syndics reste dans « Syndics ».
 *
 * Sans paramètre chez aucune sœur, c'est l'égalité des chemins d'avant : la
 * facturation n'a pas changé de comportement.
 */
export function isSubItemActive(
  href: string,
  siblings: ReadonlyArray<{ href: string }>,
  pathname: string,
  params: ParamReader,
): boolean {
  const target = new URL(href, "http://crm.local");
  if (target.pathname !== pathname) return false;
  const keys = new Set(
    siblings.flatMap((sibling) => [...new URL(sibling.href, "http://crm.local").searchParams.keys()]),
  );
  return [...keys].every(
    (key) => (params.get(key) ?? "") === (target.searchParams.get(key) ?? ""),
  );
}
