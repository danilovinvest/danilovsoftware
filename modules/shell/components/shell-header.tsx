"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGridIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SettingsIcon,
  UserPlusIcon,
} from "lucide-react";
import { usePermission } from "@/modules/auth";
import { useSidebar } from "@/components/ui/sidebar";
import { BrandText } from "@/shared/ui/logo";
import { WORKSPACE } from "@/shared/lib/workspace";
import { cn } from "@/lib/utils";
import { AccountMenu } from "./workspace-menu";
import { CommandSearch } from "./command-search";
import { NotificationsMenu } from "./notifications-menu";
import { DemoMenu } from "@/modules/devtools";

/**
 * Un geste de l'en-tête : une icône sans fond, qui ne se remplit qu'au survol.
 *
 * Trois carrés gris côte à côte faisaient trois boîtes pesantes pour trois
 * icônes légères, et l'œil lisait les boîtes avant les icônes. Les gestes sont
 * donc rangés dans une seule barre, plus bas : un contour pour trois,
 * et chaque icône respire dedans.
 */
export const HEADER_BUTTON =
  "text-muted-foreground hover:text-foreground hover:bg-muted data-[state=open]:bg-muted data-[state=open]:text-foreground " +
  "focus-visible:ring-ring relative flex size-8 shrink-0 items-center justify-center rounded-full " +
  "transition-colors focus-visible:ring-2 focus-visible:outline-none [&_svg]:size-[17px]";

/**
 * L'en-tête de l'application, sur toute la largeur du panneau.
 *
 * Il coiffe la colonne et le contenu ensemble, sans liseré ni fond qui les
 * sépare : deux boîtes côte à côte se lisent comme deux écrans, un panneau
 * unique comme une application.
 *
 * À gauche, le bouton qui ferme la colonne — son icône change pour dire ce
 * qu'il fera, fermer ou rouvrir — puis la marque écrite. Le fil d'Ariane
 * commence exactement là où commence le contenu. À droite, ce qu'on ouvre sans
 * quitter l'écran : ce qui réclame, inviter, les paramètres, puis le compte.
 */
export function ShellHeader({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { open, openMobile, isMobile, toggleSidebar } = useSidebar();
  const canInvite = usePermission("users:write");
  const inSettings = pathname.startsWith("/settings");

  const ouverte = isMobile ? openMobile : open;
  const ToggleIcon = ouverte ? PanelLeftCloseIcon : PanelLeftOpenIcon;
  const toggleLabel = ouverte ? "Fermer la navigation" : "Ouvrir la navigation";

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 px-3 md:h-18 md:gap-3 md:px-4">
      <div
        className={cn(
          "flex shrink-0 items-center gap-2.5 md:gap-3",
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
          className={cn(HEADER_BUTTON, "size-9 rounded-xl [&_svg]:size-[18px]")}
        >
          <ToggleIcon />
        </button>
        {/*
          Le retour au portail, à gauche comme dans toute application qui en a
          un : c'est un geste de sortie vers le haut, pas une entrée de
          navigation. De là on rejoint l'autre société, la messagerie, le
          coffre — tout ce qui n'est pas ce CRM.

          L'hôte est lu **au clic** et jamais au rendu : le serveur n'a pas de
          `window`, et le lire pendant le rendu donnerait deux réponses, donc
          l'écart d'hydratation que ce produit évite partout. En développement,
          un hôte sans point n'a pas d'apex : la racine est alors une
          navigation interne, donc l'affaire du routeur.
        */}
        <button
          type="button"
          onClick={() => {
            const hote = window.location.hostname;
            if (!hote.includes(".") || hote.endsWith("localhost")) {
              router.push("/");
              return;
            }
            const apex = hote.split(".").slice(-2).join(".");
            window.location.href = `${window.location.protocol}//${apex}/`;
          }}
          aria-label="Revenir au portail"
          title="Revenir au portail"
          className={cn(
            HEADER_BUTTON,
            "hidden size-9 rounded-xl sm:flex [&_svg]:size-[18px]",
          )}
        >
          <LayoutGridIcon />
        </button>
        <Link
          href="/dashboard"
          aria-label={`${WORKSPACE.name} — tableau de bord`}
          title={WORKSPACE.tagline}
          className="focus-visible:ring-ring rounded-md focus-visible:ring-2 focus-visible:outline-none"
        >
          <BrandText className="text-[14px] md:text-[17px]" />
        </Link>
      </div>

      <div className="min-w-0 flex-1">{children}</div>

      <div className="flex shrink-0 items-center gap-2 md:gap-2.5">
        {/* Sur un écran large, la recherche vit dans la colonne ; ce
            déclencheur-ci ne sert que là où elle n'est pas — sur un téléphone,
            où la colonne est un tiroir, et dans les réglages, dont la colonne
            ne la porte pas. */}
        <CommandSearch className={inSettings ? undefined : "md:hidden"} />

        {/*
          Une barre pour trois gestes : un contour commun, un fond de carte,
          une ombre à peine posée. Elle se lit comme un seul objet à côté de
          l'avatar, au lieu de trois boîtes alignées.
        */}
        <div className="bg-card ring-border/70 flex items-center gap-0.5 rounded-full p-1 shadow-xs ring-1">
          <NotificationsMenu buttonClassName={HEADER_BUTTON} />
          <DemoMenu buttonClassName={HEADER_BUTTON} />
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
            aria-current={inSettings ? "page" : undefined}
            className={cn(HEADER_BUTTON, inSettings && "bg-muted text-foreground")}
          >
            <SettingsIcon />
          </Link>
        </div>

        <AccountMenu />
      </div>
    </header>
  );
}
