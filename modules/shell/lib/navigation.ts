import {
  FileTextIcon,
  LayoutGridIcon,
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
    href: "/customers",
    label: "Fiches client",
    icon: FileTextIcon,
    permission: "customers:read",
    items: [
      { href: "/customers", label: "Toutes les fiches" },
      { href: "/customers?status=prospect", label: "Prospects" },
      { href: "/customers?status=client", label: "Clients" },
      {
        href: "/customers/nouveau",
        label: "Nouvelle fiche",
        permission: "customers:write",
      },
    ],
  },
  {
    href: "/users",
    label: "Utilisateurs",
    icon: UsersIcon,
    permission: "users:read",
    comingSoon: true,
  },
  {
    href: "/settings",
    label: "Paramètres",
    icon: LayoutGridIcon,
    permission: "system:admin",
    comingSoon: true,
  },
];
