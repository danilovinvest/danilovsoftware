"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { usePermission } from "@/modules/auth";
import { Spinner } from "@/shared/ui/feedback";
import { createCustomer, listCustomers } from "../lib/api";
import { useDebounced } from "../hooks/use-customers";
import type { CustomerListItem, CustomerPayload } from "../lib/types";

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
 *
 * **Et la fiche qui n'existe pas se crée d'ici.** Le secrétariat remplit ce
 * champ *pendant* l'appel : sortir de l'écran pour créer une fiche, puis y
 * revenir et rechercher ce qu'on vient de taper, c'est trois écrans et une
 * question de plus à quelqu'un qui a un client en ligne. Le nom est déjà tapé,
 * il suffit de le confirmer — le reste de la fiche s'écrit après, une fois
 * raccroché.
 */
export function CustomerPicker({
  label,
  value,
  valueName,
  onChange,
  hint,
  placeholder = "Chercher un client ou un prospect…",
  className,
  allowCreate = false,
}: {
  /** Absent dans une barre de filtres, où le champ se lit seul. */
  label?: string;
  /** Identifiant choisi, nul quand rien n'est rattaché. */
  value: string | null;
  /** Nom déjà connu, pour l'afficher sans interroger le serveur. */
  valueName?: string;
  onChange: (id: string | null, name: string) => void;
  hint?: string;
  placeholder?: string;
  className?: string;
  /**
   * Proposer de créer la fiche qu'on ne trouve pas.
   *
   * Facultatif parce qu'une barre de filtres ne crée rien : on y cherche parmi
   * ce qui existe, et « Créer » y serait une fausse manœuvre à portée de clic.
   */
  allowCreate?: boolean;
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
  const peutEcrire = usePermission("customers:write");
  const [creation, setCreation] = useState(false);
  const [echec, setEchec] = useState<string | null>(null);

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
      <div className={cn("flex flex-col gap-1.5", className)}>
        {label && <Label className="text-xs">{label}</Label>}
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

  /*
    La fiche du même nom existe déjà : on ne propose pas de la créer deux fois.

    La comparaison est exacte, à la casse près. Elle ne cherche pas à deviner
    qu'« Olga Mamakina » est peut-être « Mamakina Olga » : c'est le travail de
    l'écran des doublons, qui propose et ne tranche pas — et une proposition de
    fusion n'a rien à faire au milieu d'un appel téléphonique.
  */
  const dejaLa = (items ?? []).some(
    (item) => item.display_name.trim().toLowerCase() === cherche.toLowerCase(),
  );
  const offreCreation = allowCreate && peutEcrire && cherche.length >= 2 && !dejaLa;

  async function creer() {
    setCreation(true);
    setEchec(null);
    try {
      const cree = await createCustomer(nouvelleFiche(cherche));
      onChange(cree.id, cree.display_name);
      setOpen(false);
      setQuery("");
    } catch {
      setEchec("La fiche n'a pas pu être créée.");
    } finally {
      setCreation(false);
    }
  }

  return (
    <div ref={bloc} className={cn("relative flex flex-col gap-1.5", className)}>
      {label && <Label className="text-xs">{label}</Label>}
      <div className="relative">
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
        <Input
          value={query}
          placeholder={placeholder}
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

      {echec && <p className="text-danger text-[11px]">{echec}</p>}

      {open && items !== null && (
        <ul className="bg-popover absolute top-full right-0 left-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border p-1 shadow-lg">
          {items.length === 0 && !offreCreation ? (
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

          {/*
            Le geste qui manquait, en bas de la liste et non à sa place : on
            regarde d'abord si la fiche existe. Une seule frappe la précède —
            le nom est déjà tapé dans le champ de recherche.
          */}
          {offreCreation && (
            <li className={cn(items.length > 0 && "mt-1 border-t pt-1")}>
              <button
                type="button"
                disabled={creation}
                onClick={creer}
                className="hover:bg-accent flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left disabled:opacity-60"
              >
                {creation ? (
                  <Spinner className="text-muted-foreground size-3.5 shrink-0" />
                ) : (
                  <PlusIcon className="text-muted-foreground size-3.5 shrink-0" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">
                    Créer la fiche « {cherche} »
                  </span>
                  <span className="text-muted-foreground/70 block text-[11px]">
                    Prospect, source téléphone. Le reste se complète après
                    l&apos;appel.
                  </span>
                </span>
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/**
 * La fiche la plus courte qui ait un sens.
 *
 * Un nom, et des défauts qui disent d'où vient l'appel : **prospect**, parce
 * qu'on ne devient client qu'en signant, et **téléphone**, parce que c'est
 * exactement ce qui est en train de se passer. Inventer une catégorie ou une
 * adresse serait pire que de les laisser vides — « on ne sait pas » n'est pas
 * « autre », et la fiche se complète en deux minutes une fois raccroché.
 */
function nouvelleFiche(nom: string): CustomerPayload {
  return {
    display_name: nom,
    kind: "particulier",
    status: "prospect",
    source: "telephone",
    company_name: "",
    email: "",
    phone: "",
    address_line: "",
    postal_code: "",
    city: "",
    country: "France",
    requested_at: new Date().toISOString().slice(0, 10),
    notes: "",
    owner_id: null,
  };
}
