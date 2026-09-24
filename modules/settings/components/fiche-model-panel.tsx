"use client";

import { useCallback, useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ErrorNotice } from "@/shared/ui/feedback";
import { CardsSkeleton } from "@/shared/ui/loading";
import { errorMessage } from "@/shared/api/errors";
import { notifySuccess } from "@/shared/ui/toaster";
import * as api from "../lib/modele-api";

/**
 * Ce que l'entreprise appelle une fiche complète.
 *
 * La fiche du SDC Meynadier-Faure sert d'étalon, et le reste de la base en est
 * loin : mesuré le 24/09 sur 388 fiches, 370 n'ont aucun interlocuteur, 346
 * aucune adresse de chantier, 344 aucun échange.
 *
 * **Deux interrupteurs et pas un de plus.** « S'applique » dit si le contrôle
 * est évalué ; « obligatoire » dit s'il rend la fiche incomplète. Un critère
 * facultatif se montre et se compte sans faire crier la liste de travail — et
 * c'est ce qui permet de garder une présomption utile sans qu'elle noie tout :
 * en rendant obligatoire celle sur les dates d'échange, 387 fiches sur 388
 * sortaient, et une liste qui contient tout ne trie rien.
 */
export function FicheModelPanel() {
  const [criteres, setCriteres] = useState<api.Critere[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .listCriteres()
      .then((data) => {
        setCriteres(data);
        setError(null);
      })
      .catch((cause) => setError(errorMessage(cause)));
  }, []);

  useEffect(load, [load]);

  async function regler(code: string, patch: Partial<api.Critere>) {
    // L'écran bascule tout de suite et se corrige si le serveur refuse : un
    // interrupteur qui attend une réponse réseau se clique deux fois.
    setCriteres((avant) =>
      avant?.map((c) => (c.code === code ? { ...c, ...patch } : c)) ?? avant,
    );
    try {
      await api.setCritere(code, patch);
      notifySuccess("Modèle mis à jour.");
    } catch (cause) {
      setError(errorMessage(cause));
      load();
    }
  }

  if (error) return <ErrorNotice message={error} onRetry={load} />;
  if (criteres === null) return <CardsSkeleton count={1} />;

  return (
    <div className="divide-y rounded-lg border" data-demo="modele-de-fiche">
      {criteres.map((critere) => (
        <div key={critere.code} className="flex flex-wrap items-center gap-4 px-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{critere.libelle}</p>
            <p className="text-muted-foreground font-mono text-xs">{critere.code}</p>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id={`actif-${critere.code}`}
              checked={critere.actif}
              onCheckedChange={(actif) => void regler(critere.code, { actif })}
            />
            <Label htmlFor={`actif-${critere.code}`} className="text-xs">
              S&apos;applique
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id={`obligatoire-${critere.code}`}
              checked={critere.obligatoire}
              disabled={!critere.actif}
              onCheckedChange={(obligatoire) => void regler(critere.code, { obligatoire })}
            />
            <Label htmlFor={`obligatoire-${critere.code}`} className="text-xs">
              Obligatoire
            </Label>
          </div>
        </div>
      ))}
    </div>
  );
}
