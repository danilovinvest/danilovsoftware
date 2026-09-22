"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import type { Paginated } from "@/shared/api/client";
import { LIVE, useCached } from "@/shared/api/cache";
import { scopeParam, useScope } from "@/modules/group";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { errorMessage } from "@/shared/api/errors";
import { notifyError, notifySuccess } from "@/shared/ui/toaster";
import * as api from "../lib/api";
import { filtersFromQuery, filtersToQuery, rememberListQuery } from "../lib/list-query";
import type { CustomerFilters, CustomerListItem } from "../lib/types";

/**
 * Charge la liste des fiches.
 *
 * **Chaque question a son entrée dans le cache partagé** : revenir sur la
 * liste, ou sur un filtre déjà posé, montre tout de suite les lignes connues
 * puis les revérifie. Une frappe rapide dans la recherche ne laisse pas une
 * réponse périmée écraser la plus récente : chaque réponse se range sous sa
 * propre question, et l'écran ne lit que celle qu'il pose.
 */
export function useCustomers(filters: CustomerFilters) {
  /*
    Le périmètre est lu ici et non passé par l'appelant.

    Ce n'est pas un filtre de l'écran : il ne se remet pas à zéro avec les
    autres, et « Réinitialiser » ne doit pas ramener silencieusement les fiches
    de l'autre société. Il fait partie de la question, pas de la recherche.
  */
  const scope = useScope();
  /*
    La société de l'adresse l'emporte ; sans elle, celle choisie dans les
    filtres. Le dirigeant et l'application de bureau n'ont pas d'adresse qui
    fixe une société, et ne pouvaient donc pas trier STRUCTURE de GROUPE.
  */
  const question: CustomerFilters = {
    ...filters,
    status: effectiveStatus(filters),
    issuer: scopeParam(scope) ?? filters.issuer,
  };
  // Les filtres sérialisés font la clé : un objet littéral changerait
  // d'identité à chaque rendu.
  const key = `customers:list:${JSON.stringify(question)}`;

  /*
    `keepPreviousData` laisse les lignes de la question précédente à l'écran
    pendant qu'on attend la nouvelle — c'était déjà le comportement de la
    liste, qui ne se vide pas à chaque lettre tapée.
  */
  const { data, error, mutate } = useCached(
    key,
    () => api.listCustomers(question),
    { ...LIVE, keepPreviousData: true },
  );
  /*
    Ce que le cache sait de **cette** question, sans le report de la
    précédente. Une erreur ne garde que ses propres lignes : une coupure ne
    doit pas vider l'écran qu'on lisait, et un autre filtre ne doit pas montrer
    les lignes du précédent sous son nom.
  */
  const { cache } = useSWRConfig();
  const own = cache.get(key)?.data as Paginated<CustomerListItem> | undefined;

  const reload = useCallback(() => void mutate(), [mutate]);

  return {
    data: (error ? own : data) ?? null,
    // « En cours » : cette question n'a pas encore de réponse.
    loading: own === undefined && !error,
    error: error ? errorMessage(error) : null,
    reload,
  };
}

export function useCustomerStats(chosen?: string) {
  // Les comptes suivent le périmètre : en mode STRUCTURE, « à relancer » doit
  // compter les études et non les chantiers.
  const scope = useScope();
  const issuer = scopeParam(scope) ?? chosen ?? "";
  const { data } = useCached(`customers:stats:${issuer}`, () => api.getStats(issuer), LIVE);
  return data ?? null;
}

/** Retarde la propagation d'une valeur : utilisé par le champ de recherche. */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/**
 * Ce que la liste montre quand on arrive, sans avoir rien demandé.
 *
 * **Les clients d'abord, par ordre alphabétique.** On ouvre cette liste pour
 * retrouver quelqu'un qu'on connaît, pas pour parcourir ce qui a bougé : un
 * classement par date oblige à lire trois cent soixante lignes pour trouver un
 * nom qu'on sait déjà, là où l'alphabet mène au bon endroit du premier coup.
 * Et les prospects se cherchent, quand un client s'ouvre.
 *
 * Le tri par nom existait déjà dans le sélecteur, et « Clients » dans les
 * onglets : seuls les défauts changent, rien ne disparaît.
 */
const DEFAULTS: CustomerFilters = {
  sort: "name",
  status: ["client"],
  page: 1,
  per_page: 25,
};

/** État de filtres du tableau, avec remise à la page 1 dès qu'un filtre change. */
/**
 * Le statut qui s'applique vraiment à la question.
 *
 * La liste s'ouvre sur « Clients », et la recherche s'y cumulait : pendant un
 * appel, taper le nom d'un prospect répondait « Aucune fiche », et l'on créait
 * un doublon. Une recherche porte donc sur **toutes** les fiches tant que le
 * statut est celui du défaut. Un statut choisi (Prospects, Perdus…) reste
 * respecté : c'est une question qu'on a posée, pas un réglage d'ouverture.
 */
export function effectiveStatus(filters: CustomerFilters): CustomerFilters["status"] {
  const parDefaut = filters.status?.join() === DEFAULTS.status?.join();
  return filters.search?.trim() && parDefaut ? undefined : filters.status;
}

export function useCustomerFilters() {
  /*
    L'adresse est la seule vérité des filtres (voir `lib/list-query.ts`) : un
    retour depuis une fiche, ou le bouton Précédent, retrouve la même liste.
    `replace` et non `push` : chaque case cochée n'a pas à devenir une étape de
    l'historique.
  */
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filters = useMemo(() => filtersFromQuery(params, DEFAULTS), [params]);
  const query = filtersToQuery(filters, DEFAULTS);

  useEffect(() => rememberListQuery(query), [query]);

  const write = useCallback(
    (next: CustomerFilters) => {
      const qs = filtersToQuery(next, DEFAULTS);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const update = useCallback(
    (patch: Partial<CustomerFilters>) => write({ ...filters, ...patch, page: patch.page ?? 1 }),
    [write, filters],
  );

  const reset = useCallback(() => write(DEFAULTS), [write]);

  /*
    « Il y a un filtre » se juge **par rapport au défaut**, pas à l'absence de
    valeur. Compter le statut dès qu'il est renseigné ferait apparaître « Tout
    effacer » à l'ouverture, au-dessus d'une liste que personne n'a filtrée —
    et le bouton effacerait alors un réglage qu'on n'a pas posé.
  */
  const active = useMemo(
    () =>
      Boolean(
        filters.search ||
          filters.city ||
          filters.source?.length ||
          filters.issuer ||
          filters.sort !== DEFAULTS.sort ||
          filters.status?.join() !== DEFAULTS.status?.join(),
      ),
    [filters],
  );

  return { filters, update, reset, active };
}

type ActionOptions<TResult> = {
  /**
   * L'écran appelant affiche lui-même l'erreur (un `ErrorNotice` dans une
   * boîte de dialogue) : pas de toast, qui la dirait une seconde fois.
   */
  inline?: boolean;
  /** Le toast de réussite, seulement quand rien d'autre à l'écran ne change. */
  success?: string | ((result: TResult) => string);
};

/**
 * Enveloppe une mutation : gère l'état « en cours », l'erreur et les erreurs de
 * validation par champ renvoyées par l'API.
 *
 * **Une erreur se voit toujours.** Plusieurs écrans lisaient `error` sans
 * jamais l'afficher : on cliquait, rien ne changeait, et on recommençait. Elle
 * part donc en toast, avec « Réessayer », sauf si l'appelant l'affiche déjà.
 */
export function useAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
  options: ActionOptions<TResult> = {},
) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const mounted = useRef(true);
  // Lues au moment du geste : un littéral d'options change à chaque rendu.
  const opts = useRef(options);
  useEffect(() => {
    opts.current = options;
  });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useMemo(() => {
    // Nommée pour que « Réessayer » rejoue exactement le même geste.
    const attempt = async (...args: TArgs): Promise<TResult | null> => {
      setPending(true);
      setError(null);
      setFields({});
      try {
        const result = await action(...args);
        const { success } = opts.current;
        if (success) notifySuccess(typeof success === "string" ? success : success(result));
        return result;
      } catch (cause) {
        const message = errorMessage(cause);
        const hasFields = Boolean(cause && typeof cause === "object" && "fields" in cause);
        if (mounted.current) {
          setError(message);
          if (hasFields) setFields((cause as { fields: Record<string, string> }).fields);
        }
        // Une erreur de champ se lit sous le champ : la rejouer telle quelle
        // n'y changerait rien.
        if (!opts.current.inline || !mounted.current) {
          notifyError(message, hasFields ? undefined : () => void attempt(...args));
        }
        return null;
      } finally {
        if (mounted.current) setPending(false);
      }
    };
    return attempt;
  }, [action]);

  return { run, pending, error, fields };
}
