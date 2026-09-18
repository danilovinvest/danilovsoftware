"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, CopyIcon, KeyRoundIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wordmark } from "@/shared/ui/logo";
import { QrCode } from "@/shared/ui/qr-code";
import { ApiError } from "@/shared/api/errors";
import { ErrorNotice, Spinner } from "@/shared/ui/feedback";
import { TextField } from "@/shared/ui/form";
import { formatDate } from "@/shared/lib/format";
import { useAuth } from "../auth-context";
import * as authApi from "../lib/api";
import { ceremonyCancelled, passkeysSupported, registerPasskey } from "../lib/passkeys";
import type { InvitationPreview } from "../lib/types";

/**
 * Page publique d'acceptation d'un lien d'invitation.
 *
 * Elle vit hors du groupe `(crm)` : `RequireAuth` renverrait l'invité vers la
 * page de connexion, alors qu'il n'a précisément pas encore de compte.
 *
 * L'invité choisit son mot de passe ici et nulle part ailleurs. C'est ce qui
 * distingue l'invitation d'un compte créé d'office : personne, pas même celui
 * qui invite, ne connaît le secret.
 */
/*
L'adresse du lien d'enrôlement, bâtie sur l'origine de la page.

Lue **à l'appel** et jamais au chargement du module : le serveur n'a pas de
`window`, et le CRM vit sur trois hôtes — une adresse figée enverrait l'arrivant
sur celui qui n'est pas le sien. La clé, elle, vaut pour les trois : son RPID est
l'apex.

La même fonction existe dans le module des réglages. La recopier ici plutôt que
de l'importer est délibéré : un module n'emprunte qu'à la surface publique d'un
autre, et trois lignes ne valent pas une dépendance entre l'authentification et
les réglages.
*/
function enrollUrl(token: string): string {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  return `${origin}/cle/${token}`;
}

export function InvitationForm({ token }: { token: string }) {
  const router = useRouter();
  const { adoptSession } = useAuth();

  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);

  const [form, setForm] = useState({ first_name: "", last_name: "", password: "" });
  // Le compte est créé et la session ouverte : on ne part pas encore, on
  // propose la clé. C'est le seul instant où l'on est sûr que la personne est
  // devant son appareil, et la clé est la façon d'entrer que le CRM veut.
  const [created, setCreated] = useState(false);
  /** Le jeton du lien à scanner, quand le serveur a pu l'émettre. */
  const [enrollToken, setEnrollToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  useEffect(() => {
    const controller = new AbortController();

    authApi
      .previewInvitation(token, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setPreview(data);
        // Le prénom et le nom saisis par celui qui invite servent d'amorce ;
        // l'invité reste libre de les corriger, c'est son nom.
        setForm((state) => ({
          ...state,
          first_name: data.first_name,
          last_name: data.last_name,
        }));
        setLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setInvalid(true);
        setLoading(false);
      });

    return () => controller.abort();
  }, [token]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFields({});
    try {
      const session = await authApi.acceptInvitation(token, {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        password: form.password,
      });
      adoptSession(session);
      setCreated(true);
      setPending(false);

      /*
        Le lien de son téléphone, demandé ici et pas dans un effet.

        La session vient d'être ouverte et la personne est devant l'écran : c'est
        le seul instant où les deux sont vrais. Le demander depuis un effet
        obligerait à un `setState` dans un effet, que ce dépôt proscrit, et pour
        rien — ce n'est pas une synchronisation avec un système extérieur, c'est
        la suite d'un geste.

        Un échec ne casse pas l'accueil : le bouton « sur cet appareil » reste, et
        la clé pourra s'ajouter plus tard depuis les réglages.
      */
      try {
        const { token: cle } = await authApi.createMyPasskeyEnrollment();
        setEnrollToken(cle);
      } catch {
        setEnrollToken(null);
      }
    } catch (cause) {
      if (cause instanceof ApiError && cause.isValidation) setFields(cause.fields);
      else setError(cause instanceof Error ? cause.message : "Échec de l'inscription.");
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

  /*
    Le compte existe : on propose la clé avant d'entrer.

    C'est ici que l'enrôlement coûte le moins : la session est ouverte, la
    personne est devant son appareil, et la route protégée d'enregistrement
    suffit — aucun lien, aucun jeton, rien à transmettre. Un compte créé par
    lien d'enrôlement, lui, passe par `/cle/<jeton>` : c'est le chemin de ceux
    qui ont déjà un compte mais aucune clé.

    « Plus tard » reste offert, et ce n'est pas une faiblesse : tant que les
    mots de passe existent, forcer la clé bloquerait quelqu'un dont le
    téléphone est dans une autre pièce. Le jour où l'on coupera les mots de
    passe, ce bouton devra disparaître.
  */
  if (created) {
    return (
      <div className="flex w-full flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Wordmark className="h-7 self-start" />
          <h1 className="text-base font-semibold">Votre compte est créé</h1>
          <p className="text-muted-foreground text-sm">
            Il reste à créer votre <strong>clé d&apos;accès</strong> : vous
            entrerez ensuite par votre empreinte, votre visage ou le code de
            votre appareil, sans mot de passe à retenir.
          </p>
        </div>

        {error && <ErrorNotice message={error} />}

        {/*
          Le QR d'abord, et c'est délibéré.

          Une clé d'accès vit dans **l'appareil** qui la crée. Or on accepte une
          invitation sur l'ordinateur qu'on a sous la main : créer la clé ici la
          laisserait sur cet ordinateur, et le téléphone — celui qu'on a toujours
          sur soi — n'ouvrirait rien. Scanner déplace la création là où elle doit
          se faire, en un geste et sans rien retaper.

          Le lien reste affiché en dessous pour qui n'a pas de caméra, et le
          bouton « sur cet appareil » garde sa place pour qui arrive déjà depuis
          son téléphone.
        */}
        {enrollToken !== null && (
          <div className="flex flex-col items-center gap-3 rounded-lg border p-4">
            <QrCode
              value={enrollUrl(enrollToken)}
              label="QR code pour créer votre clé d'accès sur votre téléphone"
              className="size-44 rounded-md"
            />
            <p className="text-center text-sm font-medium">
              Scannez avec votre téléphone
            </p>
            <p className="text-muted-foreground text-center text-xs">
              C&apos;est là que la clé doit vivre : c&apos;est l&apos;appareil que
              vous aurez toujours sur vous. Valable 7 jours, un seul usage.
            </p>
            <div className="flex w-full gap-2">
              <Input
                readOnly
                value={enrollUrl(enrollToken)}
                onFocus={(event) => event.currentTarget.select()}
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(enrollUrl(enrollToken));
                    setCopied(true);
                  } catch {
                    // Un navigateur peut refuser le presse-papiers : le champ
                    // reste sélectionnable, et c'est ce qui compte.
                    setCopied(false);
                  }
                }}
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? "Copié" : "Copier"}
              </Button>
            </div>
          </div>
        )}

        <Button
          type="button"
          size="lg"
          disabled={pending}
          onClick={async () => {
            // Au clic, jamais au rendu : lire `window` pour décider d'afficher
            // le bouton donnerait deux réponses, donc un écart d'hydratation.
            if (!passkeysSupported()) {
              setError("Cet appareil ne sait pas créer de clé d'accès.");
              return;
            }
            setPending(true);
            setError(null);
            try {
              await registerPasskey("");
              router.replace("/dashboard");
            } catch (cause) {
              if (!ceremonyCancelled(cause)) {
                setError(cause instanceof Error ? cause.message : "Échec de la création.");
              }
              setPending(false);
            }
          }}
        >
          {pending ? <Spinner /> : <KeyRoundIcon />}
          {pending
            ? "Création…"
            : enrollToken !== null
              ? "Ou créer la clé sur cet appareil"
              : "Créer ma clé d'accès"}
        </Button>

        <Button variant="ghost" onClick={() => router.replace("/dashboard")}>
          Plus tard
        </Button>
      </div>
    );
  }

  if (invalid || preview === null) {
    return (
      <div className="flex flex-col gap-3 text-center">
        <h1 className="text-base font-semibold">Lien invalide</h1>
        <p className="text-muted-foreground text-sm">
          Ce lien d&apos;invitation a expiré, a déjà été utilisé, ou n&apos;a
          jamais existé. Demandez-en un nouveau à la personne qui vous a invité.
        </p>
        <Button variant="outline" onClick={() => router.replace("/login")}>
          Aller à la connexion
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Wordmark className="h-7 self-start" />
        <div className="mt-1">
          <h1 className="text-base font-semibold">Rejoindre OMPT CRM</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Invitation pour {preview.email_hint} · rôle {preview.role_name}.
          </p>
          <p className="text-muted-foreground/70 mt-0.5 text-xs">
            Ce lien est valable jusqu&apos;au {formatDate(preview.expires_at)} et ne
            fonctionne qu&apos;une fois.
          </p>
        </div>
      </div>

      {error && <ErrorNotice message={error} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Prénom"
          required
          autoFocus
          value={form.first_name}
          error={fields.first_name}
          onChange={(event) =>
            setForm((state) => ({ ...state, first_name: event.target.value }))
          }
        />
        <TextField
          label="Nom"
          value={form.last_name}
          error={fields.last_name}
          onChange={(event) =>
            setForm((state) => ({ ...state, last_name: event.target.value }))
          }
        />
      </div>

      <TextField
        label="Mot de passe"
        type="password"
        required
        autoComplete="new-password"
        hint="Au moins 10 caractères. Personne d'autre ne le connaîtra."
        value={form.password}
        error={fields.password}
        onChange={(event) =>
          setForm((state) => ({ ...state, password: event.target.value }))
        }
      />

      <Button type="submit" disabled={pending}>
        {pending && <Spinner />}
        Créer mon compte
      </Button>
    </form>
  );
}
