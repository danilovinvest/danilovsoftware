"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CompassIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/shared/api/errors";
import { ErrorNotice, Spinner } from "@/shared/ui/feedback";
import { TextField } from "@/shared/ui/form";
import { formatDate } from "@/shared/lib/format";
import { useAuth } from "../auth-context";
import * as authApi from "../lib/api";
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
export function InvitationForm({ token }: { token: string }) {
  const router = useRouter();
  const { adoptSession } = useAuth();

  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);

  const [form, setForm] = useState({ first_name: "", last_name: "", password: "" });
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
      router.replace("/dashboard");
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
        <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg">
          <CompassIcon className="size-4" />
        </div>
        <div>
          <h1 className="text-base font-semibold">Rejoindre Danilov CRM</h1>
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
