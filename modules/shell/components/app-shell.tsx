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
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NAVIGATION } from "../lib/navigation";
import { HUE } from "@/shared/ui/hue";
import { cn } from "@/lib/utils";
import { AppSidebar } from "./app-sidebar";
import { CommandSearch } from "./command-search";
import { PageTitleProvider, usePageTitle } from "./page-title";

/** Largeur du tiroir de navigation de Twenty. */
const SIDEBAR_WIDTH = "236px";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <PageTitleProvider>
      {/* Les libellés de la barre latérale repliée passent par des tooltips
          Radix, qui exigent un provider au-dessus d'eux. */}
      <TooltipProvider delayDuration={200}>
        <SidebarProvider
          style={{ "--sidebar-width": SIDEBAR_WIDTH } as React.CSSProperties}
        >
          <AppSidebar />
          {/*
            Le panneau principal de Twenty ne remplit pas la fenêtre : il flotte
            sur le gris de la barre latérale, détaché par une gouttière, un
            liseré et un rayon. C'est `variant="inset"` de shadcn qui pose la
            marge et le rayon ; le liseré se rajoute ici, sinon deux gris aussi
            proches (gray1 et gray2) ne se distingueraient pas.
          */}
          {/*
            `min-w-0` sur la zone principale : c'est un élément de conteneur
            flex, donc sa largeur minimale vaut son contenu par défaut. Un
            tableau plus large que l'écran l'élargissait, et c'est la page
            entière qui défilait latéralement au lieu du seul tableau.
          */}
          <SidebarInset className="min-w-0 md:peer-data-[variant=inset]:border">
            {/*
              La barre du haut : où l'on est à gauche, ce qu'on cherche à
              droite. La recherche y a sa place et non dans la colonne de
              gauche — elle sert sur tous les écrans, réglages compris, où
              cette colonne bascule entièrement.
            */}
            <header className="flex h-11 shrink-0 items-center gap-2 border-b px-2">
              <SidebarTrigger className="text-muted-foreground size-7 shrink-0" />
              <div className="min-w-0 flex-1">
                <ShellBreadcrumb />
              </div>
              <CommandSearch />
            </header>
            <div className="flex flex-1 flex-col gap-5 p-4 md:px-6 md:py-5">
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
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
        <BreadcrumbList className="gap-1 text-sm sm:gap-1">
          <BreadcrumbItem className="gap-2">
            <span className="bg-selected text-brand flex size-5 shrink-0 items-center justify-center rounded-md">
              <SettingsIcon className="size-3.5" />
            </span>
            {section ? (
              <BreadcrumbLink asChild className="hover:text-foreground">
                <Link href="/settings">Paramètres</Link>
              </BreadcrumbLink>
            ) : (
              <BreadcrumbPage className="font-medium">Paramètres</BreadcrumbPage>
            )}
          </BreadcrumbItem>
          {section && (
            <>
              <BreadcrumbSeparator className="[&>svg]:size-3" />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium">{section}</BreadcrumbPage>
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
      <BreadcrumbList className="gap-1 text-sm sm:gap-1">
        <BreadcrumbItem className="gap-2">
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
            <BreadcrumbPage className="font-medium">{active.label}</BreadcrumbPage>
          )}
        </BreadcrumbItem>
        {leaf && (
          <>
            <BreadcrumbSeparator className="[&>svg]:size-3" />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium">{leaf}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
