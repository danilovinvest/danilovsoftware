"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { errorMessage } from "@/shared/api/errors";
import { Button } from "@/shared/ui/button";
import { TextField } from "@/shared/ui/field";
import { ErrorNotice } from "@/shared/ui/feedback";
import { useAuth } from "../auth-context";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await login(email, password);
      router.replace(params.get("next") ?? "/customers");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Connexion</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Accédez au CRM avec votre compte.
        </p>
      </div>

      {error && <ErrorNotice message={error} />}

      <TextField
        label="Adresse e-mail"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <TextField
        label="Mot de passe"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />

      <Button type="submit" loading={pending}>
        Se connecter
      </Button>
    </form>
  );
}
