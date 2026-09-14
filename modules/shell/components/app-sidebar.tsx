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
  useSidebar,
} from "@/components/ui/sidebar";
import { NAV_ACTIVE_CLASS, NAV_ITEM_CLASS } from "@/shared/ui/nav";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS } from "../lib/navigation";
import { ScopeSwitcher, useScope } from "@/modules/group";
import { SidebarSearch } from "./sidebar-search";

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
  const { isMobile, open } = useSidebar();

  /*
    Sur un écran large, la colonne est posée dans le flux, pas en `fixed`.

    shadcn la colle aux bords de la fenêtre, et depuis que l'application vit
    dans un panneau elle débordait sur la gouttière, avec sa propre teinte.
    `collapsible="none"` la rend comme un simple bloc du panneau, du même fond
    que lui. Le repli en icônes disparaît avec : le « ⋯ » de l'en-tête masque la
    colonne entière, ce qui rend toute la largeur au contenu au lieu d'en
    rendre 200 pixels.

    Sur un téléphone elle reste le tiroir de shadcn. `hidden md:flex` couvre
    l'instant avant que la largeur de l'écran ne soit connue, où la colonne
    s'afficherait sinon en pleine page sur un téléphone.
  */
  if (!isMobile && !open) return null;

  return (
    <Sidebar
      collapsible={isMobile ? "offcanvas" : "none"}
      className={isMobile ? undefined : "hidden bg-transparent md:flex"}
      {...props}
    >
      {pathname.startsWith("/settings") ? <SettingsNav /> : <WorkspaceNav />}
    </Sidebar>
  );
}

function WorkspaceNav() {
  const pathname = usePathname();
  const { can } = useAuth();
  const scope = useScope();

  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        can(item.permission) &&
        // Le périmètre masque ce qui n'a pas de sens pour la société choisie ;
        // « tout le groupe » ne masque rien.
        (scope === "tous" || !item.scopes || item.scopes.includes(scope)),
    ),
  }))
    // Une section dont rien n'est autorisé disparaît en entier : un titre seul
    // ferait deviner ce qu'on ne peut pas ouvrir.
    .filter((section) => section.items.length > 0);

  return (
    <>
      {/*
        La recherche d'abord, puis la société pour laquelle on travaille. Le
        compte et la marque sont montés dans l'en-tête, qui coiffe toute
        l'application.
      */}
      <SidebarHeader className="gap-3 px-3 pt-1 pb-1">
        <SidebarSearch />
        <ScopeSwitcher />
      </SidebarHeader>

      <SidebarContent className="gap-0 px-3 pb-3">
        {sections.map((section, index) => (
          <SidebarGroup
            key={section.label ?? "tete"}
            /*
              Un filet entre les sections, et non plus un simple espace.

              L'espace seul séparait mal dès que les entrées se sont aérées :
              douze pixels entre deux sections se confondaient avec les quatre
              entre deux entrées. Le filet dit « autre chose commence » là où
              l'espace ne disait que « un peu plus loin ».
            */
            className={cn(
              "px-0 py-2.5",
              index > 0 && "border-sidebar-border/60 border-t",
            )}
          >
            {section.label && (
              <SidebarGroupLabel
                title={section.hint}
                /*
                  En petites majuscules et à la teinte d'accent.

                  Un titre gris de la même taille que les entrées se lit comme
                  une entrée de plus qu'on ne peut pas cliquer. Les majuscules
                  espacées et la couleur en font une étiquette, pas un lien.
                */
                className="text-brand-text h-7 px-2.5 text-[10px] font-semibold tracking-[0.08em] uppercase"
              >
                {section.label}
              </SidebarGroupLabel>
            )}
            <SidebarMenu className="gap-1">
              {section.items.map((item) => {
                const active = pathname.startsWith(item.href);
                const Icon = item.icon;

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
                        /*
                          L'entrée active est une pilule pleine, les autres
                          restent grises, icônes comprises.

                          Dix icônes de dix couleurs faisaient de la colonne
                          un nuancier : l'œil y cherchait l'écran courant
                          parmi dix taches. Une seule entrée pleine se trouve
                          sans chercher. La teinte du module n'a pas disparu
                          pour autant — elle reste l'adresse de l'écran dans
                          le fil d'Ariane, les attentes et la recherche, là où
                          l'écran se nomme.
                        */
                        className={cn(NAV_ITEM_CLASS, NAV_ACTIVE_CLASS)}
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
                          className={cn(NAV_ITEM_CLASS, NAV_ACTIVE_CLASS)}
                        >
                          <Icon />
                          <span>{item.label}</span>
                          <ChevronRightIcon className="ml-auto size-3.5! transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        {/*
                          Les sous-entrées ne prennent pas de pilule : leur
                          parente la porte déjà, et deux pilules pleines
                          l'une sous l'autre ne diraient plus laquelle est
                          l'écran. Elles s'écrivent plus foncé, rien de plus.
                        */}
                        <SidebarMenuSub className="border-sidebar-border/70 mx-0 ml-4 gap-0.5 py-1 pr-0 pl-2.5">
                          {subItems.map((sub) => (
                            <SidebarMenuSubItem key={sub.href}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === sub.href}
                                className="text-foreground/65 data-active:text-foreground h-8 rounded-lg px-2 text-[13px] data-active:bg-transparent data-active:font-medium"
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
        ))}
      </SidebarContent>
    </>
  );
}
