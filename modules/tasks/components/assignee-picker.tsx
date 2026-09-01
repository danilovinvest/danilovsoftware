"use client";

import { useState } from "react";
import { UserIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { initials } from "@/shared/lib/format";
import type { Colleague } from "../lib/types";

/** Pastille d'assigné, cliquable pour réattribuer sans ouvrir la tâche. */
export function AssigneePicker({
  assigneeId,
  assigneeName,
  colleagues,
  disabled,
  onChange,
}: {
  assigneeId: string | null;
  assigneeName: string;
  colleagues: Colleague[];
  disabled?: boolean;
  onChange: (assigneeId: string | null) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  const trigger = (
    <span
      title={assigneeName || "Non assignée"}
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-full text-[0.65rem] font-semibold",
        assigneeName
          ? "bg-accent text-accent-foreground"
          : "border-input text-muted-foreground border border-dashed",
      )}
    >
      {assigneeName ? initials(assigneeName) : <UserIcon className="size-3" />}
    </span>
  );

  if (disabled) return trigger;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={assigneeName ? `Assignée à ${assigneeName}` : "Assigner la tâche"}
          onClick={(event) => event.stopPropagation()}
          // Le bouton vit dans une carte déplaçable : sans cela, le premier
          // mouvement de souris démarrerait un glisser au lieu d'ouvrir le menu.
          onPointerDown={(event) => event.stopPropagation()}
        >
          {trigger}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs">Assigner à</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {colleagues.map((colleague) => (
          <DropdownMenuItem
            key={colleague.id}
            onSelect={() => void onChange(colleague.id)}
            className={cn(colleague.id === assigneeId && "bg-accent")}
          >
            <Avatar className="size-5">
              <AvatarFallback className="text-[0.6rem]">
                {initials(colleague.name)}
              </AvatarFallback>
            </Avatar>
            {colleague.name || "Sans nom"}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void onChange(null)}>
          <UserIcon />
          Retirer l&apos;assignation
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
