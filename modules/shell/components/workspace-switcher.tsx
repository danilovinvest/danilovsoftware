"use client";

import { ExternalLinkIcon, LayoutGridIcon } from "lucide-react";
import { useAuth } from "@/modules/auth";
import { chooseScope, SCOPES, scopeLocked, useScope, type Scope } from "@/modules/group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { openExternal } from "@/shared/desktop/links";
import { webUrl } from "@/shared/lib/env";
import { cn } from "@/lib/utils";

/**
 * Sur quelle société travaille-t-on : le geste qui remplace le portail.
 *
 * Sur le web, on choisissait sa société en choisissant son adresse —
 * `groupe.…` ou `structure.…` — depuis le portail. L'application n'a qu'une
 * fenêtre et pas d'adresse : le choix se fait ici, à la même place que le
 * bouton de retour au portail, et le poste le retient.
 *
 * **Seul un compte qui voit tout le groupe choisit.** Un compte lié à sa
 * société n'a rien à choisir — le serveur l'impose — et le menu ne lui offre
 * que le portail : proposer l'autre société serait promettre un écran que le
 * serveur remplirait avec la sienne.
 */
export function WorkspaceSwitcher({ className }: { className?: string }) {
  const scope = useScope();
  const { account } = useAuth();
  const locked = scopeLocked(account?.issuer ?? "");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-demo="changer-de-societe"
        aria-label="Changer de société"
        title="Changer de société"
        className={className}
      >
        <LayoutGridIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
          {locked ? "Votre société" : "Travailler pour"}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={scope}
          onValueChange={(value) => chooseScope(value as Scope)}
        >
          {SCOPES.filter((entry) => !locked || entry.id === scope).map((entry) => (
            <DropdownMenuRadioItem
              key={entry.id}
              value={entry.id}
              disabled={locked}
              className="flex flex-col items-start gap-0"
            >
              <span className={cn("font-medium", entry.id === scope && "text-foreground")}>
                {entry.label}
              </span>
              <span className="text-muted-foreground text-xs">{entry.hint}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        {/* Le portail garde ce qui n'est pas le CRM — les applications du
            quotidien, le coffre : il s'ouvre dans le navigateur. */}
        <DropdownMenuItem onSelect={() => void openExternal(webUrl())}>
          <ExternalLinkIcon />
          Ouvrir le portail
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
