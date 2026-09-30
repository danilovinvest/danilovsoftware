"use client";

import { useState } from "react";
import { CheckIcon, SendIcon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError, errorMessage } from "@/shared/api/errors";
import { Spinner } from "@/shared/ui/feedback";
import { TextField } from "@/shared/ui/form";
import { useAuth } from "@/modules/auth";
import * as api from "../lib/api";
import type { MailAccount } from "../lib/types";

type Outcome =
  | { kind: "idle" }
  | { kind: "sent"; from: string; to: string }
  | { kind: "failed"; message: string };

/**
 * L'essai d'envoi d'une boîte raccordée.
 *
 * Une boîte raccordée sait lire, ce que la copie prouve à chaque tour. Rien ne
 * prouvait qu'elle sait **envoyer** : le mot de passe d'application est le
 * même, mais l'envoi passe par un autre serveur (SMTP), qui peut refuser là où
 * l'IMAP accepte. D'où un bouton qui envoie un vrai message et rend la réponse
 * du serveur telle quelle.
 *
 * Le destinataire est proposé, jamais imposé : l'adresse de la personne
 * connectée par défaut, parce que c'est elle qui ira vérifier la réception.
 *
 * Le composant se pose dans la ligne de la boîte, qui est un `flex-wrap` : le
 * formulaire prend toute la largeur et passe donc dessous, sans que le
 * panneau ait à connaître l'état « déplié ».
 */
export function SendTest({ account, disabled }: { account: MailAccount; disabled?: boolean }) {
  const { account: me } = useAuth();
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(me?.email ?? "");
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });

  async function send() {
    const recipient = to.trim();
    setPending(true);
    setOutcome({ kind: "idle" });
    try {
      const result = await api.sendTestMail(account.id, recipient);
      setOutcome({ kind: "sent", from: result.from, to: recipient });
    } catch (cause) {
      // L'adresse refusée revient par champ ; tout le reste par le message.
      const message =
        cause instanceof ApiError && cause.fields.to ? cause.fields.to : errorMessage(cause);
      setOutcome({ kind: "failed", message });
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-7"
        onClick={() => {
          // Replié puis rouvert, le formulaire repart de zéro : un « Parti… »
          // d'il y a dix minutes se lirait comme le résultat d'un essai récent.
          setOutcome({ kind: "idle" });
          setOpen((value) => !value);
        }}
        disabled={disabled}
        aria-expanded={open}
      >
        <SendIcon className="size-3.5" />
        Tester l&apos;envoi
      </Button>

      {open && (
        <form
          className="bg-muted/30 flex w-full flex-col gap-2 rounded-lg border p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <div className="flex flex-wrap items-end gap-2">
            <TextField
              label="Envoyer l'essai à"
              type="email"
              required
              value={to}
              onChange={(event) => setTo(event.target.value)}
              placeholder="vous@exemple.fr"
              wrapperClassName="min-w-56 flex-1"
            />
            <Button type="submit" size="sm" disabled={pending || !to.trim()}>
              {pending ? <Spinner className="size-3.5" /> : <SendIcon className="size-3.5" />}
              Envoyer
            </Button>
          </div>

          {outcome.kind === "sent" && (
            <p className="text-success flex items-start gap-1.5 text-xs" role="status">
              <CheckIcon className="mt-px size-3.5 shrink-0" />
              <span>
                Parti de {outcome.from} vers {outcome.to}. S&apos;il n&apos;arrive pas
                dans la minute, regardez les indésirables.
              </span>
            </p>
          )}
          {/*
            Le refus se lit sous le formulaire et non sous le champ : la réponse
            d'un serveur d'envoi est une phrase longue, qui décalerait le bouton.
          */}
          {outcome.kind === "failed" && (
            <p className="text-danger flex items-start gap-1.5 text-xs" role="alert">
              <TriangleAlertIcon className="mt-px size-3.5 shrink-0" />
              <span>{outcome.message}</span>
            </p>
          )}
          {outcome.kind === "idle" && (
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Un vrai message part de {account.email}, par le serveur d&apos;envoi du
              même compte. Le texte est fixe et dit qui a demandé l&apos;essai.
            </p>
          )}
        </form>
      )}
    </>
  );
}
