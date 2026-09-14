"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { SettingsIcon } from "lucide-react";
import { settingsLabel } from "@/modules/settings";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NAVIGATION } from "../lib/navigation";
import { HUE } from "@/shared/ui/hue";
import { cn } from "@/lib/utils";
import { AppSidebar } from "./app-sidebar";
import { PageTitleProvider, usePageTitle } from "./page-title";
import { ShellHeader } from "./shell-header";

/**
 * Largeur de la colonne. Plus large que les 236 px de Twenty : les entrées ont
 * pris de la hauteur et de la marge, et les intitulés longs se coupaient.
 */
const SIDEBAR_WIDTH = "248px";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <PageTitleProvider>
      {/* Les libellés de la barre latérale passent par des tooltips Radix, qui
          exigent un provider au-dessus d'eux. */}
      <TooltipProvider delayDuration={200}>
        {/*
          Un seul panneau, posé sur le sol.

          L'en-tête, la colonne et le contenu partagent le même fond, sans
          liseré ni teinte qui les sépare. Le CRM a porté trois boîtes — une
          colonne teintée, un panneau intérieur bordé, un cadre autour — et
          chacune avait ses bords, qui ne tombaient jamais tout à fait les uns
          sur les autres. Un panneau n'a qu'un bord.

          La gouttière disparaît sous 640 pixels : sur un téléphone, douze
          pixels de chaque côté sont douze pixels qui manquaient déjà.

          À partir de 768 pixels, le panneau prend la hauteur de la fenêtre et
          c'est le contenu qui défile : l'en-tête et la colonne restent en
          place, comme dans toute application. Sous ce seuil la colonne est un
          tiroir et la page défile normalement.
        */}
        <div className="bg-app-ground min-h-svh sm:p-3 lg:p-4">
          <SidebarProvider
            className="bg-background ring-border/60 flex-col overflow-hidden sm:min-h-[calc(100svh-1.5rem)] sm:rounded-2xl sm:shadow-sm sm:ring-1 md:h-[calc(100svh-1.5rem)] md:min-h-0 lg:h-[calc(100svh-2rem)]"
            style={{ "--sidebar-width": SIDEBAR_WIDTH } as React.CSSProperties}
          >
            <ShellHeader>
              <ShellBreadcrumb />
            </ShellHeader>
            <div className="flex min-h-0 flex-1">
              <AppSidebar />
              {/*
                `min-w-0` : c'est un élément de conteneur flex, donc sa largeur
                minimale vaut son contenu par défaut. Un tableau plus large que
                l'écran l'élargissait, et c'est la page entière qui défilait
                latéralement au lieu du seul tableau.
              */}
              <main className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:overflow-y-auto md:px-6 md:pt-1 md:pb-6">
                {children}
              </main>
            </div>
          </SidebarProvider>
        </div>
      </TooltipProvider>
    </PageTitleProvider>
  );
}

/**
 * Fil d'Ariane déduit de l'URL : le premier segment identifie le module, le
 * second est soit connu (« nouvelle fiche »), soit fourni par la page elle-même
 * via useSetPageTitle.
 */
function ShellBreadcrumb() {
  const pathname = usePathname();
  const pageTitle = usePageTitle();

  // Les réglages ne figurent pas dans NAVIGATION — on y entre par le menu de
  // l'espace de travail — mais le fil d'Ariane doit quand même les situer.
  if (pathname.startsWith("/settings")) {
    const section = settingsLabel(pathname);
    return (
      <Breadcrumb>
        <BreadcrumbList className="flex-nowrap gap-1 text-sm whitespace-nowrap sm:gap-1">
          <BreadcrumbItem className="min-w-0 gap-2">
            <span className="bg-selected text-brand-text flex size-5 shrink-0 items-center justify-center rounded-md">
              <SettingsIcon className="size-3.5" />
            </span>
            {section ? (
              <BreadcrumbLink asChild className="hover:text-foreground">
                <Link href="/settings">Paramètres</Link>
              </BreadcrumbLink>
            ) : (
              <BreadcrumbPage className="truncate font-medium">Paramètres</BreadcrumbPage>
            )}
          </BreadcrumbItem>
          {section && (
            <>
              <BreadcrumbSeparator className="[&>svg]:size-3" />
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="truncate font-medium">{section}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  const active = NAVIGATION.find((item) => pathname.startsWith(item.href));
  const rest = active ? pathname.slice(active.href.length).replace(/^\//, "") : "";
  const leaf = rest === "nouveau" ? "Nouvelle fiche" : rest ? pageTitle : null;

  if (!active) return null;

  const Icon = active.icon;
  const teinte = HUE[active.hue];

  return (
    <Breadcrumb>
      <BreadcrumbList className="flex-nowrap gap-1 text-sm whitespace-nowrap sm:gap-1">
        <BreadcrumbItem className="min-w-0 gap-2">
          {/* La pastille reprend la teinte du module : la barre du haut dit
              alors où l'on est avant qu'on ait lu le mot. */}
          <span
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-md",
              teinte.soft,
              teinte.text,
            )}
          >
            <Icon className="size-3.5" />
          </span>
          {leaf ? (
            <BreadcrumbLink asChild className="hover:text-foreground">
              <Link href={active.href}>{active.label}</Link>
            </BreadcrumbLink>
          ) : (
            <BreadcrumbPage className="truncate font-medium">{active.label}</BreadcrumbPage>
          )}
        </BreadcrumbItem>
        {leaf && (
          <>
            <BreadcrumbSeparator className="[&>svg]:size-3" />
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbPage className="truncate font-medium">{leaf}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
