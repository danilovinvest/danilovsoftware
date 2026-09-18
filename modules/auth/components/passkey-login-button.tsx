"use client";

import { useEffect, useRef, useState } from "react";
import { KeyRoundIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/shared/ui/feedback";
import { errorMessage } from "@/shared/api/errors";
import { loginWithBrowser } from "@/shared/desktop/session";
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
 */
export function PasskeyLoginButton({ onSignedIn }: { onSignedIn: () => void }) {
  const { adoptSession } = useAuth();
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  // Quitter l'écran libère l'écoute : un retour tardif ne doit pas ouvrir une
  // session derrière un écran qui n'est plus là.
  useEffect(() => () => cancelRef.current?.(), []);

  async function connect() {
    cancelRef.current?.();
    setWaiting(true);
    setError(null);
    const attempt = loginWithBrowser<SessionResponse>();
    cancelRef.current = attempt.cancel;
    try {
      adoptSession(await attempt.session);
      onSignedIn();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      if (cancelRef.current === attempt.cancel) {
        cancelRef.current = null;
        setWaiting(false);
      }
    }
  }

  function abandon() {
    cancelRef.current?.();
    cancelRef.current = null;
    setWaiting(false);
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
        <div className="bg-muted/50 flex flex-col gap-2 rounded-lg border p-3 text-sm">
          <p>
            Terminez la connexion dans votre navigateur avec votre clé d&apos;accès.
            L&apos;application reprendra la main d&apos;elle-même.
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={connect}>
              Rouvrir le navigateur
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
