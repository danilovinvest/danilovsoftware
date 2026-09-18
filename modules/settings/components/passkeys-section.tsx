"use client";

import { useState } from "react";
import { CheckIcon, ExternalLinkIcon, KeyRoundIcon, PencilIcon, Trash2Icon } from "lucide-react";
import {
  createMyPasskeyEnrollment,
  deletePasskey,
  renamePasskey,
  type Passkey,
} from "@/modules/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorNotice, Skeleton, Spinner } from "@/shared/ui/feedback";
import { QrCode } from "@/shared/ui/qr-code";
import { errorMessage } from "@/shared/api/errors";
import { openExternal } from "@/shared/desktop/links";
import { formatDate } from "@/shared/lib/format";

import { usePasskeys } from "../hooks/use-settings";
import { passkeyEnrollUrl } from "../lib/api";
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
 *
 * **Aucune clé ne se crée dans l'application.** Une passkey est liée au domaine
 * du CRM, et la page de l'application vit sur `tauri://localhost`. « Ajouter »
 * émet donc un lien d'enrôlement pour soi-même — la route que l'accueil d'un
 * nouvel arrivant emprunte déjà — et le montre de deux façons : un QR code pour
 * le téléphone, où la clé doit vivre, et un bouton qui l'ouvre dans le
 * navigateur de cet ordinateur. Émettre un second lien remplace le premier : on
 * ne met personne dehors en se remplaçant soi-même.
 */
export function PasskeysSection() {
  const { passkeys, configured, loading, error, reload } = usePasskeys();
  const [link, setLink] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function add() {
    setPending(true);
    setFailure(null);
    try {
      const created = await createMyPasskeyEnrollment();
      setLink(passkeyEnrollUrl(created.token));
    } catch (cause) {
      setFailure(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  function done() {
    setLink(null);
    reload();
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
              Aucune clé pour l&apos;instant. Créez-en une sur votre téléphone ou
              dans le navigateur de cet ordinateur pour vous connecter ensuite
              sans saisir votre adresse.
            </p>
          ) : (
            <div className="divide-y rounded-lg border">
              {passkeys.map((passkey) => (
                <PasskeyRow key={passkey.id} passkey={passkey} onChanged={reload} />
              ))}
            </div>
          )}

          {link === null ? (
            <div>
              <Button
                size="sm"
                data-demo="passkey-add"
                disabled={pending || !configured}
                onClick={add}
              >
                {pending ? <Spinner /> : <KeyRoundIcon />}
                Ajouter une clé
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-lg border p-4">
              {/* Le QR code d'abord : c'est le chemin le plus court vers le
                  téléphone, l'appareil qu'on a toujours sur soi. */}
              <QrCode
                value={link}
                label="QR code de votre lien d'enrôlement"
                className="size-40 rounded-md"
              />
              <p className="text-muted-foreground text-center text-xs">
                Scannez-le avec votre téléphone, ou créez la clé sur cet
                ordinateur. Le lien sert une fois et vaut 7 jours.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button size="sm" variant="outline" onClick={() => void openExternal(link)}>
                  <ExternalLinkIcon />
                  Ouvrir dans le navigateur
                </Button>
                {/* La liste ne sait pas qu'une clé vient d'être créée ailleurs :
                    « Terminé » la relit. */}
                <Button size="sm" onClick={done}>
                  Terminé
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </SettingsSection>
  );
}

function PasskeyRow({
  passkey,
  onChanged,
}: {
  passkey: Passkey;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(passkey.name);
  const [pending, setPending] = useState(false);
  /*
   * L'échec se dit sur la ligne, jamais en silence.
   *
   * Le cas n'est pas théorique : deux onglets ouverts sur cet écran, la clé
   * retirée dans le premier, et le second — dont la liste n'a pas encore été
   * rechargée — reçoit un 404. Sans message, la ligne resterait affichée
   * indéfiniment et le bouton semblerait ne rien faire.
   */
  const [failure, setFailure] = useState<string | null>(null);

  async function save() {
    setPending(true);
    setFailure(null);
    try {
      await renamePasskey(passkey.id, name);
      setEditing(false);
      onChanged();
    } catch (cause) {
      setFailure(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    setPending(true);
    setFailure(null);
    try {
      await deletePasskey(passkey.id);
      onChanged();
    } catch (cause) {
      setFailure(errorMessage(cause));
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
        {/* L'échec prend la place de la date : c'est la seule chose à lire sur
            cette ligne tant qu'il n'est pas réglé. */}
        {failure ? (
          <p className="text-danger text-xs">{failure}</p>
        ) : (
          <p className="text-muted-foreground truncate text-xs">
            {passkey.last_used_at
              ? `Utilisée le ${formatDate(passkey.last_used_at)}`
              : "Jamais utilisée"}
          </p>
        )}
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
