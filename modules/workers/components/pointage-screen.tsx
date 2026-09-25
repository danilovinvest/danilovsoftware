"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { CheckIcon, XIcon } from "lucide-react";
import { ApiError } from "@/shared/api/errors";
import { LIVE, useCached } from "@/shared/api/cache";
import * as api from "../lib/pointage";

/**
 * L'écran de pointage du dépôt.
 *
 * **Écrit pour le téléphone d'abord.** C'est une tablette ou un téléphone posé
 * au dépôt, tenu à bout de bras, parfois avec des gants : les tailles de base
 * sont celles du petit écran, et ce sont les grandes largeurs qui reçoivent un
 * modificateur (`sm:`), jamais l'inverse. Les cibles font 56 pixels au doigt et
 * 64 au-delà.
 *
 * **Il n'y a jamais d'écran vide.** La première version rendait
 * `<main className="min-h-dvh bg-white" />` tant que la réponse n'était pas
 * arrivée — c'est-à-dire un blanc complet, servi tel quel par le rendu serveur.
 * Sur un poste cela clignote ; sur un téléphone en 4G cela dure, et c'est une
 * page blanche. Le cadre et le titre sont donc peints **tout de suite**, et
 * seul le contenu attend. Un écran qui ne dit pas son nom ne se distingue pas
 * d'une panne.
 *
 * **Volontairement hors du thème du CRM.** Un appareil ouvert par dix personnes
 * doit avoir la même tête quel que soit son réglage : le blanc est écrit ici et
 * ne suit ni la palette ni le mode sombre. C'est l'exception assumée à la règle
 * des jetons de couleur, bornée à ce seul fichier.
 *
 * **Deux boutons, et rien d'autre.** Pas de mois, pas d'historique, pas de
 * total : l'écran répond à une seule question. Ce qui est pointé reste
 * modifiable jusqu'à la fin de la journée — on se trompe de ligne, et un écran
 * qui refuserait de revenir en arrière obligerait à appeler le bureau.
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
  const charge = etat === undefined && !verrouille && !panne;

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
      /*
        Un 401 ici veut dire que le mot de passe a changé pendant que la
        tablette restait ouverte — le cas même que le CRM annonce avant de le
        changer. Sans ce `mutate()`, l'écran gardait la liste à l'affichage et
        se contentait de « le pointage n'est pas passé » jusqu'à la prochaine
        revalidation, throttlée à la minute.
      */
      if (cause instanceof ApiError && cause.status === 401) {
        await mutate();
        return;
      }
      setRefus(cause instanceof Error ? cause.message : "Le pointage n'est pas passé.");
    } finally {
      setOccupe(null);
    }
  }

  // Une panne alors qu'on n'a **jamais** rien reçu n'est pas une relecture
  // ratée : le bandeau « ce qui est affiché peut dater » au-dessus d'une liste
  // vide se lisait « l'équipe est vide » là où l'API ne répond pas du tout.
  if (panne && etat === undefined) {
    return (
      <Cadre>
        <p role="alert" className="text-center text-base font-semibold text-red-600">
          Le pointage est injoignable.
        </p>
        <p className="mt-2 text-center text-sm text-neutral-500">
          Rien n&apos;a pu être chargé. Prévenir le bureau, et réessayer.
        </p>
        <button type="button" onClick={() => void mutate()} className={BOUTON_SOMBRE}>
          Réessayer
        </button>
      </Cadre>
    );
  }

  if (charge) {
    return (
      <Cadre>
        {/* Trois lignes grises à la forme de ce qui vient : on sait où l'on
            arrive avant que ce soit arrivé, plutôt qu'un blanc. */}
        <div className="flex flex-col gap-3" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-neutral-100 sm:h-20" />
          ))}
        </div>
        <p className="mt-4 text-center text-sm text-neutral-400">Chargement…</p>
      </Cadre>
    );
  }

  if (verrouille) {
    return (
      <Cadre>
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
          className={BOUTON_SOMBRE}
        >
          Entrer
        </button>
      </Cadre>
    );
  }

  return (
    <main className="min-h-dvh bg-white px-4 py-6 text-neutral-900">
      <header className="mx-auto mb-6 max-w-md text-center">
        <p className="text-base font-semibold capitalize sm:text-lg">
          {maintenant?.toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          }) ?? " "}
        </p>
        <p className="text-3xl font-bold tabular-nums sm:text-4xl">
          {maintenant?.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) ??
            " "}
        </p>
      </header>

      {panne && (
        <p role="alert" className="mx-auto mb-4 max-w-md text-center text-sm text-red-600">
          La liste n&apos;a pas pu être relue. Ce qui est affiché peut dater.
        </p>
      )}

      <ul className="mx-auto flex max-w-md flex-col gap-2.5 sm:gap-3">
        {etat?.workers.map((w) => {
          const statut = etat.attendance.find((a) => a.worker_id === w.id)?.status;
          return (
            <li
              key={w.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 px-3 py-2 sm:gap-3 sm:px-4"
            >
              <span className="min-w-0 flex-1 truncate text-base font-medium sm:text-lg">
                {w.full_name}
              </span>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  disabled={occupe === w.id}
                  onClick={() => void pointer(w.id, "present")}
                  aria-pressed={statut === "present"}
                  aria-label={`${w.full_name} est là`}
                  className={`${CIBLE} ${
                    statut === "present"
                      ? "border-green-600 bg-green-600 text-white"
                      : "border-neutral-200 text-green-600"
                  }`}
                >
                  <CheckIcon className="size-7 sm:size-8" strokeWidth={3} />
                </button>
                <button
                  type="button"
                  disabled={occupe === w.id}
                  onClick={() => void pointer(w.id, "absent")}
                  aria-pressed={statut === "absent"}
                  aria-label={`${w.full_name} n'est pas là`}
                  className={`${CIBLE} ${
                    statut === "absent"
                      ? "border-red-600 bg-red-600 text-white"
                      : "border-neutral-200 text-red-600"
                  }`}
                >
                  <XIcon className="size-7 sm:size-8" strokeWidth={3} />
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
 * Le cadre commun aux trois états d'attente — chargement, verrouillage, panne.
 *
 * Il existe pour qu'aucun d'eux ne soit un écran vide : le titre est peint dès
 * le rendu serveur, avant que la moindre réponse soit arrivée.
 */
function Cadre({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-white px-5 py-8 text-neutral-900">
      <div className="w-full max-w-xs">
        <h1 className="mb-1 text-center text-2xl font-bold sm:text-3xl">Pointage</h1>
        <p className="mb-6 text-center text-sm text-neutral-500">OMPT · équipe de chantier</p>
        {children}
      </div>
    </main>
  );
}

/** La cible du doigt : 56 pixels au téléphone, 64 au-delà. */
const CIBLE =
  "grid size-14 place-items-center rounded-xl border-2 transition-colors sm:size-16";

const BOUTON_SOMBRE =
  "mt-4 w-full rounded-xl bg-neutral-900 py-4 text-base font-semibold text-white disabled:opacity-40 sm:text-lg";

/**
 * L'heure de l'appareil, rafraîchie toutes les trente secondes.
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
