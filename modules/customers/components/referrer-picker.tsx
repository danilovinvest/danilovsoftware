"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRightIcon, PlusIcon, SearchIcon, UserIcon, UsersIcon, XIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { usePermission } from "@/modules/auth";
import { Spinner } from "@/shared/ui/feedback";
import { customerHref } from "@/shared/lib/routes";
import { createCustomer, searchReferrers } from "../lib/api";
import { useDebounced } from "../hooks/use-customers";
import { CUSTOMER_STATUS } from "../lib/labels";
import type { CustomerStatus, Referrer, ReferrerCandidate } from "../lib/types";

/**
 * De qui vient un client recommandé.
 *
 * « Un dropdown avec TOUT » : une recherche parmi les fiches, archivées
 * comprises, et les interlocuteurs de chacune — c'est souvent l'architecte ou
 * le voisin d'un client qui recommande, pas le client lui-même. La personne
 * qu'on ne trouve pas se crée d'ici, comme une fiche : on la remerciera, on la
 * rappellera, et elle en recommandera d'autres.
 */
export function ReferrerPicker({
  value,
  onChange,
  exclude = null,
  disabled = false,
}: {
  value: Referrer | null;
  /** `null` retire le parrain. */
  onChange: (referrer: Referrer | null) => void;
  /** La fiche qu'on renseigne : elle ne se recommande pas elle-même. */
  exclude?: string | null;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [resultat, setResultat] = useState<{ pour: string; items: ReferrerCandidate[] } | null>(
    null,
  );
  const [creation, setCreation] = useState(false);
  const [echec, setEchec] = useState<string | null>(null);
  const bloc = useRef<HTMLDivElement>(null);
  const cherche = useDebounced(query).trim();
  const peutCreer = usePermission("customers:write");
  // La question voyage avec sa réponse, comme dans le sélecteur de fiche.
  const items = resultat?.pour === cherche ? resultat.items : null;

  useEffect(() => {
    if (cherche.length < 2) return;
    const controller = new AbortController();
    searchReferrers(cherche, exclude, controller.signal)
      .then((found) => setResultat({ pour: cherche, items: found }))
      .catch(() => {
        if (!controller.signal.aborted) setResultat({ pour: cherche, items: [] });
      });
    return () => controller.abort();
  }, [cherche, exclude]);

  useEffect(() => {
    if (!open) return;
    function ailleurs(event: MouseEvent) {
      if (!bloc.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", ailleurs);
    return () => document.removeEventListener("mousedown", ailleurs);
  }, [open]);

  function choisir(referrer: Referrer) {
    onChange(referrer);
    setOpen(false);
    setQuery("");
  }

  async function creer() {
    setCreation(true);
    setEchec(null);
    try {
      const cree = await createCustomer({
        display_name: cherche,
        kind: "particulier",
        status: "prospect",
        source: "autre",
        company_name: "",
        email: "",
        phone: "",
        address_line: "",
        postal_code: "",
        city: "",
        country: "France",
        requested_at: null,
        notes: "Fiche créée comme parrain d'un client recommandé.",
        owner_id: null,
      });
      choisir({
        kind: "fiche",
        id: cree.id,
        name: cree.display_name,
        customer_id: cree.id,
        parent_name: "",
      });
    } catch {
      setEchec("La fiche n'a pas pu être créée.");
    } finally {
      setCreation(false);
    }
  }

  if (value) {
    return (
      <div className="border-input flex h-9 items-center gap-2 rounded-lg border px-3">
        {value.kind === "fiche" ? (
          <UserIcon className="text-muted-foreground size-3.5 shrink-0" />
        ) : (
          <UsersIcon className="text-muted-foreground size-3.5 shrink-0" />
        )}
        <Link
          href={customerHref(value.customer_id)}
          className="text-info inline-flex min-w-0 flex-1 items-center gap-1 truncate text-sm hover:underline"
        >
          <span className="truncate">
            {value.name}
            {value.parent_name && (
              <span className="text-muted-foreground"> · {value.parent_name}</span>
            )}
          </span>
          <ArrowUpRightIcon className="size-3 shrink-0" />
        </Link>
        {!disabled && (
          <button
            type="button"
            aria-label="Retirer le parrain"
            onClick={() => onChange(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-3.5" />
          </button>
        )}
      </div>
    );
  }

  const attente = cherche.length >= 2 && items === null;
  const offreCreation = peutCreer && cherche.length >= 2;

  return (
    <div ref={bloc} className="relative flex flex-col gap-1">
      <div className="relative">
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
        <Input
          value={query}
          disabled={disabled}
          placeholder="Qui l'a recommandé ? Fiche, interlocuteur…"
          aria-label="Recommandé par"
          className="pl-8"
          data-demo="referrer-picker"
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
      {echec && <p className="text-danger text-[11px]">{echec}</p>}

      {open && items !== null && (
        <ul className="bg-popover absolute top-full right-0 left-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border p-1 shadow-lg">
          {items.length === 0 && !offreCreation && (
            <li className="text-muted-foreground px-2 py-3 text-center text-xs">
              Personne pour « {cherche} »
            </li>
          )}
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}`}>
              <button
                type="button"
                onClick={() => choisir(item)}
                className="hover:bg-accent flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left"
              >
                {item.kind === "fiche" ? (
                  <UserIcon className="text-muted-foreground size-3.5 shrink-0" />
                ) : (
                  <UsersIcon className="text-muted-foreground size-3.5 shrink-0" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{item.name}</span>
                  <span className="text-muted-foreground/70 block truncate text-[11px]">
                    {describe(item)}
                  </span>
                </span>
              </button>
            </li>
          ))}
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
                  <span className="block truncate text-sm">Créer « {cherche} »</span>
                  <span className="text-muted-foreground/70 block text-[11px]">
                    Une fiche à son nom, qui se complète ensuite.
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

/** « Interlocuteur · Vidal » ou « Fiche · archivée · Cannes ». */
function describe(item: ReferrerCandidate): string {
  const statut = CUSTOMER_STATUS[item.status as CustomerStatus]?.label.toLowerCase();
  return item.kind === "interlocuteur"
    ? ["Interlocuteur", item.parent_name].filter(Boolean).join(" · ")
    : ["Fiche", statut, item.city].filter(Boolean).join(" · ");
}
