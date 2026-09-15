"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorNotice } from "@/shared/ui/feedback";
import { cn } from "@/lib/utils";
import * as api from "../lib/api";
import { QUOTE_ISSUER } from "../lib/labels";
import { useAction } from "../hooks/use-customers";
import type { Project, Quote } from "../lib/types";

type Choice = "ompt-structure" | "ompt-groupe" | "";

/**
 * Changer la société d'une affaire.
 *
 * Une affaire classée GROUPE qui est en réalité une étude de STRUCTURE partait
 * sur le mauvais cycle, dans la mauvaise liste, avec la mauvaise société sur ses
 * devis — et rien ne permettait de la déplacer. La société de l'affaire devient
 * un choix, qui l'emporte sur ce que disent les devis.
 *
 * **Les devis suivent si on le demande**, et c'est coché par défaut : c'est le
 * devis qui porte le SIREN et la TVA, et une affaire de STRUCTURE dont les devis
 * restent émis par GROUPE serait fausse sur la facture. Une référence déjà prise
 * dans l'autre société — les deux numérotent chacune de leur côté — est refusée
 * par le serveur, qui la nomme, sans rien écrire.
 */
export function ProjectIssuerDialog({
  project,
  quotes,
  open,
  onOpenChange,
  onSaved,
}: {
  project: Project;
  quotes: Quote[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [choice, setChoice] = useState<Choice>((project.issuer as Choice) ?? "");
  const [reassign, setReassign] = useState(true);
  const save = useAction(() =>
    api.setProjectIssuer(project.id, {
      issuer: choice === "" ? null : choice,
      reassign_quotes: choice !== "" && reassign,
    }),
  );
  const moving = choice === "" ? [] : quotes.filter((quote) => quote.issuer !== choice);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Société de l&apos;affaire</DialogTitle>
          <DialogDescription>
            Elle décide du cycle (étude ou chantier), des listes où l&apos;affaire apparaît et
            du rangement de ses documents.
          </DialogDescription>
        </DialogHeader>

        {save.error && <ErrorNotice message={save.error} />}

        <div className="flex flex-col gap-2">
          {(
            [
              ["ompt-structure", "OMPT STRUCTURE", "Bureau d'études : étude, rapport, sondage"],
              ["ompt-groupe", "OMPT GROUPE", "Travaux : chantier, matériaux"],
              ["", "Déduite des devis", "Comme avant : la société se lit sur les devis de l'affaire"],
            ] as Array<[Choice, string, string]>
          ).map(([value, label, hint]) => (
            <button
              key={value || "deduite"}
              type="button"
              onClick={() => setChoice(value)}
              className={cn(
                "flex flex-col rounded-lg border px-3 py-2 text-left transition-colors",
                choice === value ? "border-primary bg-primary/5" : "hover:bg-muted/50",
              )}
            >
              <span className="text-sm font-medium">{label}</span>
              <span className="text-muted-foreground text-xs">{hint}</span>
            </button>
          ))}
        </div>

        {moving.length > 0 && (
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm">
            <Checkbox
              checked={reassign}
              onCheckedChange={(value) => setReassign(value === true)}
              className="mt-0.5"
            />
            <span>
              Émettre aussi ses {moving.length} devis au nom de{" "}
              {QUOTE_ISSUER[choice]?.label ?? choice}
              <span className="text-muted-foreground block text-xs">
                {moving.map((quote) => quote.reference || quote.label).join(", ")} — c&apos;est le
                devis qui porte le SIREN et la TVA.
              </span>
            </span>
          </label>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            disabled={save.pending || (choice === (project.issuer ?? "") && moving.length === 0)}
            onClick={async () => {
              if ((await save.run()) === null) return;
              onOpenChange(false);
              onSaved();
            }}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
