import {
  BotIcon,
  CalendarIcon,
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
