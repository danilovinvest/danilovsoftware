"use client";

import { useMemo, useState } from "react";
import type { SWRConfiguration } from "swr";
import { scopeParam, useScope } from "@/modules/group";
import { LIVE, useCached } from "@/shared/api/cache";
import { getCustomersGraph } from "../lib/api";
import { buildModel } from "../lib/model";
import { useGraphVersion } from "./use-graph-version";

/** Quinze secondes : assez vif pour voir paraître une fiche qu'un collègue vient de créer. */
export const GRAPH_POLL_MS = 15_000;

/*
  La relecture est commandée par l'empreinte, pas par le focus : c'est elle
  qui sait si quelque chose a changé. Et l'ancienne réponse reste affichée
  pendant que la nouvelle arrive (`keepPreviousData`) — sans quoi chaque
  changement d'empreinte, donc de clé, repasserait par le squelette et la
  toile repartirait de zéro.
*/
const GRAPH_CACHE: SWRConfiguration = {
  ...LIVE,
  revalidateOnFocus: false,
  keepPreviousData: true,
};

/**
 * Le graphe du périmètre, tenu à jour par l'empreinte.
 *
 * **L'empreinte est dans la clé** : une fiche créée ou corrigée, où que ce
 * soit, change l'empreinte au tour suivant et la clé avec elle, donc le graphe
 * est relu. Les écritures des fiches ne touchent pas cette clé — elles
 * invalident les leurs (`customers:…`) — et n'ont pas à la connaître : c'est
 * l'empreinte qui fait le lien, dans cet onglet comme dans celui d'un collègue.
 *
 * Une empreinte illisible n'empêche pas le premier chargement : le graphe est
 * lu sans elle, et ne se rafraîchit plus tant qu'elle ne revient pas.
 */
export function useCustomersGraph() {
  const scope = useScope();
  const issuer = scopeParam(scope);
  const { version, error: versionError } = useGraphVersion(GRAPH_POLL_MS);
  const key =
    version !== null || versionError ? `graph:customers:${issuer ?? "tous"}:${version ?? "sans-empreinte"}` : null;
  const { data, error, mutate, isValidating } = useCached(key, () => getCustomersGraph(issuer), GRAPH_CACHE);
  const model = useMemo(() => (data ? buildModel(data) : null), [data]);

  /*
    La première empreinte lue : tant que le graphe affiché la porte, il n'a pas
    changé depuis l'ouverture, et le badge dit « lu à » plutôt que « mis à jour
    à ». Posée pendant le rendu, comme le veut React pour une valeur tirée du
    rendu précédent — un effet la poserait un rendu trop tard.
  */
  const [firstVersion, setFirstVersion] = useState<string | null>(null);
  if (data && firstVersion === null) setFirstVersion(data.version);

  return {
    scope,
    data,
    model,
    error,
    loading: !data && !error,
    refreshing: isValidating && Boolean(data),
    updated: Boolean(data && firstVersion !== null && data.version !== firstVersion),
    versionError,
    reload: () => void mutate(),
  };
}
