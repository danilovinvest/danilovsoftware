"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { CheckIcon, XIcon } from "lucide-react";
import { ApiError } from "@/shared/api/errors";
import { LIVE, useCached } from "@/shared/api/cache";
import * as api from "../lib/pointage";

/**
 * L'écran de pointage du dépôt.
 *
 * **Volontairement hors du thème du CRM.** C'est un écran de kiosque : une
 * tablette posée au dépôt, ouverte par dix personnes, qui doit avoir la même
 * tête quel que soit le réglage de l'appareil. Le blanc est donc écrit ici et
 * ne suit ni la palette ni le mode sombre — c'est l'exception assumée à la
 * règle des jetons de couleur, et elle tient à ce que cette page n'appartient
 * pas à la surface thémée du CRM.
 *
 * **Deux boutons, et rien d'autre.** Pas de mois, pas d'historique, pas de
 * total : l'écran répond à une seule question, et chaque chose de plus est une
 * occasion de se tromper avec des gants. Les cibles font 64 pixels, parce
 * qu'on appuie dessus debout.
 *
 * **Ce qui est déjà pointé reste modifiable** jusqu'à la fin de la journée :
 * on se trompe de ligne, et un écran qui refuserait de revenir en arrière
 * obligerait à appeler le bureau.
 */
export function PointageScreen() {
  const [secret, setSecret] = useState("");
  const [refus, setRefus] = useState("");
  const [occupe, setOccupe] = useState<string | null>(null);
  const maintenant = useNow();

  const { data: etat, error, mutate } = useCached("pointage:today", () => api.today(), LIVE);

  /*
    Seul un 401 verrouille l'écran.

    `LIVE` ne réessaie pas en cas d'échec, si bien qu'une coupure réseau d'une
    seconde laisse une erreur derrière elle. La traiter comme un verrouillage
    redemanderait le mot de passe à une équipe qui l'a déjà donné, au milieu
    d'une matinée. Un 401, lui, dit exactement ce qu'on croit : la session
    n'existe pas, ou le mot de passe a changé depuis.
  */
  const verrouille = error instanceof ApiError && error.status === 401;
  const panne = error !== undefined && !verrouille;

  async function deverrouiller() {
    setRefus("");
    try {
      await api.unlock(secret);
      setSecret("");
      await mutate();
    } catch (cause) {
      setRefus(cause instanceof Error ? cause.message : "Mot de passe incorrect.");
    }
  }

  async function pointer(id: string, statut: "present" | "absent") {
    const actuel = etat?.attendance.find((a) => a.worker_id === id)?.status;
    setOccupe(id);
    setRefus("");
    try {
      // Réappuyer sur le même bouton retire le pointage : c'est le seul geste
      // qui rend un jour à « pas encore pointé », et il doit rester à portée.
      await api.mark(id, actuel === statut ? "" : statut);
      await mutate();
    } catch (cause) {
      setRefus(cause instanceof Error ? cause.message : "Le pointage n'est pas passé.");
    } finally {
      setOccupe(null);
    }
  }

  if (etat === undefined && !verrouille && !panne) {
    return <main className="min-h-dvh bg-white" />;
  }

  if (verrouille) {
    return (
      <main className="grid min-h-dvh place-items-center bg-white px-6 text-neutral-900">
        <div className="w-full max-w-xs">
          <h1 className="mb-1 text-center text-2xl font-bold">Pointage</h1>
          <p className="mb-6 text-center text-sm text-neutral-500">OMPT · équipe de chantier</p>
          <input
            type="password"
            autoComplete="current-password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void deverrouiller();
            }}
            placeholder="Mot de passe"
            aria-label="Mot de passe"
            className="w-full rounded-xl border border-neutral-300 px-4 py-4 text-center text-lg outline-none focus:border-neutral-900"
          />
          {refus !== "" && (
            <p role="alert" className="mt-3 text-center text-sm text-red-600">
              {refus}
            </p>
          )}
          <button
            type="button"
            onClick={() => void deverrouiller()}
            disabled={secret === ""}
            className="mt-4 w-full rounded-xl bg-neutral-900 py-4 text-lg font-semibold text-white disabled:opacity-40"
          >
            Entrer
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-white px-4 py-6 text-neutral-900">
      <header className="mx-auto mb-6 max-w-md text-center">
        <p className="text-lg font-semibold capitalize">
          {maintenant?.toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          }) ?? " "}
        </p>
        <p className="text-4xl font-bold tabular-nums">
          {maintenant?.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) ??
            " "}
        </p>
      </header>

      {panne && (
        <p role="alert" className="mx-auto mb-4 max-w-md text-center text-sm text-red-600">
          La liste n&apos;a pas pu être relue. Ce qui est affiché peut dater.
        </p>
      )}

      <ul className="mx-auto flex max-w-md flex-col gap-3">
        {etat?.workers.map((w) => {
          const statut = etat.attendance.find((a) => a.worker_id === w.id)?.status;
          return (
            <li
              key={w.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 px-4 py-2"
            >
              <span className="min-w-0 flex-1 truncate text-lg font-medium">{w.full_name}</span>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={occupe === w.id}
                  onClick={() => void pointer(w.id, "present")}
                  aria-pressed={statut === "present"}
                  aria-label={`${w.full_name} est là`}
                  className={`grid size-16 place-items-center rounded-xl border-2 transition-colors ${
                    statut === "present"
                      ? "border-green-600 bg-green-600 text-white"
                      : "border-neutral-200 text-green-600"
                  }`}
                >
                  <CheckIcon className="size-8" strokeWidth={3} />
                </button>
                <button
                  type="button"
                  disabled={occupe === w.id}
                  onClick={() => void pointer(w.id, "absent")}
                  aria-pressed={statut === "absent"}
                  aria-label={`${w.full_name} n'est pas là`}
                  className={`grid size-16 place-items-center rounded-xl border-2 transition-colors ${
                    statut === "absent"
                      ? "border-red-600 bg-red-600 text-white"
                      : "border-neutral-200 text-red-600"
                  }`}
                >
                  <XIcon className="size-8" strokeWidth={3} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {refus !== "" && (
        <p role="alert" className="mt-6 text-center text-sm text-red-600">
          {refus}
        </p>
      )}

      <p className="mt-8 text-center text-xs text-neutral-400">
        Appuyer à nouveau sur le même bouton retire le pointage.
      </p>
    </main>
  );
}

/**
 * L'heure de la tablette, rafraîchie toutes les trente secondes.
 *
 * `useSyncExternalStore` et non un `useState` posé dans un effet : le serveur
 * n'a pas la même horloge que l'appareil, et peindre une heure au rendu côté
 * serveur ferait un écart d'hydratation à chaque chargement. Le cliché serveur
 * rend `null`, donc rien n'est affiché tant que la page n'est pas vivante.
 *
 * Le cliché est un **nombre** et non une `Date` : il doit être stable d'un
 * appel à l'autre, et un objet neuf à chaque lecture ferait boucler React.
 */
function useNow(): Date | null {
  const subscribe = useCallback((onChange: () => void) => {
    const t = setInterval(onChange, 30_000);
    return () => clearInterval(t);
  }, []);
  const bucket = useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / 30_000),
    () => null,
  );
  return bucket === null ? null : new Date(bucket * 30_000);
}
