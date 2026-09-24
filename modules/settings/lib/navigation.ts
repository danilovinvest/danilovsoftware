import {
  ClipboardCheckIcon,
  CopyIcon,
  BotIcon,
  CalendarIcon,
  CloudIcon,
  MailIcon,
  PaletteIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  UserIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/modules/auth";

export type SettingsNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Absente = visible par tout compte connecté. */
  permission?: Permission;
};

export type SettingsSection = {
  label: string;
  items: SettingsNavItem[];
};

/**
 * Sections des réglages, reprises de `useSettingsNavigationItems` chez Twenty :
 * ce qui relève de la personne d'abord, ce qui relève de l'espace de travail
 * ensuite. Une section dont aucune entrée n'est autorisée disparaît en entier
 * plutôt que d'afficher un titre vide.
 */
export const SETTINGS_NAVIGATION: SettingsSection[] = [
  {
    label: "Utilisateur",
    items: [
      { href: "/settings", label: "Profil", icon: UserIcon },
      { href: "/settings/experience", label: "Expérience", icon: PaletteIcon },
      { href: "/settings/assistant", label: "Assistant", icon: BotIcon },
    ],
  },
  {
    label: "Espace de travail",
    items: [
      {
        href: "/settings/general",
        label: "Général",
        icon: SlidersHorizontalIcon,
      },
      {
        href: "/settings/membres",
        label: "Membres",
        icon: UsersIcon,
        permission: "users:read",
      },
      {
        href: "/settings/roles",
        label: "Rôles",
        icon: ShieldCheckIcon,
        permission: "roles:read",
      },
      {
        href: "/settings/agenda",
        label: "Agenda",
        icon: CalendarIcon,
        permission: "calendar:read",
      },
      {
        href: "/settings/messagerie",
        label: "Messagerie",
        icon: MailIcon,
        permission: "mail:read",
      },
      {
        href: "/settings/modele",
        label: "Modèle de fiche",
        icon: ClipboardCheckIcon,
        // Même permission que les fiches pour *voir* le modèle ; le régler est
        // sous `system:admin` côté API — il déplace la liste de travail de
        // tout le monde, pas seulement la sienne.
        permission: "customers:read",
      },
      {
        href: "/settings/doublons",
        label: "Doublons",
        icon: CopyIcon,
        // Même permission que les fiches pour *voir* les paires ; la fusion,
        // qui retire une fiche, est vérifiée route par route côté API.
        permission: "customers:read",
      },
      {
        href: "/settings/fichiers",
        label: "Fichiers",
        icon: CloudIcon,
        // Même permission que les fiches : l'arborescence OneDrive dit qui sont
        // les clients, c'est la même information.
        permission: "customers:read",
      },
    ],
  },
];

/**
 * `/settings` est un préfixe de toutes les autres entrées : le rapprochement se
 * fait donc sur l'égalité stricte, sinon « Profil » resterait actif partout.
 */
export function isSettingsItemActive(href: string, pathname: string) {
  return pathname === href;
}

/** Libellé de la section courante, pour le fil d'Ariane du shell. */
export function settingsLabel(pathname: string): string | null {
  for (const section of SETTINGS_NAVIGATION) {
    for (const item of section.items) {
      if (isSettingsItemActive(item.href, pathname)) return item.label;
    }
  }
  return null;
}
