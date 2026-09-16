"use client";

import { useState } from "react";
import { KeyRoundIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/shared/ui/feedback";
import { errorMessage } from "@/shared/api/errors";
import { useAuth } from "../auth-context";
import { ceremonyCancelled, loginWithPasskey, passkeysSupported } from "../lib/passkeys";

/**
 * Se connecter sans rien taper.
 *
 * Les clés sont enregistrées découvrables : le navigateur sait, pour ce
 * domaine, lesquelles il détient, et c'est lui qui demande laquelle utiliser.
 * Réclamer une adresse avant de prouver son identité par une empreinte serait
 * un pas de plus sans rien de gagné.
 *
 * **La compatibilité est vérifiée au clic, pas au rendu.** Lire `window` pour
 * décider d'afficher le bouton donnerait deux réponses — le serveur n'a pas de
 * `window`, le navigateur en a un — donc un écart d'hydratation, et le bouton
 * resterait caché sur un appareil parfaitement capable. Un refus expliqué vaut
 * mieux qu'un bouton absent.
 */
export function PasskeyLoginButton({ onSignedIn }: { onSignedIn: () => void }) {
  const { adoptSession } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    if (!passkeysSupported()) {
      setError("Ce navigateur ne sait pas utiliser de clé d'accès.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      adoptSession(await loginWithPasskey());
      onSignedIn();
    } catch (cause) {
      // Fermer la feuille de Touch ID n'est pas un échec : on se tait.
      if (!ceremonyCancelled(cause)) setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
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

      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled={pending}
        onClick={connect}
      >
        <KeyRoundIcon />
        {pending ? "Vérification…" : "Se connecter avec une clé d'accès"}
      </Button>
    </div>
  );
}
