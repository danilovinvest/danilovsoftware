"use client";

import { useState } from "react";
import { KeyRoundIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorNotice } from "@/shared/ui/feedback";
import { errorMessage } from "@/shared/api/errors";
import { DEV_ACCOUNTS, DEV_LOGIN_ENABLED, type DevAccount } from "../lib/dev-accounts";
import { useAuth } from "../auth-context";

/**
 * Raccourci de connexion pour tester chaque rôle.
 *
 * Piloté par NEXT_PUBLIC_DEV_LOGIN, figé à la compilation : sans le drapeau,
 * le corps de la fonction et les identifiants disparaissent du bundle. Un
 * serveur de recette peut donc l'activer tout en tournant en build de
 * production.
 */
export function DevAccountPicker({ onSignedIn }: { onSignedIn: () => void }) {
  const { login } = useAuth();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!DEV_LOGIN_ENABLED || DEV_ACCOUNTS.length === 0) return null;

  async function signIn(account: DevAccount) {
    setPending(account.email);
    setError(null);
    try {
      await login(account.email, account.password);
      onSignedIn();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(null);
    }
  }

  return (
    <section className="border-border-subtle mb-6 flex flex-col gap-2 rounded-lg border border-dashed p-3">
      <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
        <KeyRoundIcon className="size-3.5" />
        Connexion rapide — développement uniquement
      </p>

      {error && <ErrorNotice message={error} />}

      <div className="flex flex-col gap-1">
        {DEV_ACCOUNTS.map((account) => (
          <Button
            key={account.email}
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending !== null}
            onClick={() => void signIn(account)}
            className="h-auto justify-start px-2 py-1.5 text-left"
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="shrink-0 font-medium">{account.label}</span>
                <span className="text-muted-foreground min-w-0 truncate font-mono text-[0.7rem]">
                  {account.email}
                </span>
              </span>
              <span className="text-muted-foreground text-xs font-normal">
                {pending === account.email ? "Connexion…" : account.hint}
              </span>
            </span>
          </Button>
        ))}
      </div>
    </section>
  );
}
