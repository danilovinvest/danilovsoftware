"use client";

import { useRouter } from "next/navigation";
import { ArrowRightIcon } from "lucide-react";
import { useAuth } from "@/modules/auth";
import { Skeleton } from "@/shared/ui/feedback";
import { Wordmark } from "@/shared/ui/logo";
import { cn } from "@/lib/utils";
import { SCOPES, type Scope } from "../lib/scope";

/**
 * Le portail : on s'authentifie ici, puis on choisit son CRM.
 *
 * Il vit sur le domaine principal, les deux sociétés vivant chacune sur son
 * sous-domaine. Ce découpage n'est pas cosmétique : c'est ce qui fait qu'un
 * chargé d'affaires de GROUPE travaille dans « son » CRM, à son adresse, plutôt
 * que dans un CRM commun où une liste déroulante lui rappellerait en
 * permanence l'existence de l'autre société.
 *
 * **Une seule clé d'accès sert les trois hôtes.** Le RPID des passkeys est
 * l'apex, et un RPID vaut pour son domaine et tous ses sous-domaines : la clé
 * enrôlée ici ouvre les deux CRM. Le cookie de session porte le même domaine,
 * si bien que passer d'un CRM à l'autre ne redemande rien.
 */
export function CompanyPortal() {
  const { account, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex w-full max-w-lg flex-col gap-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  // La société du compte décide de ce qu'on peut ouvrir. Un compte lié ne voit
  // que sa carte : lui montrer l'autre, désactivée, serait lui désigner une
  // porte fermée.
  const ouvrables = SCOPES.filter(
    (entry) =>
      entry.id !== "tous" &&
      (account?.issuer === "" || account?.issuer === entry.id),
  );

  return (
    <div className="flex w-full max-w-lg flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Wordmark className="h-9 self-start" />
        <h1 className="sr-only">OMPT CRM</h1>
        <p className="text-muted-foreground text-sm">
          {account
            ? `Bonjour ${account.first_name || account.email}. Choisissez votre espace de travail.`
            : "Choisissez votre espace de travail."}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {ouvrables.map((entry) => (
          <CompanyCard key={entry.id} scope={entry.id} />
        ))}
      </div>

      {ouvrables.length === 0 && (
        <p className="text-muted-foreground text-xs">
          Aucune société n&apos;est rattachée à ce compte. Demandez à un
          administrateur de vous en attribuer une.
        </p>
      )}
    </div>
  );
}

/** Le sous-domaine de chaque société, et sa marque de deux lettres. */
const MARQUES: Record<
  Exclude<Scope, "tous">,
  { prefixe: string; sigle: string; classe: string }
> = {
  "ompt-groupe": {
    prefixe: "groupe",
    sigle: "OG",
    classe: "bg-h-amber-9 text-h-amber-11",
  },
  "ompt-structure": {
    prefixe: "structure",
    sigle: "OS",
    classe: "bg-h-indigo-9 text-white",
  },
};

function CompanyCard({ scope }: { scope: Scope }) {
  const router = useRouter();
  const entry = SCOPES.find((item) => item.id === scope);
  const marque = MARQUES[scope as Exclude<Scope, "tous">];
  if (!entry || !marque) return null;

  /*
    L'hôte est lu **au clic**, jamais au rendu.

    C'est la règle des passkeys, et elle vaut ici pour la même raison : le
    serveur n'a pas de `window`, donc le lire pendant le rendu donnerait deux
    réponses et l'écart d'hydratation qui va avec.

    Deux destinations, et la distinction est réelle. En développement — sur
    `localhost`, ou tout hôte sans point — il n'y a pas de sous-domaine : le CRM
    est unique, et c'est une navigation interne, donc l'affaire du routeur. En
    production, c'est une **autre origine** : le routeur de Next ne sait pas y
    aller, et il faut faire changer de page au navigateur.
  */
  function ouvrir() {
    const host = window.location.hostname;
    if (!host.includes(".") || host.endsWith("localhost")) {
      router.push("/dashboard");
      return;
    }
    const apex = host.split(".").slice(-2).join(".");
    window.location.href =
      `${window.location.protocol}//${marque.prefixe}.${apex}/dashboard`;
  }

  return (
    <button
      type="button"
      onClick={ouvrir}
      className="bg-card hover:bg-accent/40 group flex w-full items-center gap-4 rounded-xl border p-4 text-left shadow-sm transition-colors"
    >
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
          marque.classe,
        )}
      >
        {marque.sigle}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">
          {entry.label}
        </span>
        <span className="text-muted-foreground block truncate text-xs">
          {entry.hint}
        </span>
      </span>
      <ArrowRightIcon className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}
