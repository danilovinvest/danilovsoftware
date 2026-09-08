"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, SearchIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/shared/ui/feedback";
import { listCustomers } from "../lib/api";
import { useDebounced } from "../hooks/use-customers";
import type { CustomerListItem } from "../lib/types";

/**
 * Choisir une fiche client, par la recherche.
 *
 * Pas une liste déroulante : trois cent soixante-six fiches n'entrent pas dans
 * un `<select>`, et l'on ne retrouve pas « Le Faucheur » en faisant défiler.
 * On tape deux lettres, le serveur répond, on choisit.
 *
 * La sélection s'affiche comme une pastille qu'on retire d'un clic — le champ
 * ne redevient une recherche que lorsqu'on a effacé le choix, sinon on ne
 * saurait plus si ce qui est écrit est un choix ou une recherche en cours.
 */
export function CustomerPicker({
  label,
  value,
  valueName,
  onChange,
  hint,
}: {
  label: string;
  /** Identifiant choisi, nul quand rien n'est rattaché. */
  value: string | null;
  /** Nom déjà connu, pour l'afficher sans interroger le serveur. */
  valueName?: string;
  onChange: (id: string | null, name: string) => void;
  hint?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  /**
   * La réponse **et la question qui l'a produite**.
   *
   * Garder les seuls résultats obligerait à les effacer dès que la saisie
   * change, donc à écrire dans l'état pendant un effet — et à afficher une
   * fraction de seconde la réponse d'une recherche précédente sous une frappe
   * plus récente. La question voyage avec sa réponse : ce qui ne correspond
   * plus à ce qu'on tape n'est simplement pas affiché.
   */
  const [resultat, setResultat] = useState<{
    pour: string;
    items: CustomerListItem[];
  } | null>(null);
  const bloc = useRef<HTMLDivElement>(null);
  const cherche = useDebounced(query).trim();

  const items = resultat?.pour === cherche ? resultat.items : null;

  useEffect(() => {
    if (cherche.length < 2) return;
    const controller = new AbortController();
    listCustomers(
      { search: cherche, sort: "name", page: 1, per_page: 8 },
      controller.signal,
    )
      .then((page) => setResultat({ pour: cherche, items: page.items }))
      .catch(() => {
        if (!controller.signal.aborted) setResultat({ pour: cherche, items: [] });
      });
    return () => controller.abort();
  }, [cherche]);

  useEffect(() => {
    if (!open) return;
    function ailleurs(event: MouseEvent) {
      if (!bloc.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", ailleurs);
    return () => document.removeEventListener("mousedown", ailleurs);
  }, [open]);

  if (value) {
    return (
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">{label}</Label>
        <div className="border-input flex h-9 items-center gap-2 rounded-lg border px-3">
          <span className="min-w-0 flex-1 truncate text-sm">
            {valueName || "Fiche rattachée"}
          </span>
          <button
            type="button"
            aria-label="Retirer la fiche"
            onClick={() => {
              onChange(null, "");
              setQuery("");
            }}
            className="text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
        {hint && <p className="text-muted-foreground text-[11px]">{hint}</p>}
      </div>
    );
  }

  const attente = cherche.length >= 2 && items === null;

  return (
    <div ref={bloc} className="relative flex flex-col gap-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
        <Input
          value={query}
          placeholder="Chercher un client ou un prospect…"
          className="pl-8"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        {attente && (
          <Spinner className="text-muted-foreground absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2" />
        )}
      </div>
      {hint && <p className="text-muted-foreground text-[11px]">{hint}</p>}

      {open && items !== null && (
        <ul className="bg-popover absolute top-full right-0 left-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border p-1 shadow-lg">
          {items.length === 0 ? (
            <li className="text-muted-foreground px-2 py-3 text-center text-xs">
              Aucune fiche pour « {cherche} »
            </li>
          ) : (
            items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(item.id, item.display_name);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="hover:bg-accent flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">
                      {item.display_name}
                    </span>
                    <span className="text-muted-foreground/70 block truncate text-[11px]">
                      {[item.reference, item.city].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <CheckIcon className="invisible size-3.5" />
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
