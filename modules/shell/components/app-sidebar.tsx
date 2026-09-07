"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";
import { useAuth } from "@/modules/auth";
import { SettingsNav } from "@/modules/settings";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NAV_ITEM_CLASS } from "@/shared/ui/nav";
import { HUE } from "@/shared/ui/hue";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS } from "../lib/navigation";
import { WorkspaceMenu } from "./workspace-menu";

/**
 * Le tiroir latéral a deux états, comme chez Twenty : la navigation de
 * l'espace de travail, ou celle des réglages. On n'ajoute pas les réglages à
 * côté du reste — on y entre, et toute la colonne bascule.
 *
 * L'espace de travail est lui-même sectionné : dix entrées à la file ne se
 * lisent pas, et le tableau de bord y avait le même poids que la page
 * Développeur. Les sections vivent dans `lib/navigation.ts`, qui dit pourquoi.
 */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      {pathname.startsWith("/settings") ? <SettingsNav /> : <WorkspaceNav />}
      <SidebarRail />
    </Sidebar>
  );
}

function WorkspaceNav() {
  const pathname = usePathname();
  const { can } = useAuth();

  return (
    <>
      {/* La recherche a quitté cette colonne pour la barre du haut : elle
          sert partout, y compris dans les réglages, où cette navigation-ci
          disparaît entièrement. */}
      <SidebarHeader className="p-2">
        <WorkspaceMenu />
      </SidebarHeader>

      {/* `gap-3` sépare les sections : `SidebarContent` ne met aucun espace par
          défaut, et trois titres collés les uns aux autres se lisent comme une
          seule liste — ce qu'on cherchait justement à défaire. */}
      <SidebarContent className="gap-3 px-2">
        {NAV_SECTIONS.map((section) => {
          const visible = section.items.filter((item) => can(item.permission));
          // Une section dont rien n'est autorisé disparaît en entier : un titre
          // seul ferait deviner ce qu'on ne peut pas ouvrir.
          if (visible.length === 0) return null;

          return (
            <SidebarGroup key={section.label} className="p-0">
              <SidebarGroupLabel
                title={section.hint}
                // Le repli en mode icônes remonte le titre de sa propre
                // hauteur ; la classe par défaut vise `h-8`, celle-ci `h-7`.
                className="text-muted-foreground h-7 px-1.5 text-[11px] font-medium group-data-[collapsible=icon]:-mt-7"
              >
                {section.label}
              </SidebarGroupLabel>
              <SidebarMenu className="gap-0.5">
                {visible.map((item) => {
                  const active = pathname.startsWith(item.href);
                  const Icon = item.icon;

                  const subItems = (item.items ?? []).filter(
                    (sub) => !sub.permission || can(sub.permission),
                  );

                  const teinte = HUE[item.hue];

                  if (subItems.length === 0) {
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={item.label}
                          /*
                            L'icône porte la couleur du module en permanence,
                            pas seulement quand l'entrée est active : c'est
                            elle qui rend la colonne lisible d'un coup d'œil,
                            et une couleur qui n'apparaît qu'une fois sur dix
                            n'apprend rien.
                          */
                          className={cn(
                            NAV_ITEM_CLASS,
                            teinte.text,
                            active && `${teinte.soft} font-medium`,
                          )}
                        >
                          <Link href={item.href}>
                            <Icon />
                            <span className="text-foreground/85">{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }

                  return (
                    <Collapsible
                      key={item.href}
                      asChild
                      defaultOpen={active}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={item.label}
                            isActive={active}
                            className={cn(
                              NAV_ITEM_CLASS,
                              teinte.text,
                              active && `${teinte.soft} font-medium`,
                            )}
                          >
                            <Icon />
                            <span className="text-foreground/85">{item.label}</span>
                            <ChevronRightIcon className="text-muted-foreground ml-auto size-3.5! transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub className="mx-0 gap-0.5 border-none py-0.5 pr-0 pl-4">
                            {subItems.map((sub) => (
                              <SidebarMenuSubItem key={sub.href}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={pathname === sub.href}
                                  className={NAV_ITEM_CLASS}
                                >
                                  <Link href={sub.href}>
                                    <span>{sub.label}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          );
        })}
      </SidebarContent>
    </>
  );
}
