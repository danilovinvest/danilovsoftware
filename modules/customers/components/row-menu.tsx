"use client";

import type { ReactNode } from "react";
import { EllipsisIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Le « … » d'une ligne : la corriger, la supprimer.
 *
 * Les lignes de la fiche — un devis, un échange de l'historique, un
 * interlocuteur, un virement, une preuve — portaient une corbeille à côté d'un
 * crayon, à portée d'un clic raté. Supprimer passe désormais par ce menu, et
 * reste confirmé par `askConfirm` chez l'appelant : c'est lui qui sait ce que
 * la suppression emporte. Le menu ne décide de rien, il range.
 */
export function RowMenu({
  label,
  demo,
  disabled,
  onEdit,
  editLabel = "Modifier…",
  onDelete,
  deleteLabel = "Supprimer…",
  children,
}: {
  /** Ce que le bouton désigne, pour un lecteur d'écran : « Actions sur le devis DE2026-0009 ». */
  label: string;
  demo?: string;
  disabled?: boolean;
  onEdit?: () => void;
  editLabel?: string;
  /** Ouvre la confirmation ; absent, l'entrée ne s'affiche pas. */
  onDelete?: () => void;
  deleteLabel?: string;
  /** Des gestes propres à la ligne, rangés entre corriger et supprimer. */
  children?: ReactNode;
}) {
  if (!onEdit && !onDelete && !children) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon-xs"
          variant="ghost"
          className="text-muted-foreground hover:text-foreground shrink-0"
          aria-label={label}
          data-demo={demo}
          disabled={disabled}
        >
          <EllipsisIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {onEdit && (
          <DropdownMenuItem onSelect={onEdit}>
            <PencilIcon />
            {editLabel}
          </DropdownMenuItem>
        )}
        {children}
        {(onEdit || children) && onDelete && <DropdownMenuSeparator />}
        {onDelete && (
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2Icon />
            {deleteLabel}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
