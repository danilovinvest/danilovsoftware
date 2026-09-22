"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { errorMessage } from "@/shared/api/errors";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/shared/ui/logo";
import { TextField } from "@/shared/ui/form";
import { ErrorNotice } from "@/shared/ui/feedback";
import { useAuth } from "../auth-context";
import { DevAccountPicker } from "./dev-account-picker";
import { PasskeyLoginButton } from "./passkey-login-button";
import { safeNext } from "../lib/safe-next";

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
      goToApp();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  // Après connexion on arrive sur la synthèse, pas sur la liste : elle dit
  // quoi faire aujourd'hui, là où la liste demande de chercher. `next` n'est
  // suivi que s'il désigne une page de ce site (`safeNext`).
  const goToApp = () => router.replace(safeNext(params.get("next")));

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <DevAccountPicker onSignedIn={goToApp} />

      <div className="flex flex-col gap-2">
        {/*
          Le bloc-marque en entier plutôt qu'une pastille surmontée du nom
          écrit une seconde fois : la page de connexion est le seul endroit du
          produit où l'on a la place de montrer le logo tel qu'il est, et le
          répéter en texte au-dessous ne disait rien de plus. Le titre reste,
          hors écran — c'est lui que lit un lecteur d'écran, et la structure
          des titres de la page ne dépend pas d'une image.
        */}
        <Wordmark className="h-9 self-start" />
        <h1 className="sr-only">OMPT CRM</h1>
        <p className="text-muted-foreground mt-2 text-sm">
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

      {/* La clé d'accès vient après le mot de passe, pas à sa place : c'est
          l'ordre de la doctrine — elle s'ajoute, et le mot de passe reste le
          trousseau de secours du jour où un appareil se perd. */}
      <PasskeyLoginButton onSignedIn={goToApp} />
    </form>
  );
}
