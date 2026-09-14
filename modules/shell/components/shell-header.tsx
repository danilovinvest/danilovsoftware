"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SettingsIcon,
  UserPlusIcon,
} from "lucide-react";
import { usePermission } from "@/modules/auth";
import { useSidebar } from "@/components/ui/sidebar";
import { LogoTile } from "@/shared/ui/logo";
import { WORKSPACE } from "@/shared/lib/workspace";
import { cn } from "@/lib/utils";
import { AccountMenu } from "./workspace-menu";
import { CommandSearch } from "./command-search";
import { NotificationsMenu } from "./notifications-menu";

/**
 * Les gestes de l'en-tête : un carré aux angles doux, gris clair.
 *
 * Carré et non rond : un rond seul se lisait comme un avatar de plus, et le
 * « ⋯ » qu'il portait ne disait pas ce qu'il allait faire.
 */
export const HEADER_BUTTON =
  "bg-muted/60 hover:bg-muted text-foreground/70 hover:text-foreground data-[state=open]:bg-muted " +
  "focus-visible:ring-ring relative flex size-9 shrink-0 items-center justify-center rounded-xl " +
  "transition-colors focus-visible:ring-2 focus-visible:outline-none md:size-10 [&_svg]:size-[18px]";

/**
 * L'en-tête de l'application, sur toute la largeur du panneau.
 *
 * Il coiffe la colonne et le contenu ensemble, sans liseré ni fond qui les
 * sépare : deux boîtes côte à côte se lisent comme deux écrans, un panneau
 * unique comme une application.
 *
 * À gauche, le bouton qui ferme la colonne — son icône change pour dire ce
 * qu'il fera, fermer ou rouvrir, là où « ⋯ » ne disait rien — puis la marque.
 * Le fil d'Ariane commence exactement là où commence le contenu. À droite, ce
 * qu'on ouvre sans quitter l'écran : ce qui réclame, inviter, les paramètres,
 * le compte.
 */
export function ShellHeader({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { open, openMobile, isMobile, toggleSidebar } = useSidebar();
  const canInvite = usePermission("users:write");

  const ouverte = isMobile ? openMobile : open;
  const ToggleIcon = ouverte ? PanelLeftCloseIcon : PanelLeftOpenIcon;
  const toggleLabel = ouverte ? "Fermer la navigation" : "Ouvrir la navigation";

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 px-3 md:h-18 md:gap-3 md:px-4">
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
          aria-label={toggleLabel}
          aria-expanded={ouverte}
          title={`${toggleLabel} (Ctrl B)`}
          className={HEADER_BUTTON}
        >
          <ToggleIcon />
        </button>
        {/*
          La marque en rectangle : le profilé est six fois plus large que haut,
          et un rond le réduisait à un trait au milieu d'une pastille.
        */}
        <Link
          href="/dashboard"
          aria-label={`${WORKSPACE.name} — tableau de bord`}
          title={WORKSPACE.tagline}
          className="focus-visible:ring-ring rounded-xl focus-visible:ring-2 focus-visible:outline-none"
        >
          <LogoTile className="h-9 w-12 rounded-xl md:h-10 md:w-16" />
        </Link>
      </div>

      <div className="min-w-0 flex-1">{children}</div>

      <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
        {/* Sur un écran large, la recherche vit dans la colonne ; ce
            déclencheur-ci ne sert que là où elle n'est pas — sur un téléphone,
            où la colonne est un tiroir, et dans les réglages, dont la colonne
            ne la porte pas. */}
        <CommandSearch
          className={pathname.startsWith("/settings") ? undefined : "md:hidden"}
        />
        <NotificationsMenu buttonClassName={HEADER_BUTTON} />
        {canInvite && (
          // Sur un téléphone la place manque : l'invitation reste dans
          // Paramètres → Membres, à un geste de plus.
          <Link
            href="/settings/membres"
            aria-label="Inviter un utilisateur"
            title="Inviter un utilisateur"
            className={cn(HEADER_BUTTON, "hidden sm:flex")}
          >
            <UserPlusIcon />
          </Link>
        )}
        <Link
          href="/settings"
          aria-label="Paramètres"
          title="Paramètres"
          className={cn(
            HEADER_BUTTON,
            pathname.startsWith("/settings") && "bg-muted text-foreground",
          )}
        >
          <SettingsIcon />
        </Link>
        <AccountMenu />
      </div>
    </header>
  );
}
