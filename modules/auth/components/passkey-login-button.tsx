"use client";

import { useEffect, useRef, useState } from "react";
import { KeyRoundIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorNotice, Spinner } from "@/shared/ui/feedback";
import { errorMessage } from "@/shared/api/errors";
import { BROWSER_LOGIN_PATIENCE_MS, loginWithBrowser } from "@/shared/desktop/session";
import { useAuth } from "../auth-context";
import type { SessionResponse } from "../lib/types";

/**
 * Se connecter par sa clé d'accès — dans le navigateur du système.
 *
 * **Aucune clé ne se signe dans l'application.** Une passkey est liée au
 * domaine du CRM, et la page de l'application vit sur `tauri://localhost` :
 * aucun authentificateur n'accepterait. Le bouton ouvre donc le portail dans le
 * navigateur, où la clé fonctionne telle quelle, et l'application reprend la
 * main quand le navigateur la lui rend (`omptcrm://auth`).
 *
 * Pendant ce temps l'écran le dit, et offre d'abandonner : la personne peut
 * fermer l'onglet sans rien terminer, et rien ne reviendrait alors jamais.
 * Passé deux minutes — la vie du code émis par le portail — il dit que le
 * navigateur n'a sans doute pas rendu la main, et comment s'en sortir : une
 * invite « Ouvrir OMPT CRM » refusée laissait sinon l'écran attendre sans fin.
 */
export function PasskeyLoginButton({ onSignedIn }: { onSignedIn: () => void }) {
  const { adoptSession } = useAuth();
  const [waiting, setWaiting] = useState(false);
  const [stale, setStale] = useState(false);
  // Chaque essai a son numéro : le délai d'un essai remplacé ne doit pas
  // déclarer « trop long » celui qui vient de commencer.
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  // Quitter l'écran libère l'écoute : un retour tardif ne doit pas ouvrir une
  // session derrière un écran qui n'est plus là.
  useEffect(() => () => cancelRef.current?.(), []);

  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(() => setStale(true), BROWSER_LOGIN_PATIENCE_MS);
    return () => clearTimeout(timer);
  }, [waiting, attempt]);

  async function connect() {
    cancelRef.current?.();
    setWaiting(true);
    setStale(false);
    setAttempt((n) => n + 1);
    setError(null);
    const login = loginWithBrowser<SessionResponse>();
    cancelRef.current = login.cancel;
    try {
      adoptSession(await login.session);
      onSignedIn();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      if (cancelRef.current === login.cancel) {
        cancelRef.current = null;
        setWaiting(false);
        setStale(false);
      }
    }
  }

  function abandon() {
    cancelRef.current?.();
    cancelRef.current = null;
    setWaiting(false);
    setStale(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Un filet nommé plutôt qu'un simple trait : il dit que ce qui suit est
          une autre façon d'entrer, pas la suite du formulaire. */}
      <div className="flex items-center gap-3">
        <span className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-xs">ou</span>
        <span className="bg-border h-px flex-1" />
      </div>

      {error && <ErrorNotice message={error} />}

      {waiting ? (
        <div
          role="status"
          className="bg-muted/50 flex flex-col gap-2 rounded-lg border p-3 text-sm"
        >
          {stale ? (
            <>
              <p className="font-medium">Le navigateur n&apos;a pas rendu la main.</p>
              <p className="text-muted-foreground text-xs">
                Si vous avez autorisé l&apos;application, revenez sur l&apos;onglet du
                navigateur et cliquez « Ouvrir OMPT CRM », en acceptant l&apos;ouverture
                de l&apos;application. Sinon, recommencez : un nouvel onglet
                s&apos;ouvrira.
              </p>
            </>
          ) : (
            <p className="flex items-start gap-2">
              <Spinner className="mt-0.5 size-4 shrink-0" />
              <span>
                Terminez la connexion dans votre navigateur avec votre clé d&apos;accès.
                L&apos;application reprendra la main d&apos;elle-même.
              </span>
            </p>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={stale ? "default" : "outline"}
              size="sm"
              onClick={connect}
            >
              {stale ? "Réessayer" : "Rouvrir le navigateur"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={abandon}>
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="outline" size="lg" onClick={connect}>
          <KeyRoundIcon />
          Se connecter avec une clé d&apos;accès
        </Button>
      )}
    </div>
  );
}
