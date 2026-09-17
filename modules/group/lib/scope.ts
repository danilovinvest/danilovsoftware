"use client";

import { useSyncExternalStore } from "react";
import { useAuth } from "@/modules/auth";
import { ENTITY_BY_ID } from "./entities";

/**
 * Le périmètre de travail : sur quelle société on est.
 *
 * **C'est l'hôte qui le dit, désormais.** Chaque société a son adresse —
 * `groupe.…` et `structure.…` — et le portail sur le domaine principal est
 * l'endroit où l'on choisit. Le sélecteur qui vivait en tête de la barre
 * latérale a donc disparu : sur le CRM de GROUPE, proposer « STRUCTURE » ou
 * « tout le groupe » contredisait l'adresse même de la page.
 *
 * Il a été trois choses successives, et l'ordre a son sens. D'abord une
 * **lentille** choisie dans le navigateur, que le serveur croyait sur parole —
 * retirer le paramètre de l'URL suffisait à voir l'autre société. Puis une
 * **appartenance** portée par le compte, imposée par le serveur. Enfin, pour
 * qui voit tout le groupe, **l'hôte** : sans cela le dirigeant aurait vu la même
 * chose des deux côtés, et le découpage n'aurait rien voulu dire pour lui.
 *
 * `"tous"` reste le groupe entier : c'est ce que rend le développement, où il
 * n'y a qu'un CRM sur `localhost`, et le repli d'un compte sans société.
 */
export type Scope = "tous" | "ompt-structure" | "ompt-groupe";

/**
 * Les sociétés du groupe qui ont un CRM.
 *
 * Elle ne sert plus à peindre un sélecteur mais à nommer une société et à
 * proposer les valeurs attribuables dans les réglages — deux emplois où la
 * liste doit rester unique.
 */
export const SCOPES: Array<{ id: Scope; label: string; hint: string }> = [
  { id: "tous", label: "Tout le groupe", hint: "Les deux sociétés" },
  {
    id: "ompt-structure",
    label: "STRUCTURE",
    hint: "Le bureau d\'études — études, sondages, plans d\'exécution",
  },
  {
    id: "ompt-groupe",
    label: "GROUPE",
    hint: "Les travaux — gros œuvre, reprises en sous-œuvre, climatisation",
  },
];

/**
 * La société que l'hôte désigne, ou `null` quand il n'en désigne aucune.
 *
 * Fonction pure, pour que la règle se lise et se teste sans navigateur. Le
 * préfixe suffit : en production le CRM n'est servi que sur les deux
 * sous-domaines, le portail occupant le domaine principal.
 */
export function scopeFromHost(hostname: string): Scope | null {
  if (hostname.startsWith("groupe.")) return "ompt-groupe";
  if (hostname.startsWith("structure.")) return "ompt-structure";
  return null;
}

/*
 * Un « external store » au sens de React, comme les préférences d'affichage.
 *
 * L'hôte vit hors de l'arbre et ne change jamais sans rechargement de page :
 * il n'y a donc rien à quoi s'abonner, et l'abonnement est un no-op. Ce qui
 * compte ici, c'est l'**instantané serveur distinct** — le serveur n'a pas de
 * `window`, et lire l'hôte pendant le rendu donnerait deux réponses, donc
 * l'écart d'hydratation que ce produit évite partout.
 */
function souscrire(): () => void {
  return () => {};
}

function lire(): Scope | null {
  if (typeof window === "undefined") return null;
  return scopeFromHost(window.location.hostname);
}

function serveur(): Scope | null {
  return null;
}

/**
 * La société du compte l'emporte, puis l'hôte, puis tout le groupe.
 *
 * Fonction pure, pour que la règle se lise et se teste sans React.
 *
 * **L'ordre est celui de l'autorité, et il a été corrigé.** La première version
 * mettait l'hôte devant : un compte lié à GROUPE qui ouvrait `structure.` voyait
 * alors les libellés de STRUCTURE — sa navigation, ses écrans — pendant que le
 * serveur lui renvoyait, à juste titre, les données de GROUPE. Aucune fuite,
 * puisque `Identity.CompanyFilter` impose la société du compte quoi qu'on
 * demande ; mais un écran qui se contredit fait douter du reste, et c'est
 * exactement ce que ce produit refuse ailleurs.
 *
 * Une société du compte est une **appartenance**, imposée par le serveur ; un
 * hôte n'est qu'un **choix**, celui de l'adresse qu'on a tapée. Une
 * appartenance prime sur un choix. L'hôte ne décide donc que pour qui ne porte
 * aucune société — le dirigeant et le trousseau de secours — et c'est
 * précisément le cas pour lequel il a été introduit.
 *
 * Une société que cette liste ne connaît pas (les trois sociétés dormantes du
 * groupe) retombe sur l'hôte, puis sur tout le groupe : côté affichage
 * seulement, le serveur filtrant toujours sur la vraie valeur.
 */
export function resolveScope(host: Scope | null, company: string): Scope {
  if (company === "ompt-structure" || company === "ompt-groupe") return company;
  if (host) return host;
  return "tous";
}

/**
 * Le périmètre qui **s'applique**.
 *
 * La résolution vit à cet endroit unique plutôt que dans les cinq écrans qui
 * lisent le périmètre : la refaire cinq fois la ferait diverger au premier
 * ajustement, et « où en est-on » ne voudrait plus dire la même chose d'un
 * écran à l'autre. C'est pourquoi ce module dépend de `auth` — l'inverse
 * n'existe pas, il n'y a donc aucun cycle.
 */
export function useScope(): Scope {
  const host = useSyncExternalStore(souscrire, lire, serveur);
  const { account } = useAuth();
  return resolveScope(host, account?.issuer ?? "");
}

/**
 * Les sociétés qu'un compte peut attribuer, pour un `<select>`.
 *
 * Une seule liste, lue par le formulaire d'un compte et par l'assistant
 * d'invitation : deux copies divergeraient au premier ajustement, et l'une des
 * deux finirait par proposer une société que l'autre refuse.
 *
 * Un appelant **lié** ne peut faire entrer personne ailleurs que chez lui —
 * c'est la règle du serveur — donc il ne voit que sa société : proposer les
 * autres serait promettre un refus.
 *
 * **« Tout le groupe » n'est pas dans cette liste**, et ce n'est pas un oubli.
 * Radix interdit la chaîne vide comme valeur d'option : `SelectField` la traduit
 * en sentinelle interne et n'affiche l'option « aucune valeur » que si on lui
 * passe un `emptyLabel`. C'est à l'appelant de le donner — et seulement s'il est
 * lui-même non lié, sans quoi il proposerait un périmètre que le serveur lui
 * refuserait.
 */
export function companyOptions(
  actorCompany: string,
): Array<{ value: string; label: string }> {
  return SCOPES.filter(
    (entry) =>
      entry.id !== "tous" && (actorCompany === "" || entry.id === actorCompany),
  ).map((entry) => ({ value: entry.id, label: entry.label }));
}

/** Le libellé d'une société à partir d'une chaîne quelconque. */
export function companyLabel(value: string): string {
  if (value === "") return "Tout le groupe";
  return SCOPES.find((entry) => entry.id === value)?.label ?? value;
}

/**
 * Le paramètre à passer à l'API. Vide pour le groupe entier — le serveur ne
 * filtre alors rien, plutôt que de recevoir une valeur qu'il devrait ignorer.
 *
 * Le serveur impose de toute façon la société d'un compte lié : ce paramètre ne
 * vaut que pour un compte qui voit tout le groupe.
 */
export function scopeParam(scope: Scope): string | undefined {
  return scope === "tous" ? undefined : scope;
}

/** Le nom complet de la société, pour un libellé ou une infobulle. */
export function scopeName(scope: Scope): string {
  return scope === "tous"
    ? "Tout le groupe"
    : (ENTITY_BY_ID.get(scope)?.name ?? scope);
}
