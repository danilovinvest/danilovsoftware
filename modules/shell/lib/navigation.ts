import {
  CheckSquareIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  ReceiptEuroIcon,
  UsersIcon,
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
  /** Un module encore à construire reste visible mais désactivé. */
  comingSoon?: boolean;
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
    href: "/tasks",
    label: "Tâches",
    icon: CheckSquareIcon,
    permission: "tasks:read",
  },
  {
    href: "/billing",
    label: "Facturation",
    icon: ReceiptEuroIcon,
    // Faute d'une permission « invoices:read » côté API, la facturation suit
    // celle des devis. La vue consolidée du groupe est en revanche réservée à
    // la direction, dans le module lui-même.
    permission: "quotes:read",
  },
  {
    href: "/users",
    label: "Utilisateurs",
    icon: UsersIcon,
    permission: "users:read",
    comingSoon: true,
  },
];
