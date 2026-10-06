"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatPhone } from "@/shared/lib/format";
import { useAction } from "../hooks/use-customers";
import { setContactBuildings } from "../lib/syndic-api";
import type { BuildingRef, Gestionnaire } from "../lib/syndic-types";
import { appHref } from "@/shared/lib/routes";

/**
 * Les gestionnaires d'un cabinet, et les immeubles dont chacun a la charge.
 *
 * Une gestionnaire est un interlocuteur du syndic, pas une fiche : Mme Reynaud
 * chez OXIA suit Le Marot et Chabaud. La dire ici fait deux choses — on sait
 * qui appeler pour un immeuble, et la copropriété montre qui la suit.
 */
export function PortfolioHandlers({
  gestionnaires,
  buildings,
  canWrite,
  onChanged,
}: {
  gestionnaires: Gestionnaire[];
  /** Les immeubles du portefeuille : ceux qu'un interlocuteur peut suivre. */
  buildings: BuildingRef[];
  canWrite: boolean;
  onChanged: () => void;
}) {
  if (gestionnaires.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Aucun interlocuteur sur cette fiche. Ajoutez les gestionnaires dans l&apos;onglet Fiche, puis
        dites ici quels immeubles chacun suit.
      </p>
    );
  }
  return (
    <ul className="divide-y rounded-xl border" data-demo="portfolio-handlers">
      {gestionnaires.map((person) => (
        <li key={person.contact_id} className="flex flex-wrap items-start gap-x-4 gap-y-1 px-3 py-2 text-sm">
          <div className="min-w-40">
            <div className="font-medium">{person.full_name}</div>
            <div className="text-muted-foreground text-xs">
              {[person.role_label, person.email, person.phone && formatPhone(person.phone)]
                .filter(Boolean)
                .join(" · ") || "sans coordonnée"}
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap gap-x-3 gap-y-1 text-xs">
            {person.buildings.length === 0 ? (
              <span className="text-muted-foreground">aucun immeuble désigné</span>
            ) : (
              person.buildings.map((building) => (
                <Link key={building.id} href={appHref(`/customers/${building.id}`)} className="hover:underline">
                  {building.name}
                </Link>
              ))
            )}
          </div>
          {canWrite && buildings.length > 0 && (
            <BuildingsButton person={person} buildings={buildings} onChanged={onChanged} />
          )}
        </li>
      ))}
    </ul>
  );
}

/** Les immeubles d'un interlocuteur, cochés parmi ceux du portefeuille. */
function BuildingsButton({
  person,
  buildings,
  onChanged,
}: {
  person: Gestionnaire;
  buildings: BuildingRef[];
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="xs" variant="outline" aria-label={`Immeubles suivis par ${person.full_name}`}>
          Immeubles…
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        {open && (
          <BuildingsForm
            person={person}
            buildings={buildings}
            onSaved={() => {
              setOpen(false);
              onChanged();
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

function BuildingsForm({
  person,
  buildings,
  onSaved,
}: {
  person: Gestionnaire;
  buildings: BuildingRef[];
  onSaved: () => void;
}) {
  const [chosen, setChosen] = useState<string[]>(() => person.buildings.map((b) => b.id));
  const save = useAction(setContactBuildings);
  /*
    Un immeuble déjà suivi mais sorti du portefeuille affiché (un ancien mandat
    hors périmètre) reste dans la liste : la route remplace la liste entière, et
    l'omettre le retirerait sans que personne l'ait décoché.
  */
  const options = [
    ...buildings,
    ...person.buildings.filter((b) => !buildings.some((known) => known.id === b.id)),
  ];

  function toggle(id: string, on: boolean) {
    setChosen((current) => (on ? [...current, id] : current.filter((other) => other !== id)));
  }

  async function submit() {
    const saved = await save.run(person.contact_id, chosen);
    if (saved !== null) onSaved();
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">Immeubles suivis par {person.full_name}</p>
      <ul className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
        {options.map((building) => (
          <li key={building.id}>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={chosen.includes(building.id)}
                onCheckedChange={(state) => toggle(building.id, state === true)}
              />
              <span className="min-w-0 truncate">{building.name}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="flex justify-end">
        <Button size="sm" disabled={save.pending} onClick={() => void submit()}>
          {save.pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}
