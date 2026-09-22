"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
import { NAV_ACTIVE_CLASS, NAV_ITEM_CLASS } from "@/shared/ui/nav";
import { cn } from "@/lib/utils";
import {
  SETTINGS_NAVIGATION,
  isSettingsItemActive,
} from "../lib/navigation";
import { lastReturnRoute } from "../lib/return-route";

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
  const router = useRouter();
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
              {/* L'adresse du lien est le repli ; la vraie destination, la
                  dernière page quittée pour entrer ici, est lue au clic. */}
              <Link
                href="/dashboard"
                data-demo="settings-back"
                onClick={(event) => {
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                  event.preventDefault();
                  router.push(lastReturnRoute());
                }}
              >
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
            <SidebarGroupLabel className="text-brand-text h-7 px-2.5 text-[10px] font-semibold tracking-[0.08em] uppercase group-data-[collapsible=icon]:-mt-7">
              {section.label}
            </SidebarGroupLabel>
            <SidebarMenu className="gap-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isSettingsItemActive(item.href, pathname)}
                      tooltip={item.label}
                      className={cn(NAV_ITEM_CLASS, NAV_ACTIVE_CLASS)}
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
