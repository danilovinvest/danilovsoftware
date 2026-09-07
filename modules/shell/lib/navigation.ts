import {
  CalendarIcon,
  CheckSquareIcon,
  FileTextIcon,
  HardHatIcon,
  LayoutDashboardIcon,
  MailIcon,
  MegaphoneIcon,
  ReceiptEuroIcon,
  CloudIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/modules/auth";

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
  permission: Permission;
  /** Sous-entrées dépliables ; chacune peut exiger sa propre permission. */
  items?: Array<{ href: string; label: string; permission?: Permission }>;
};

export type NavSection = {
  label: string;
  /** Ce que la section regroupe, montré au survol de son titre. */
  hint: string;
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
 * - **Suivi** est le fil d'une affaire, dans l'ordre où elle se déroule : la
 *   synthèse, le prospect, le chantier, la facture. C'est le seul endroit du
 *   CRM où cet enchaînement se lit d'un coup d'œil, et c'est pour cela qu'il
 *   vient en tête.
 * - **Au quotidien** est ce qu'on ouvre pour travailler, pas pour décider.
 * - **Outils** est ce qui fait tourner la machine : rarement ouvert, jamais
 *   pendant qu'on cherche un client.
 *
 * Une section dont aucune entrée n'est autorisée disparaît en entier plutôt
 * que d'afficher un titre vide — même règle que les réglages.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Suivi",
    hint: "Le fil d'une affaire, de la synthèse à la facture",
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
      {
        href: "/customers",
        label: "Fiches client",
        icon: FileTextIcon,
        hue: "indigo",
        permission: "customers:read",
        items: [
          { href: "/customers", label: "Toutes les fiches" },
          // « Nouvelle fiche » n'est pas repris ici : la création a déjà son
          // bouton en tête de liste, et Twenty ne double jamais une action par
          // une entrée de navigation.
          {
            href: "/customers/import",
            label: "Synchronisation Excel",
            permission: "imports:run",
          },
        ],
      },
      {
        href: "/chantiers",
        label: "Chantiers",
        icon: HardHatIcon,
        hue: "amber",
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
