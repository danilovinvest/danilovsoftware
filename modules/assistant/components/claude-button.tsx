"use client";

import { useState } from "react";
import { InfoIcon, PencilLineIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ClaudeMark } from "@/shared/ui/brand-marks";
import { cn } from "@/lib/utils";
import type { ClaudeContext } from "../lib/contexts";

/**
 * « Demander à Claude », là où un écran a de quoi lui confier.
 *
 * **L'assistant n'est pas encore branché, et le panneau le dit.** Le bouton
 * existe pour montrer où Claude interviendra et avec quoi : ce qu'il recevrait
 * de l'écran, ce qu'on pourrait lui demander, et ce que chaque demande
 * modifierait. Rien ne quitte le navigateur, et « Envoyer » reste désactivé —
 * un bouton qui ferait semblant de répondre serait pire que pas de bouton.
 *
 * La couleur est celle de la marque, la seule valeur littérale admise ici :
 * elle désigne un éditeur, pas un état du CRM, et ne suit donc pas le thème.
 */
export function ClaudeButton({
  context,
  size = "sm",
  iconOnly = false,
  className,
}: {
  context: ClaudeContext;
  size?: "sm" | "xs";
  /** Le logo seul, pour une ligne de liste où le libellé ne tient pas. */
  iconOnly?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={iconOnly ? (size === "xs" ? "icon-xs" : "icon-sm") : size}
        className={cn("hover:border-[#d97757]/50 hover:bg-[#d97757]/10", className)}
        title={`Demander à Claude — ${context.subject}`}
        aria-label={`Demander à Claude — ${context.subject}`}
        onClick={(event) => {
          // Un bouton posé dans une ligne cliquable ne doit pas l'ouvrir aussi.
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <ClaudeMark className="size-3.5 text-[#d97757]" />
        {!iconOnly && "Claude"}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
          {/* Le brouillon repart à zéro à chaque ouverture. */}
          {open && <ClaudePanel context={context} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

function ClaudePanel({ context }: { context: ClaudeContext }) {
  const [draft, setDraft] = useState("");
  const [picked, setPicked] = useState<string | null>(null);

  return (
    <>
      <SheetHeader className="gap-2 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#d97757]/12">
            <ClaudeMark className="size-5 text-[#d97757]" />
          </span>
          <div className="min-w-0">
            <SheetTitle className="flex items-center gap-2 text-base">
              Demander à Claude
              <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                Aperçu
              </span>
            </SheetTitle>
            <SheetDescription className="truncate text-sm">{context.subject}</SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <div className="flex flex-col gap-5 px-4 pb-6">
        <p className="bg-info-soft text-info flex items-start gap-2 rounded-lg px-3 py-2 text-xs">
          <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
          <span>
            L&apos;assistant n&apos;est pas encore branché : ce panneau montre ce
            que Claude recevrait et ce qu&apos;il pourrait faire. Rien n&apos;est
            envoyé.
          </span>
        </p>

        <section>
          <h3 className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wide uppercase">
            Ce que Claude recevrait
          </h3>
          <ul className="flex flex-col gap-1.5">
            {context.items.map((item) => (
              <li key={item.label} className="flex gap-2 text-sm">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#d97757]" />
                <span className="min-w-0">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-muted-foreground"> — {item.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wide uppercase">
            Ce qu&apos;il pourrait faire
          </h3>
          <div className="flex flex-col gap-2">
            {context.prompts.map((prompt) => (
              <button
                key={prompt.label}
                type="button"
                onClick={() => {
                  setPicked(prompt.label);
                  setDraft(prompt.label);
                }}
                className={cn(
                  "hover:bg-muted/50 flex flex-col gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors",
                  picked === prompt.label && "border-[#d97757]/60 bg-[#d97757]/5",
                )}
              >
                <span className="text-sm font-medium">{prompt.label}</span>
                <span className="text-muted-foreground text-xs">{prompt.detail}</span>
                {prompt.writes && (
                  <span className="text-warning mt-1 flex items-center gap-1 text-[11px] font-medium">
                    <PencilLineIcon className="size-3" />
                    Modifierait : {prompt.writes}, après votre validation
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ou posez votre question…"
            rows={3}
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-muted-foreground/70 text-[11px]">
              Bientôt, avec les droits de votre compte.
            </p>
            <Button size="sm" disabled title="L'assistant n'est pas encore branché">
              <ClaudeMark className="size-3.5" />
              Envoyer
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
