"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorNotice } from "@/shared/ui/feedback";
import { SelectField } from "@/shared/ui/form";
import * as api from "../lib/api";
import { pieceRefText } from "../lib/piece-ref";
import { useAction } from "../hooks/use-customers";
import type { Quote } from "../lib/types";

/** Une affaire où la pièce peut aller : de la même fiche, vivante. */
export type MoveTarget = { id: string; label: string; reference: string };

/**
 * « Déplacer vers une autre affaire… » (29/09).
 *
 * Pharmacie Victoria, Jardin Secret : des sondages et des travaux coincés dans
 * une affaire qui n'était pas la leur, qu'on ne pouvait que supprimer puis
 * ressaisir — virements et document perdus. La pièce change d'affaire, ses
 * virements la suivent, et l'historique des deux affaires le note. Seules les
 * affaires **de la même fiche** sont proposées : changer de client, c'est
 * déplacer l'affaire entière.
 */
export function MoveQuoteDialog({
  quote,
  targets,
  onOpenChange,
  onMoved,
}: {
  quote: Quote | null;
  targets: MoveTarget[];
  onOpenChange: (open: boolean) => void;
  onMoved: () => void;
}) {
  const [target, setTarget] = useState("");
  const move = useAction((id: string, projectId: string) => api.moveQuote(id, projectId), {
    inline: true,
  });
  const nom = quote ? pieceRefText(quote.issuer, quote.reference) || quote.label || "la pièce" : "";

  return (
    <Dialog open={quote !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-demo="quote-move-dialog">
        <DialogHeader>
          <DialogTitle>Déplacer {nom}</DialogTitle>
          <DialogDescription>
            La pièce change d&apos;affaire avec ses virements. L&apos;historique des deux
            affaires garde la trace du déplacement.
          </DialogDescription>
        </DialogHeader>
        {move.error && <ErrorNotice message={move.error} />}
        {targets.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Cette fiche n&apos;a pas d&apos;autre affaire en cours. Créez-la d&apos;abord, puis
            revenez déplacer la pièce.
          </p>
        ) : (
          <SelectField
            label="Affaire d'arrivée"
            options={targets.map((t) => ({
              value: t.id,
              label: t.reference ? `${t.reference} — ${t.label}` : t.label,
            }))}
            value={target}
            onValueChange={setTarget}
            placeholder="Choisir une affaire"
          />
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            disabled={!quote || !target || move.pending}
            onClick={async () => {
              if (!quote || !target) return;
              if ((await move.run(quote.id, target)) === null) return;
              onOpenChange(false);
              onMoved();
            }}
          >
            Déplacer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
