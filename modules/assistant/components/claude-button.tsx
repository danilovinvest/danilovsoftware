"use client";

import { MessageSquarePlusIcon, PencilLineIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClaudeMark } from "@/shared/ui/brand-marks";
import { MENU_ITEM, MENU_LABEL, MenuAction } from "@/shared/ui/menu-action";
import { cn } from "@/lib/utils";
import { buildPrompt, claudeLinks } from "../lib/claude-link";
import type { ClaudeContext, ClaudePrompt } from "../lib/contexts";
import { openInClaude } from "../lib/open-claude";

/**
 * « Demander à Claude », là où un écran a de quoi lui confier.
 *
 * Le bouton ouvre un menu : les demandes que l'écran suggère, puis « Ouvrir
 * dans Claude ». Chacune ouvre **l'application Claude** sur une conversation
 * neuve, la demande déjà écrite — c'est Claude qui lit ensuite le CRM, par le
 * connecteur MCP de la personne et avec ses droits. Le CRM n'envoie rien
 * lui-même : il écrit la demande, l'appareil ouvre l'application.
 *
 * La couleur est celle de la marque, la seule valeur littérale admise ici :
 * elle désigne un éditeur, pas un état du CRM, et ne suit donc pas le thème.
 */
export function ClaudeButton({
  context,
  size = "sm",
  iconOnly = false,
  className,
  demo,
}: {
  context: ClaudeContext;
  size?: "sm" | "xs";
  /** Le logo seul, pour une ligne de liste où le libellé ne tient pas. */
  iconOnly?: boolean;
  className?: string;
  /** Le repère des démos (`data-demo`), posé sur le bouton. */
  demo?: string;
}) {
  const open = (demand?: ClaudePrompt) => openInClaude(claudeLinks(buildPrompt(context, demand)));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={iconOnly ? (size === "xs" ? "icon-xs" : "icon-sm") : size}
          className={cn("hover:border-[#d97757]/50 hover:bg-[#d97757]/10", className)}
          title={`Demander à Claude — ${context.subject}`}
          aria-label={`Demander à Claude — ${context.subject}`}
          data-demo={demo}
          // Un bouton posé dans une ligne cliquable ne doit pas l'ouvrir aussi.
          onClick={(event) => event.stopPropagation()}
        >
          <ClaudeMark className="size-3.5 text-[#d97757]" />
          {!iconOnly && "Claude"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 p-1.5"
        data-demo="claude-menu"
        // Le menu vit dans un portail, mais React fait remonter ses clics
        // jusqu'à la ligne qui porte le bouton.
        onClick={(event) => event.stopPropagation()}
      >
        <DropdownMenuLabel className={cn(MENU_LABEL, "flex items-center gap-1.5")}>
          <ClaudeMark className="size-3 text-[#d97757]" />
          <span className="truncate">{context.subject}</span>
        </DropdownMenuLabel>
        {context.prompts.map((prompt) => (
          <DropdownMenuItem key={prompt.label} className={MENU_ITEM} onSelect={() => open(prompt)}>
            <MenuAction
              icon={<SparklesIcon />}
              label={prompt.label}
              hint={prompt.writes ? `${prompt.detail} Modifierait : ${prompt.writes}, après votre validation.` : prompt.detail}
              trailing={prompt.writes ? <PencilLineIcon className="text-warning size-3" aria-label="Écrit dans le CRM" /> : undefined}
            />
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="my-1.5" />
        <DropdownMenuItem className={MENU_ITEM} onSelect={() => open()} data-demo="claude-open">
          <MenuAction
            icon={<MessageSquarePlusIcon />}
            label="Ouvrir dans Claude"
            hint="Une conversation neuve sur cet écran, sans demande : vous posez la question."
          />
        </DropdownMenuItem>
        <p className="text-muted-foreground px-2 pt-1.5 pb-1 text-[11px] leading-snug">
          Claude lira {context.items.map((item) => item.label.toLowerCase()).join(", ")} par votre
          connecteur CRM (Réglages → Assistant), avec les droits de votre compte.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
