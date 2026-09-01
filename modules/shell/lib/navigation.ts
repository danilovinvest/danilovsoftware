import type { Permission } from "@/modules/auth";

/**
 * Registre des modules du CRM. Ajouter un module = ajouter une entrée ici ;
 * la navigation masque automatiquement ceux que le rôle courant ne peut pas
 * ouvrir.
 */
export type NavItem = {
  href: string;
  label: string;
  description: string;
  permission: Permission;
  /** Un module encore à construire reste visible mais désactivé. */
  comingSoon?: boolean;
};

export const NAVIGATION: NavItem[] = [
  {
    href: "/customers",
    label: "Fiches client",
    description: "Prospects, clients, projets et devis",
    permission: "customers:read",
  },
  {
    href: "/users",
    label: "Utilisateurs",
    description: "Comptes, rôles et permissions",
    permission: "users:read",
    comingSoon: true,
  },
];
