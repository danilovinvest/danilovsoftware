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
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { NAVIGATION } from "../lib/navigation";
import { AppSidebar } from "./app-sidebar";
import { PageTitleProvider, usePageTitle } from "./page-title";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <PageTitleProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 !h-4" />
            <ShellBreadcrumb />
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
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

  const module = NAVIGATION.find((item) => pathname.startsWith(item.href));
  const rest = module ? pathname.slice(module.href.length).replace(/^\//, "") : "";
  const leaf = rest === "nouveau" ? "Nouvelle fiche" : rest ? pageTitle : null;

  if (!module) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          {leaf ? (
            <BreadcrumbLink asChild>
              <Link href={module.href}>{module.label}</Link>
            </BreadcrumbLink>
          ) : (
            <BreadcrumbPage>{module.label}</BreadcrumbPage>
          )}
        </BreadcrumbItem>
        {leaf && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{leaf}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
