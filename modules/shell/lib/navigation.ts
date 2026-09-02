import {
  CalendarIcon,
  CheckSquareIcon,
  FileTextIcon,
  HardHatIcon,
  LayoutDashboardIcon,
  MegaphoneIcon,
  ReceiptEuroIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/modules/auth";

/**
 * Registre des modules du CRM. Ajouter un module = ajouter une entrée ici ;
 * la barre latérale masque automatiquement ceux que le rôle courant ne peut
 * pas ouvrir.
 */
export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: Permission;
  /** Sous-entrées dépliables ; chacune peut exiger sa propre permission. */
  items?: Array<{ href: string; label: string; permission?: Permission }>;
};

export const NAVIGATION: NavItem[] = [
  {
    href: "/dashboard",
    label: "Tableau de bord",
    icon: LayoutDashboardIcon,
    // La synthèse ne montre rien de plus que les fiches : qui peut les lire
    // peut la lire.
    permission: "customers:read",
  },
  {
    href: "/customers",
    label: "Fiches client",
    icon: FileTextIcon,
    permission: "customers:read",
    items: [
      { href: "/customers", label: "Toutes les fiches" },
      // « Nouvelle fiche » n'est pas repris ici : la création a déjà son bouton
      // en tête de liste, et Twenty ne double jamais une action par une entrée
      // de navigation.
      {
        href: "/customers/import",
        label: "Sync Excel",
        permission: "imports:run",
      },
    ],
  },
  {
    href: "/chantiers",
    label: "Chantiers",
    icon: HardHatIcon,
    // Tout ce qui suit la signature : exécution, coûts, réception. Même
    // permission que les fiches — c'est la suite de la même affaire.
    permission: "customers:read",
  },
  {
    href: "/tasks",
    label: "Tâches",
    icon: CheckSquareIcon,
    permission: "tasks:read",
  },
  {
    href: "/calendar",
    label: "Calendrier",
    icon: CalendarIcon,
    // Le calendrier ne montre rien de plus que les fiches : qui peut les lire
    // peut le lire.
    permission: "customers:read",
  },
  {
    href: "/billing",
    label: "Facturation",
    icon: ReceiptEuroIcon,
    // Faute d'une permission « invoices:read » côté API, la facturation suit
    // celle des devis. La lecture financière du groupe reste, elle, derrière
    // « users:read » — un chargé d'affaires a besoin de savoir si son client a
    // payé, pas de la TVA des cinq sociétés.
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
  {
    href: "/marketing",
    label: "Marketing",
    icon: MegaphoneIcon,
    // Les réalisations viennent des chantiers livrés : qui peut lire les
    // fiches peut les valoriser.
    permission: "customers:read",
  },
  {
    href: "/automations",
    label: "Automatisations",
    icon: ZapIcon,
    // Regarder une automatisation et son journal se distingue de la concevoir :
    // dessiner un graphe, c'est décider que le CRM écrira tout seul à des
    // numéros. L'écriture est vérifiée par l'API, route par route.
    permission: "automations:read",
  },
];
