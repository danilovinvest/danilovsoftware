"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRoundIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/shared/ui/logo";
import { ErrorNotice, Spinner } from "@/shared/ui/feedback";
import { errorMessage } from "@/shared/api/errors";
import { useAuth } from "../auth-context";
import * as authApi from "../lib/api";
import { ceremonyCancelled, enrollPasskey, passkeysSupported } from "../lib/passkeys";
import type { PasskeyEnrollPreview } from "../lib/types";

/**
 * Créer sa clé d'accès depuis un lien, sans session préalable.
 *
 * **Une clé d'accès ne s'envoie pas** : sa moitié privée naît dans l'appareil
 * de son porteur et n'en sort jamais. Ce que le dirigeant transmet, c'est ce
 * lien ; la clé, elle, se crée ici, sur l'appareil qui l'ouvre. C'est pourquoi
 * la page se veut lisible sur un téléphone avant tout : c'est là que la clé
 * doit vivre.
 *
 * La page est publique parce qu'elle ne peut pas être autre chose : la personne
 * n'a ni clé ni forcément mot de passe, et c'est précisément ce que le lien
 * vient réparer.
 */
export function PasskeyEnrollForm({ token }: { token: string }) {
  const router = useRouter();
  const { adoptSession } = useAuth();

  const [preview, setPreview] = useState<PasskeyEnrollPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    authApi
      .previewPasskeyEnrollment(token, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setPreview(data);
        setLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setInvalid(true);
        setLoading(false);
      });

    return () => controller.abort();
  }, [token]);

  async function create() {
    /*
      La compatibilité se vérifie **au clic**, jamais au rendu.

      Lire `window` pour décider d'afficher le bouton donnerait deux réponses —
      le serveur n'a pas de `window` — donc un écart d'hydratation, et le bouton
      resterait caché sur un appareil parfaitement capable. C'est la doctrine du
      bouton de connexion par clé, et elle vaut ici encore plus : cette page
      n'existe que pour ce geste.
    */
    if (!passkeysSupported()) {
      setError(
        "Ce navigateur ne sait pas créer de clé d'accès. Ouvrez ce lien depuis " +
          "votre téléphone, ou depuis un navigateur à jour.",
      );
      return;
    }
    setPending(true);
    setError(null);
    try {
      // Le lien ouvre la session dans la foulée : la personne vient de prouver
      // son identité à son appareil, lui demander de se connecter ensuite
      // serait un pas de plus pour rien.
      adoptSession(await enrollPasskey(token, ""));
      router.replace("/dashboard");
    } catch (cause) {
      // Fermer la feuille de Touch ID n'est pas un échec : on se tait.
      if (!ceremonyCancelled(cause)) setError(errorMessage(cause));
      setPending(false);
    }
  }

  if (loading) {
    return (
      <div className="text-muted-foreground flex min-h-32 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (invalid || preview === null) {
    return (
      <div className="flex flex-col gap-3 text-center">
        <h1 className="text-base font-semibold">Lien invalide</h1>
        <p className="text-muted-foreground text-sm">
          Ce lien a expiré, a déjà servi, ou n&apos;a jamais existé. Demandez-en
          un nouveau à la personne qui vous l&apos;a transmis.
        </p>
        <Button variant="outline" onClick={() => router.replace("/login")}>
          Aller à la connexion
        </Button>
      </div>
    );
  }

  const premiere = preview.key_count === 0;

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Wordmark className="h-7 self-start" />
        <h1 className="text-base font-semibold">
          {preview.first_name
            ? `Bonjour ${preview.first_name}`
            : "Créer votre clé d'accès"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {premiere
            ? "Créez votre clé d'accès : vous entrerez ensuite dans le CRM par " +
              "votre empreinte, votre visage ou le code de votre appareil, sans " +
              "mot de passe à retenir."
            : "Ajoutez une clé d'accès pour cet appareil. Celles que vous avez " +
              "déjà continuent de fonctionner."}
        </p>
      </div>

      {error && <ErrorNotice message={error} />}

      <dl className="divide-y rounded-lg border px-3">
        <div className="flex items-baseline justify-between gap-3 py-2">
          <dt className="text-muted-foreground text-xs">Compte</dt>
          <dd className="text-right text-xs font-medium">{preview.email_hint}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 py-2">
          <dt className="text-muted-foreground text-xs">Ce lien</dt>
          <dd className="text-right text-xs font-medium">7 jours, un seul usage</dd>
        </div>
      </dl>

      <Button type="button" size="lg" disabled={pending} onClick={create}>
        <KeyRoundIcon />
        {pending ? "Création…" : "Créer ma clé d'accès"}
      </Button>

      <p className="text-muted-foreground text-xs">
        La clé reste dans cet appareil : le CRM n&apos;en reçoit que la moitié
        publique, celle qui vérifie sans pouvoir signer.
      </p>
    </div>
  );
}
