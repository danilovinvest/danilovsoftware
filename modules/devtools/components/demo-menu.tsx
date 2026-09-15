"use client";

import { PresentationIcon } from "lucide-react";
import { usePermission } from "@/modules/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from "@/shared/lib/format";
import { DEMOS } from "../lib/demos";
import { startTour } from "../lib/tour";
import { DemoOverlay } from "./demo-overlay";

/**
 * Les démos, depuis l'en-tête.
 *
 * Un outil de développement, réservé à `system:admin` : il sert à montrer ce
 * qui vient d'être livré, pas à travailler. La visite est montée ici plutôt
 * que dans la coque, pour qu'un compte qui ne voit pas le bouton ne charge
 * rien de plus.
 */
export function DemoMenu({ buttonClassName }: { buttonClassName?: string }) {
  const allowed = usePermission("system:admin");
  if (!allowed) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={buttonClassName}
          aria-label="Démos des nouveautés"
          title="Démos des nouveautés"
        >
          <PresentationIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="text-xs">
            Ce qui a changé — la zone s&apos;éclaire à l&apos;écran
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {DEMOS.map((demo) => (
            <DropdownMenuItem
              key={demo.id}
              className="flex flex-col items-start gap-0.5"
              onSelect={() => startTour(demo.id)}
            >
              <span className="text-sm font-medium">{demo.title}</span>
              <span className="text-muted-foreground text-[11px]">
                {formatDate(demo.date)} · {demo.steps.length} étape
                {demo.steps.length > 1 ? "s" : ""}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <DemoOverlay />
    </>
  );
}
