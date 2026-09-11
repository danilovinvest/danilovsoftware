"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { usePermission } from "@/modules/auth";
import { Spinner } from "@/shared/ui/feedback";
import { createCustomer, deleteCustomer, listCustomers, updateCustomer } from "../lib/api";
import { useDebounced } from "../hooks/use-customers";
import type { Customer, CustomerListItem, CustomerPayload } from "../lib/types";

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
  /*
    La fiche **créée d'ici**, gardée entière.

    Deux choses en dépendent, et aucune ne vaudrait pour une fiche choisie dans
    la liste : la croix la supprime au lieu de la détacher — c'est une erreur de
    frappe qu'on annule, pas un client qu'on écarte — et les deux champs de
    contact s'affichent, parce qu'on sait qu'ils sont vides. La garder entière
    évite un aller-retour pour reconstituer ce que l'écriture doit renvoyer.
  */
  const [creee, setCreee] = useState<Customer | null>(null);

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

  // La fiche affichée est-elle celle qu'on vient de créer ici ?
  const nouvelle = creee !== null && creee.id === value ? creee : null;

  if (value) {
    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        {label && <Label className="text-xs">{label}</Label>}
        <div className="border-input flex h-9 items-center gap-2 rounded-lg border px-3">
          <span className="min-w-0 flex-1 truncate text-sm">
            {valueName || "Fiche rattachée"}
          </span>
          {/*
            La croix retire la fiche — et **supprime** celle qu'on vient de
            créer ici.

            Une fiche née d'une faute de frappe n'a rien à faire dans la base :
            « katia tes 3 » restait à côté de « katia test », et il fallait
            aller la chercher dans la liste pour l'effacer. Sur une fiche
            choisie, la croix ne fait que détacher : on n'efface pas un client
            en fermant un rendez-vous.
          */}
          <button
            type="button"
            disabled={creation}
            aria-label={nouvelle ? "Supprimer la fiche créée" : "Retirer la fiche"}
            title={
              nouvelle
                ? "Supprime la fiche qui vient d'être créée"
                : "Retire la fiche de cet événement"
            }
            onClick={async () => {
              if (nouvelle) {
                setCreation(true);
                try {
                  await deleteCustomer(nouvelle.id);
                } catch {
                  setEchec("La fiche n'a pas pu être supprimée.");
                } finally {
                  setCreation(false);
                }
                setCreee(null);
              }
              onChange(null, "");
              setQuery("");
            }}
            className={cn(
              "text-muted-foreground",
              nouvelle ? "hover:text-destructive" : "hover:text-foreground",
            )}
          >
            <XIcon className="size-3.5" />
          </button>
        </div>

        {nouvelle && (
          <ContactRapide
            fiche={nouvelle}
            onSaved={(maj) => setCreee(maj)}
            onError={setEchec}
          />
        )}

        {echec && <p className="text-danger text-[11px]">{echec}</p>}
        {hint && !nouvelle && (
          <p className="text-muted-foreground text-[11px]">{hint}</p>
        )}
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
      setCreee(cree);
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

/**
 * Le téléphone et l'adresse, saisis sans quitter l'écran.
 *
 * Une fiche née d'un appel n'a qu'un nom, et c'est pendant l'appel qu'on a le
 * numéro — pas dix minutes plus tard, devant la liste des fiches. Deux champs,
 * un bouton, et l'on revient à ce qu'on était en train de faire. Le reste — le
 * type de projet, l'adresse du chantier — se complète depuis la fiche, où le
 * bandeau d'alerte le réclame déjà.
 *
 * Ils n'apparaissent que pour une fiche **créée ici** : sur une fiche
 * existante, deux champs vides à côté d'un nom se liraient comme une invitation
 * à écraser ce qu'elle porte déjà.
 */
function ContactRapide({
  fiche,
  onSaved,
  onError,
}: {
  fiche: Customer;
  onSaved: (fiche: Customer) => void;
  onError: (message: string | null) => void;
}) {
  const [phone, setPhone] = useState(fiche.phone);
  const [email, setEmail] = useState(fiche.email);
  const [pending, setPending] = useState(false);
  const [fait, setFait] = useState(false);

  const change = phone.trim() !== fiche.phone || email.trim() !== fiche.email;

  async function enregistrer() {
    setPending(true);
    onError(null);
    try {
      const maj = await updateCustomer(fiche.id, {
        display_name: fiche.display_name,
        kind: fiche.kind,
        status: fiche.status,
        source: fiche.source,
        company_name: fiche.company_name,
        email: email.trim(),
        phone: phone.trim(),
        address_line: fiche.address_line,
        postal_code: fiche.postal_code,
        city: fiche.city,
        country: fiche.country,
        requested_at: fiche.requested_at,
        notes: fiche.notes,
        owner_id: fiche.owner_id,
      });
      onSaved(maj);
      setFait(true);
    } catch {
      onError("Le contact n'a pas pu être enregistré.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="bg-muted/30 flex flex-col gap-2 rounded-lg border border-dashed p-2">
      <p className="text-muted-foreground text-[11px]">
        Fiche créée. Son numéro et son adresse, tant que vous l&apos;avez en
        ligne.
      </p>
      <div className="flex items-end gap-1.5">
        <Input
          value={phone}
          type="tel"
          inputMode="tel"
          placeholder="06 12 34 56 78"
          aria-label="Téléphone"
          className="h-8 text-xs"
          onChange={(event) => {
            setPhone(event.target.value);
            setFait(false);
          }}
        />
        <Input
          value={email}
          type="email"
          placeholder="client@exemple.fr"
          aria-label="Adresse e-mail"
          className="h-8 text-xs"
          onChange={(event) => {
            setEmail(event.target.value);
            setFait(false);
          }}
        />
        <Button
          size="xs"
          variant={change ? "default" : "outline"}
          className="h-8 shrink-0"
          disabled={pending || !change}
          onClick={enregistrer}
        >
          {fait && !change ? <CheckIcon /> : "Noter"}
        </Button>
      </div>
    </div>
  );
}
