"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MAIL_SHORTCUTS } from "../hooks/use-mail-keyboard";

/** L'aide des raccourcis, ouverte par `?` ou par le bouton de l'en-tête. */
export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Raccourcis clavier</DialogTitle>
          <DialogDescription>
            Ils ne s&apos;appliquent jamais pendant une saisie.
          </DialogDescription>
        </DialogHeader>
        <dl className="flex flex-col gap-2 text-sm">
          {MAIL_SHORTCUTS.map((entry) => (
            <div key={entry.label} className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">{entry.label}</dt>
              <dd className="flex shrink-0 gap-1">
                {entry.keys.map((key) => (
                  <kbd key={key} className="bg-muted rounded border px-1.5 py-0.5 font-mono text-[11px]">
                    {key}
                  </kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
