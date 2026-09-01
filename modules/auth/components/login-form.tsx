"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CompassIcon } from "lucide-react";
import { errorMessage } from "@/shared/api/errors";
import { Button } from "@/components/ui/button";
import { TextField } from "@/shared/ui/form";
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
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg">
          <CompassIcon className="size-4" />
        </div>
        <h1 className="mt-2 text-lg font-semibold">Danilov CRM</h1>
        <p className="text-muted-foreground text-sm">
          Connectez-vous pour accéder aux fiches client.
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

      <Button type="submit" size="lg" disabled={pending}>
        Se connecter
      </Button>
    </form>
  );
}
