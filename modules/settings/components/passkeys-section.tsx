"use client";

import { useState } from "react";
import { CheckIcon, KeyRoundIcon, PencilIcon, Trash2Icon } from "lucide-react";
import {
  ceremonyCancelled,
  deletePasskey,
  passkeysSupported,
  registerPasskey,
  renamePasskey,
} from "@/modules/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorNotice, Skeleton } from "@/shared/ui/feedback";
import { errorMessage } from "@/shared/api/errors";

import { usePasskeys } from "../hooks/use-settings";
import { SettingsSection } from "./settings-page";

/**
 * Les clés d'accès du compte.
 *
 * Elles **s'ajoutent** au mot de passe, et la section le dit : une bascule
 * sèche laisserait sans accès le jour où un téléphone se perd. C'est pourquoi
 * retirer la dernière clé n'est pas empêché — le mot de passe reste.
 *
 * Elle est posée entre le mot de passe et les appareils, parce que c'est la même
 * question posée trois fois : comment j'entre, et depuis où.
 */
export function PasskeysSection() {
  const { passkeys, configured, loading, error, reload } = usePasskeys();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function add() {
    if (!passkeysSupported()) {
      setFailure("Ce navigateur ne sait pas créer de clé d'accès.");
      return;
    }
    setPending(true);
    setFailure(null);
    try {
      await registerPasskey(name);
      setName("");
      reload();
    } catch (cause) {
      if (!ceremonyCancelled(cause)) setFailure(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsSection
      title="Clés d'accès"
      description="Une empreinte ou un code d'appareil, à la place du mot de passe — qui reste actif, et reste votre secours."
    >
      {error ? (
        <ErrorNotice message={error} />
      ) : (
        <div className="flex flex-col gap-3" data-demo="passkeys">
          {failure && <ErrorNotice message={failure} />}

          {!configured && !loading && (
            <p className="text-warning text-xs">
              Les clés d&apos;accès ne sont pas configurées sur ce serveur : son
              domaine public n&apos;a pas pu être déterminé.
            </p>
          )}

          {loading ? (
            <Skeleton className="h-10 w-full" />
          ) : passkeys.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              Aucune clé pour l&apos;instant. Enregistrez-en une sur cet appareil
              pour vous connecter ensuite sans saisir votre adresse.
            </p>
          ) : (
            <div className="divide-y rounded-lg border">
              {passkeys.map((passkey) => (
                <PasskeyRow key={passkey.id} passkey={passkey} onChanged={reload} />
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-end gap-2">
            {/* Le nom est facultatif : sans lui, le serveur nomme la clé
                d'après ce qu'elle dit d'elle-même plutôt que de laisser une
                ligne anonyme qu'on n'oserait pas supprimer. */}
            <Input
              className="max-w-56"
              placeholder="iPhone de Grygoriy (facultatif)"
              aria-label="Nom de la clé"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Button size="sm" disabled={pending || !configured} onClick={add}>
              <KeyRoundIcon />
              {pending ? "Enregistrement…" : "Ajouter une clé"}
            </Button>
          </div>
        </div>
      )}
    </SettingsSection>
  );
}

function PasskeyRow({
  passkey,
  onChanged,
}: {
  passkey: { id: string; name: string; synced: boolean; last_used_at: string | null };
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(passkey.name);
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    try {
      await renamePasskey(passkey.id, name);
      setEditing(false);
      onChanged();
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setPending(true);
    try {
      await deletePasskey(passkey.id);
      onChanged();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <KeyRoundIcon className="text-muted-foreground size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        {editing ? (
          <Input
            className="h-7"
            aria-label="Nom de la clé"
            value={name}
            autoFocus
            onChange={(event) => setName(event.target.value)}
          />
        ) : (
          <p className="truncate text-sm">{passkey.name}</p>
        )}
        <p className="text-muted-foreground truncate text-xs">
          {passkey.last_used_at
            ? `Utilisée le ${new Date(passkey.last_used_at).toLocaleDateString("fr-FR")}`
            : "Jamais utilisée"}
        </p>
      </div>

      {/* « Synchronisée » veut dire que la clé vit ailleurs que sur cet
          appareil : le perdre ne fait pas perdre l'accès. */}
      {passkey.synced && (
        <Badge className="bg-success-soft text-success rounded-md">Synchronisée</Badge>
      )}

      {editing ? (
        <Button size="sm" disabled={pending || !name.trim()} onClick={save}>
          <CheckIcon />
          Enregistrer
        </Button>
      ) : (
        <Button
          variant="outline"
          size="icon"
          aria-label={`Renommer « ${passkey.name} »`}
          onClick={() => setEditing(true)}
        >
          <PencilIcon />
        </Button>
      )}
      <Button
        variant="outline"
        size="icon"
        disabled={pending}
        aria-label={`Retirer « ${passkey.name} »`}
        onClick={remove}
      >
        <Trash2Icon />
      </Button>
    </div>
  );
}
