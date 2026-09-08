"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { scopeParam, useScope } from "@/modules/group";
import { errorMessage } from "@/shared/api/errors";
import * as api from "../lib/api";
import { alerts, buckets, read, studyAlerts } from "../lib/derive";
import type { Metier, ReadWorksite, WorksiteResult } from "../lib/types";

export type WorksiteView = "tableau" | "planning" | "liste";

type Resolved = { key: string; data: WorksiteResult | null; error: string | null };

/**
 * L'état de l'écran chantiers.
 *
 * **L'instant vient du serveur.** `generated_at` accompagne la réponse, et
 * c'est lui qui sert de repère pour « démarré il y a 74 jours » : l'horloge
 * d'un poste ne décide pas de ce qui traîne, et deux navigateurs mal réglés
 * ne doivent pas afficher deux chantiers en retard différents.
 *
 * Le périmètre société / activité a disparu avec le jeu de démonstration :
 * rien, dans les données, ne rattache une affaire à un métier. Un filtre qui
 * ne filtre rien fait douter de ce qu'il montre.
 */
export function useWorksites(metier: Metier = "travaux") {
  const [city, setCity] = useState("");
  // Le périmètre fait partie de la question posée au serveur : changer de
  // société relance la requête, comme changer de ville.
  const scope = useScope();
  /*
    L'écran Études interroge toujours STRUCTURE, quel que soit le sélecteur :
    en « tout le groupe » il montrerait sinon des chantiers de travaux sous des
    intitulés d'étude. Le périmètre ne pilote que l'écran Chantiers, qui est
    celui des deux à pouvoir accueillir les deux.
  */
  const issuer = metier === "etudes" ? "ompt-structure" : (scopeParam(scope) ?? "");
  // Un repère de repli, figé au montage. Il ne sert qu'avant la première
  // réponse, sur une liste vide : le lire de l'horloge à chaque rendu ferait
  // du rendu autre chose qu'une fonction de son état.
  const [fallbackNow] = useState(() => Date.now());
  const [view, setView] = useState<WorksiteView>("tableau");
  /*
    L'affaire désignée par l'URL, lue une fois au montage.

    La fiche client renvoie ici avec `?affaire=` : « Ouvrir le chantier » doit
    ouvrir *ce* chantier, pas la liste. Lue une seule fois — l'utilisateur
    clique ensuite dans la liste, et remettre l'URL d'accord à chaque clic
    ferait de la barre d'adresse un second état à tenir.
  */
  const params = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(
    () => params.get("affaire"),
  );
  const [token, setToken] = useState(0);

  const key = `worksites:${city}:${issuer}:${token}`;
  const [resolved, setResolved] = useState<Resolved>({
    key: "", data: null, error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    api
      .listWorksites(city, issuer, controller.signal)
      .then((data) => setResolved({ key, data, error: null }))
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setResolved({ key, data: null, error: errorMessage(cause) });
      });
    return () => controller.abort();
  }, [key, city, issuer]);

  const derived = useMemo(() => {
    // Pas encore de réponse : on dérive sur une liste vide plutôt que de rendre
    // une forme différente. Un écran qui change de forme entre le chargement et
    // les données oblige chaque composant à connaître les deux.
    const data = resolved.data;
    const now = data ? new Date(data.generated_at).getTime() : fallbackNow;
    const reads: ReadWorksite[] = (data?.items ?? []).map((item) => read(item, now));
    return {
      now,
      reads,
      board: buckets(reads, metier),
      // Les deux métiers n'attendent pas les mêmes choses : une étude ne manque
      // pas de date de démarrage, elle manque d'acompte ou d'une facture de
      // solde.
      work: metier === "etudes" ? studyAlerts(reads) : alerts(reads),
    };
  }, [resolved.data, fallbackNow, metier]);

  const reload = useCallback(() => setToken((value) => value + 1), []);

  return {
    ...derived,
    loading: resolved.key !== key,
    error: resolved.error,
    city,
    setCity,
    view,
    setView,
    reload,
    selected: derived.reads.find((r) => r.worksite.id === selectedId) ?? null,
    select: (id: string | null) => setSelectedId(id),
  };
}
