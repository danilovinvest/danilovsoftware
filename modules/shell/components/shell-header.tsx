"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { EllipsisIcon } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { LogoTile } from "@/shared/ui/logo";
import { WORKSPACE } from "@/shared/lib/workspace";
import { cn } from "@/lib/utils";
import { AccountMenu } from "./workspace-menu";
import { CommandSearch } from "./command-search";

/** Le rond gris clair des gestes de l'en-tête, partagé avec le compte. */
export const HEADER_ROUND =
  "bg-muted/70 hover:bg-muted text-foreground/70 hover:text-foreground focus-visible:ring-ring " +
  "flex size-9 shrink-0 items-center justify-center rounded-full transition-colors " +
  "focus-visible:ring-2 focus-visible:outline-none md:size-10";

/**
 * L'en-tête de l'application, sur toute la largeur du cadre.
 *
 * Il ne coiffe plus le seul panneau principal : la colonne et le contenu
 * vivent sous le même en-tête, dans le même panneau, sans liseré ni fond qui
 * les sépare. Deux boîtes posées côte à côte se lisent comme deux écrans ; un
 * panneau unique se lit comme une application.
 *
 * À gauche le « ⋯ » masque ou montre la navigation — c'était l'icône de
 * panneau de shadcn, enfouie en tête du contenu — puis la marque. Le fil
 * d'Ariane commence exactement là où commence le contenu : le groupe de gauche
 * prend la largeur de la colonne quand elle est ouverte. À droite, le compte.
 */
export function ShellHeader({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { open, isMobile, toggleSidebar } = useSidebar();

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 px-3 md:h-18 md:px-4">
      <div
        className={cn(
          "flex shrink-0 items-center gap-2",
          // 16 px de marge + cette largeur + 12 px d'écart = la colonne + les
          // 24 px de marge du contenu : le fil d'Ariane s'aligne sur le titre.
          open && !isMobile && "md:w-[calc(var(--sidebar-width)-0.25rem)]",
        )}
      >
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Afficher ou masquer la navigation"
          title="Afficher ou masquer la navigation (Ctrl B)"
          className={HEADER_ROUND}
        >
          <EllipsisIcon className="size-4" />
        </button>
        <Link
          href="/dashboard"
          aria-label={`${WORKSPACE.name} — tableau de bord`}
          title={WORKSPACE.tagline}
          className="focus-visible:ring-ring rounded-full focus-visible:ring-2 focus-visible:outline-none"
        >
          <LogoTile className="size-9 rounded-full md:size-10" />
        </Link>
      </div>

      <div className="min-w-0 flex-1">{children}</div>

      <div className="flex shrink-0 items-center gap-2">
        {/* Sur un écran large, la recherche vit dans la colonne ; ce
            déclencheur-ci ne sert que là où elle n'est pas — sur un téléphone,
            où la colonne est un tiroir, et dans les réglages, dont la colonne
            ne la porte pas. */}
        <CommandSearch
          className={pathname.startsWith("/settings") ? undefined : "md:hidden"}
        />
        <AccountMenu />
      </div>
    </header>
  );
}
