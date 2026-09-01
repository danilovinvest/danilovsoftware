"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDownIcon,
  EllipsisVerticalIcon,
  LogOutIcon,
  MoonIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UserPlusIcon,
} from "lucide-react";
import { useAuth, usePermission } from "@/modules/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { initials } from "@/shared/lib/format";
import { WORKSPACE } from "@/shared/lib/workspace";

/**
 * Le sélecteur d'espace de travail, en haut de la barre latérale.
 *
 * Twenty ne met pas le compte connecté en pied de barre : l'identité de
 * l'espace et celle de l'utilisateur partagent un seul menu, tout en haut. La
 * première ligne reprend l'espace, et son « ⋮ » ouvre ce qui touche au compte
 * — dont la déconnexion, qui reste par ailleurs accessible dans les réglages.
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
              <WorkspaceChip />
              <span className="truncate">{WORKSPACE.name}</span>
              <ChevronDownIcon className="text-muted-foreground ml-auto size-3.5!" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-64 rounded-lg"
            side="bottom"
            align="start"
            sideOffset={4}
          >
            <DropdownMenuSub>
              {/* Le chevron que shadcn ajoute d'office ferait doublon avec le
                  « ⋮ » : on le masque plutôt que de réécrire la primitive. */}
              <DropdownMenuSubTrigger className="gap-2 [&>svg:last-child]:hidden">
                <WorkspaceChip />
                <span className="truncate font-medium">{WORKSPACE.name}</span>
                <EllipsisVerticalIcon className="text-muted-foreground ml-auto size-3.5!" />
              </DropdownMenuSubTrigger>

              <DropdownMenuSubContent className="w-60">
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left">
                    <span
                      aria-hidden
                      className="bg-muted text-foreground flex size-8 shrink-0 items-center justify-center rounded-[4px] text-xs font-semibold"
                    >
                      {initials(name)}
                    </span>
                    <div className="grid min-w-0 flex-1 leading-tight">
                      <span className="truncate text-sm font-medium">{name}</span>
                      <span className="text-muted-foreground truncate text-xs">
                        {account.email}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <ShieldCheckIcon />
                  {account.role_name} · {account.permissions.length} permissions
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
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />

            {/* Le thème est figé en clair par décision d'architecture (voir
                app/globals.css) : la ligne informe, elle ne bascule rien. */}
            <DropdownMenuItem disabled>
              <MoonIcon />
              Thème
              <span className="text-muted-foreground ml-auto">Clair</span>
            </DropdownMenuItem>

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
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

/** La pastille carrée de l'espace, reprise à l'identique dans le sous-menu. */
function WorkspaceChip() {
  return (
    <span
      aria-hidden
      className="bg-sidebar-primary text-sidebar-primary-foreground flex size-5 shrink-0 items-center justify-center rounded-[4px] text-[11px] font-semibold"
    >
      {WORKSPACE.initial}
    </span>
  );
}
