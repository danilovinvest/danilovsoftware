"use client";

import { useRouter } from "next/navigation";
import { ChevronDownIcon, LogOutIcon, ShieldCheckIcon } from "lucide-react";
import { ROLE_LABELS, useAuth } from "@/modules/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { initials } from "@/shared/lib/format";

/**
 * Le sélecteur d'espace de travail, en haut de la barre latérale.
 *
 * Twenty ne met pas le compte connecté en pied de barre : l'identité de
 * l'espace et celle de l'utilisateur partagent un seul menu, tout en haut.
 * C'est ce menu qui porte la déconnexion.
 */
export function WorkspaceMenu() {
  const { account, logout } = useAuth();
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
              className="h-8 gap-2 px-1.5 font-medium text-foreground data-[state=open]:bg-sidebar-accent"
              tooltip="Danilov"
            >
              <span
                aria-hidden
                className="bg-sidebar-primary text-sidebar-primary-foreground flex size-5 shrink-0 items-center justify-center rounded-[4px] text-[11px] font-semibold"
              >
                D
              </span>
              <span className="truncate">Danilov</span>
              <ChevronDownIcon className="text-muted-foreground ml-auto size-3.5!" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-64 rounded-lg"
            side="bottom"
            align="start"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left">
                <span
                  aria-hidden
                  className="bg-muted text-foreground flex size-8 shrink-0 items-center justify-center rounded-[4px] text-xs font-semibold"
                >
                  {initials(name)}
                </span>
                <div className="grid flex-1 leading-tight">
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
              {ROLE_LABELS[account.role]} · {account.permissions.length}{" "}
              permissions
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
