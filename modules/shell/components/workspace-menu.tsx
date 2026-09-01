"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDownIcon,
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
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { GradientAvatar } from "@/shared/ui/gradient-avatar";
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
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              className="text-foreground data-[state=open]:bg-sidebar-accent h-8 gap-2 px-1.5 font-medium"
              tooltip={WORKSPACE.name}
            >
              <span
                aria-hidden
                className="bg-sidebar-primary text-sidebar-primary-foreground flex size-5 shrink-0 items-center justify-center rounded-[4px] text-[11px] font-semibold"
              >
                {WORKSPACE.initial}
              </span>
              <span className="truncate">{WORKSPACE.name}</span>
              <ChevronDownIcon className="text-muted-foreground ml-auto size-3.5!" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-64 rounded-lg p-1"
            side="bottom"
            align="start"
            sideOffset={4}
          >
            {/* En-tête : qui est connecté, pas où l'on est. Le nom de l'espace
                est déjà sur le déclencheur juste au-dessus. */}
            <div className="flex items-center gap-2 px-1.5 py-1.5">
              <GradientAvatar seed={account.email} text={initials(name)} size={32} />
              <div className="grid min-w-0 flex-1 leading-tight">
                <span className="truncate text-sm font-medium">{name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {account.email}
                </span>
              </div>
            </div>

            <DropdownMenuSeparator />

            <ThemePicker />

            <DropdownMenuSeparator />

            {canInvite && (
              <DropdownMenuItem asChild>
                <Link href="/settings/membres">
                  <UserPlusIcon />
                  Inviter un utilisateur
                </Link>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem asChild>
              <Link href="/settings">
                <SettingsIcon />
                Paramètres
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onSelect={async () => {
                await logout();
                router.replace("/login");
              }}
            >
              <LogOutIcon />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
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
    <div className="px-1.5 py-1.5">
      <p className="text-muted-foreground mb-1.5 text-[11px] font-medium">Thème</p>
      <div className="grid grid-cols-3 gap-1">
        {THEMES.map(({ value, label, Icon }) => {
          const selected = theme === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              onClick={() => setPreferences({ theme: value })}
              className={cn(
                "flex flex-col items-center gap-1 rounded-[4px] border px-1 py-1.5 text-[11px] transition-colors",
                selected
                  ? "border-brand text-foreground bg-accent"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
