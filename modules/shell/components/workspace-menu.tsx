"use client";

import { useRouter } from "next/navigation";
import {
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  SunIcon,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/modules/auth";
import { setPreferences, usePreferences, type ThemeChoice } from "@/modules/settings";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GradientAvatar } from "@/shared/ui/gradient-avatar";
import { initials } from "@/shared/lib/format";
import { cn } from "@/lib/utils";

const THEMES: Array<{ value: ThemeChoice; label: string; Icon: LucideIcon }> = [
  { value: "light", label: "Clair", Icon: SunIcon },
  { value: "dark", label: "Sombre", Icon: MoonIcon },
  { value: "system", label: "Système", Icon: MonitorIcon },
];

/**
 * Le menu du compte, à droite de l'en-tête.
 *
 * Il ne porte plus que ce qui concerne la personne — son thème, sa sortie.
 * Inviter et les paramètres ont chacun leur bouton dans l'en-tête : cachés
 * derrière l'avatar, on ne les trouvait qu'en ouvrant le menu pour autre chose.
 *
 * Un seul panneau, sans sous-menu : le compte, le thème et les raccourcis
 * tiennent dans la même colonne. Ouvrir un second volet à côté obligeait à
 * viser deux fois pour une action d'un clic, et le choix du thème — le
 * réglage qu'on change le plus souvent — s'y trouvait enterré.
 */
export function AccountMenu() {
  const { account, logout } = useAuth();
  const router = useRouter();

  // Le shell est monté sous RequireAuth ; ce garde-fou couvre l'instant de
  // reconstruction de session, pas un cas nominal.
  if (!account) return null;

  const name =
    [account.first_name, account.last_name].filter(Boolean).join(" ") ||
    account.email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* L'avatar est le compte, et il se range à droite de l'en-tête : c'est
            là qu'on le cherche dans toute application. Le dégradé naît de
            l'adresse, si bien que chacun reconnaît le sien sans photo. */}
        <button
          type="button"
          aria-label={`Compte de ${name}`}
          title={name}
          className="focus-visible:ring-ring shrink-0 rounded-full transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none data-[state=open]:opacity-90"
        >
          <GradientAvatar
            seed={account.email}
            text={initials(name)}
            size={40}
            rounded={20}
          />
        </button>
      </DropdownMenuTrigger>

        <DropdownMenuContent
          className="w-68 overflow-hidden rounded-xl p-0"
          side="bottom"
          align="end"
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
