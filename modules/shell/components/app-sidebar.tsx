"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";
import { useAuth } from "@/modules/auth";
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
import { NAVIGATION } from "../lib/navigation";
import { CommandSearch } from "./command-search";
import { WorkspaceMenu } from "./workspace-menu";

/**
 * Chez Twenty l'entrée de navigation est basse (28 px), en gris secondaire, et
 * ne s'allume qu'à l'état actif — un aplat gris, jamais une teinte. Ces classes
 * sont partagées par les entrées de premier niveau et leurs sous-entrées pour
 * que la colonne garde un seul rythme.
 */
const ITEM = "h-7 gap-2 rounded-[4px] px-1.5 text-sm font-normal";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { can } = useAuth();

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader className="gap-0.5 p-2">
        <WorkspaceMenu />
        <CommandSearch />
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="text-muted-foreground h-7 px-1.5 text-[11px] font-medium">
            Espace de travail
          </SidebarGroupLabel>
          <SidebarMenu className="gap-0.5">
            {NAVIGATION.filter((item) => can(item.permission)).map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;

              // Un module encore à construire reste visible pour situer la
              // suite du produit, mais n'est pas cliquable.
              if (item.comingSoon) {
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      tooltip={`${item.label} — à venir`}
                      className={`${ITEM} cursor-not-allowed opacity-50`}
                      aria-disabled
                    >
                      <Icon />
                      <span>{item.label}</span>
                      <span className="text-muted-foreground ml-auto text-[10px]">
                        bientôt
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              }

              const subItems = (item.items ?? []).filter(
                (sub) => !sub.permission || can(sub.permission),
              );

              if (subItems.length === 0) {
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className={ITEM}
                    >
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
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
                        className={ITEM}
                      >
                        <Icon />
                        <span>{item.label}</span>
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
                              className={ITEM}
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
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
