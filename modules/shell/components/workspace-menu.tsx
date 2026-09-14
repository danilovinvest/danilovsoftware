"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  EllipsisIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  SettingsIcon,
  SunIcon,
  UserPlusIcon,
  type LucideIcon,
} from "lucide-react";
import { useAuth, usePermission } from "@/modules/auth";
import { setPreferences, usePreferences, type ThemeChoice } from "@/modules/settings";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GradientAvatar } from "@/shared/ui/gradient-avatar";
import { LogoTile } from "@/shared/ui/logo";
import { initials } from "@/shared/lib/format";
import { WORKSPACE } from "@/shared/lib/workspace";
import { cn } from "@/lib/utils";

const THEMES: Array<{ value: ThemeChoice; label: string; Icon: LucideIcon }> = [
  { value: "light", label: "Clair", Icon: SunIcon },
  { value: "dark", label: "Sombre", Icon: MoonIcon },
  { value: "system", label: "Système", Icon: MonitorIcon },
];

/**
 * Le menu de l'espace de travail, en haut de la barre latérale.
 *
 * Un seul panneau, sans sous-menu : le compte, le thème et les raccourcis
 * tiennent dans la même colonne. Ouvrir un second volet à côté obligeait à
 * viser deux fois pour une action d'un clic, et le choix du thème — le
 * réglage qu'on change le plus souvent — s'y trouvait enterré.
 */
export function WorkspaceMenu() {
  const { account, logout } = useAuth();
  const canInvite = usePermission("users:write");
  const router = useRouter();

  // Le shell est monté sous RequireAuth ; ce garde-fou couvre l'instant de
  // reconstruction de session, pas un cas nominal.
  if (!account) return null;

  const name =
    [account.first_name, account.last_name].filter(Boolean).join(" ") ||
    account.email;

  return (
    /*
      Deux ronds côte à côte : le menu, puis la marque.

      Le nom écrit a quitté l'en-tête. La pastille signe déjà l'entreprise, et
      le sélecteur de périmètre juste en dessous dit pour laquelle des deux on
      travaille — un troisième libellé répétait ce que les deux autres disent.
      Le menu vient en premier parce que c'est lui qu'on vise : la marque ne
      s'ouvre pas.
    */
    <div className="flex items-center gap-2 px-0.5 pt-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Compte, thème et paramètres"
            title={`${WORKSPACE.name} — ${name}`}
            className="bg-card/70 hover:bg-card data-[state=open]:bg-card text-foreground/70 hover:text-foreground focus-visible:ring-ring flex size-10 shrink-0 items-center justify-center rounded-full shadow-xs transition-colors focus-visible:ring-2 focus-visible:outline-none group-data-[collapsible=icon]:size-8"
          >
            <EllipsisIcon className="size-4" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className="w-68 overflow-hidden rounded-xl p-0"
          side="bottom"
          align="start"
          sideOffset={6}
        >
          {/*
            L'en-tête sur un fond teinté : c'est la seule zone du menu qui
            parle de la personne, et un aplat la sépare des actions mieux
            qu'un trait. Le dégradé de l'avatar y répond au lieu de flotter
            sur du blanc.
          */}
          <div className="bg-selected flex items-center gap-2.5 px-3 py-3">
            <GradientAvatar
              seed={account.email}
              text={initials(name)}
              size={36}
              rounded={10}
            />
            <div className="grid min-w-0 flex-1 leading-tight">
              <span className="truncate text-sm font-medium">{name}</span>
              <span className="text-muted-foreground truncate text-xs">
                {account.email}
              </span>
            </div>
          </div>

          <div className="p-1.5">
            <ThemePicker />
          </div>

          <DropdownMenuSeparator className="mx-0 my-0" />

          <div className="p-1.5">

            {canInvite && (
              <DropdownMenuItem asChild className="h-8 gap-2.5 rounded-lg px-2">
                <Link href="/settings/membres">
                  {/* Chaque action porte sa pastille : à taille et rayon
                      égaux, la colonne d'icônes s'aligne d'elle-même, et
                      c'est la couleur qui distingue au lieu de la forme. */}
                  <span className="bg-h-grass-3 text-h-grass-11 flex size-6 shrink-0 items-center justify-center rounded-md">
                    <UserPlusIcon className="size-3.5" />
                  </span>
                  Inviter un utilisateur
                </Link>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem asChild className="h-8 gap-2.5 rounded-lg px-2">
              <Link href="/settings">
                <span className="bg-h-slate-3 text-h-slate-11 flex size-6 shrink-0 items-center justify-center rounded-md">
                  <SettingsIcon className="size-3.5" />
                </span>
                Paramètres
              </Link>
            </DropdownMenuItem>
          </div>

          <DropdownMenuSeparator className="mx-0 my-0" />

          <div className="p-1.5">
            <DropdownMenuItem
              className="text-danger focus:text-danger focus:bg-danger-soft h-8 gap-2.5 rounded-lg px-2"
              onSelect={async () => {
                await logout();
                router.replace("/login");
              }}
            >
              <span className="bg-danger-soft flex size-6 shrink-0 items-center justify-center rounded-md">
                <LogOutIcon className="size-3.5" />
              </span>
              Se déconnecter
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      <Link
        href="/dashboard"
        aria-label={`${WORKSPACE.name} — tableau de bord`}
        title={WORKSPACE.tagline}
        className="rounded-full focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none group-data-[collapsible=icon]:hidden"
      >
        <LogoTile className="size-10 rounded-full" />
      </Link>
    </div>
  );
}

/**
 * Sélecteur de thème posé à plat dans le menu.
 *
 * Ce sont des boutons ordinaires, pas des `DropdownMenuItem` : un item Radix
 * referme le menu quand on le choisit, ce qui empêcherait de comparer les
 * trois options. Ici l'interface bascule sous les yeux et le menu reste
 * ouvert.
 */
function ThemePicker() {
  const { theme } = usePreferences();

  return (
    <>
      <p className="text-muted-foreground px-2 pt-0.5 pb-1.5 text-[11px] font-medium">
        Thème
      </p>
      {/*
        Un segmenté plutôt que trois cartes bordées : les bordures dessinaient
        trois boîtes de rayons différents dans un menu qui en a déjà un, et
        c'est l'option choisie qu'on veut voir, pas la grille.
      */}
      <div className="bg-muted flex gap-0.5 rounded-lg p-0.5">
        {THEMES.map(({ value, label, Icon }) => {
          const selected = theme === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              onClick={() => setPreferences({ theme: value })}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-[11px] transition-colors",
                /*
                  Le sélectionné remonte sur le fond de la carte plutôt que de
                  se remplir de la couleur de marque : sur une palette claire —
                  Ambre, Citron — du texte sur le cran 9 tombe sous 1,6 de
                  contraste. Le cran 11 de l'accent, lui, se lit partout.
                */
                selected
                  ? "bg-background text-brand-text font-medium shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          );
        })}
      </div>
    </>
  );
}
