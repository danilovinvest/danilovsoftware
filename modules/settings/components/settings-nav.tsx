"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { useAuth } from "@/modules/auth";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NAV_ITEM_CLASS } from "@/shared/ui/nav";
import {
  SETTINGS_NAVIGATION,
  isSettingsItemActive,
} from "../lib/navigation";

/**
 * Contenu du tiroir latéral quand on est dans les réglages.
 *
 * Twenty ne pose pas les réglages à côté du reste : entrer dans les réglages
 * remplace toute la navigation, et on en sort par une seule porte en haut. Le
 * composant rend donc l'en-tête et le corps du tiroir, `AppSidebar` gardant la
 * coque `<Sidebar>` et le pied.
 */
export function SettingsNav() {
  const pathname = usePathname();
  const { can } = useAuth();

  const sections = SETTINGS_NAVIGATION.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.permission || can(item.permission)),
  })).filter((section) => section.items.length > 0);

  return (
    <>
      <SidebarHeader className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className={NAV_ITEM_CLASS} tooltip="Retour">
              <Link href="/customers">
                <ArrowLeftIcon />
                <span>Retour</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-3 px-2">
        {sections.map((section) => (
          <SidebarGroup key={section.label} className="p-0">
            <SidebarGroupLabel className="text-muted-foreground h-7 px-1.5 text-[11px] font-medium">
              {section.label}
            </SidebarGroupLabel>
            <SidebarMenu className="gap-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isSettingsItemActive(item.href, pathname)}
                      tooltip={item.label}
                      className={NAV_ITEM_CLASS}
                    >
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </>
  );
}
