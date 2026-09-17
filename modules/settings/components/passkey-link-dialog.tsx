"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, KeyRoundIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorNotice, Spinner } from "@/shared/ui/feedback";
import { QrCode } from "@/shared/ui/qr-code";
import { ApiError, errorMessage } from "@/shared/api/errors";
import {
  createPasskeyEnrollment,
  passkeyEnrollUrl,
  revokePasskeyEnrollment,
} from "../lib/api";
import type { PasskeyEnrollment, WorkspaceUser } from "../lib/types";

/**
 * Transmettre à quelqu'un le moyen de créer sa clé d'accès.
 *
 * **Une clé ne s'envoie pas.** Sa moitié privée naît dans l'appareil de son
 * porteur : personne, pas même un dirigeant, ne peut en fabriquer une pour
 * autrui. Ce qui s'envoie, c'est ce lien à usage unique.
 *
 * D'où le **QR code**, qui n'est pas une coquetterie : la clé doit naître sur
 * l'appareil qui servira à entrer, et c'est le téléphone. Scanner l'écran y
 * amène la personne en un geste, là où un lien de soixante caractères collé
 * dans un SMS se retape mal. Le lien reste affiché juste en dessous, pour les
 * cas où l'on préfère l'envoyer soi-même.
 *
 * Le jeton n'est montré **qu'une fois** : la base n'en garde que l'empreinte,
 * comme pour une invitation ou une adresse de connecteur. C'est aussi pourquoi
 * un lien déjà en circulation ne peut pas être réaffiché — il faut le révoquer
 * et en émettre un autre, ce que cet écran propose plutôt que de le remplacer
 * en silence : celui qui a été transmis hier doit continuer de fonctionner
 * jusqu'à ce qu'on décide le contraire.
 */
export function PasskeyLinkDialog({
  user,
  live,
  onClose,
  onChanged,
}: {
  user: WorkspaceUser;
  /** Le lien déjà en circulation pour ce compte, s'il y en a un. */
  live: PasskeyEnrollment | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [link, setLink] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [encombre, setEncombre] = useState<boolean>(live !== null);

  const nom = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email;

  async function emettre() {
    setPending(true);
    setError(null);
    try {
      const created = await createPasskeyEnrollment(user.id);
      setLink(passkeyEnrollUrl(created.token));
      setEncombre(false);
      onChanged();
    } catch (cause) {
      // 409 : un lien vit déjà. Le dire, plutôt que d'écraser ce qui circule.
      if (cause instanceof ApiError && cause.status === 409) setEncombre(true);
      else setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  async function remplacer() {
    if (live === null) return;
    setPending(true);
    setError(null);
    try {
      await revokePasskeyEnrollment(live.id);
      const created = await createPasskeyEnrollment(user.id);
      setLink(passkeyEnrollUrl(created.token));
      setEncombre(false);
      // Une seule fois, après les deux écritures : recharger entre les deux
      // faisait deux allers-retours pour un état intermédiaire que personne ne
      // regarde.
      onChanged();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  async function copier() {
    if (link === null) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // Un navigateur peut refuser l'accès au presse-papiers : le champ reste
      // sélectionnable, et c'est ce qui compte.
      setCopied(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" data-demo="lien-de-cle">
        <DialogHeader>
          <DialogTitle className="text-base">Enrôler une clé d&apos;accès</DialogTitle>
          <DialogDescription>
            {link === null
              ? `${nom} créera sa clé sur son propre appareil : elle n'existe nulle part ailleurs, et personne ne peut la créer à sa place.`
              : `À transmettre à ${nom}. Le lien ne sera plus affiché.`}
          </DialogDescription>
        </DialogHeader>

        {error && <ErrorNotice message={error} />}

        {link === null && encombre && (
          <p className="text-warning bg-warning-soft/50 rounded-lg px-3 py-2 text-xs">
            Un lien est déjà en circulation pour ce compte. Il reste valable :
            son contenu n&apos;est plus affichable, seule son empreinte est
            conservée. Le remplacer révoque l&apos;ancien, qui ne fonctionnera
            plus.
          </p>
        )}

        {link !== null && (
          <div className="flex flex-col items-center gap-3">
            {/* Le QR code d'abord, et grand : c'est le chemin le plus court
                vers l'appareil où la clé doit naître. */}
            <QrCode
              value={link}
              label={`QR code du lien d'enrôlement de ${nom}`}
              /* Pas de classe de couleur : la polarité du code est fixée par le
                 composant, parce qu'elle est imposée par les lecteurs et par
                 le papier, pas par le thème. */
              className="size-44 rounded-md"
            />
            <p className="text-muted-foreground text-center text-xs">
              À scanner avec le téléphone de {user.first_name || nom} — c&apos;est
              là que la clé doit vivre.
            </p>
            <div className="flex w-full gap-2">
              <Input
                readOnly
                autoFocus
                value={link}
                onFocus={(event) => event.currentTarget.select()}
                className="font-mono text-xs"
              />
              <Button type="button" variant="outline" onClick={copier}>
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? "Copié" : "Copier"}
              </Button>
            </div>
            <p className="text-warning bg-warning-soft/50 w-full rounded-lg px-3 py-2 text-xs">
              Valable 7 jours, un seul usage. Perdu, il faut le révoquer et en
              créer un autre.
            </p>
          </div>
        )}

        <DialogFooter>
          {link !== null ? (
            <Button type="button" onClick={onClose}>
              Terminé
            </Button>
          ) : encombre ? (
            /* Désactivé quand on ignore quel lien révoquer — la liste n'est pas
               encore lue, ou sa lecture a échoué. Un bouton qui ne ferait rien
               serait pire que le dire. */
            <Button
              type="button"
              disabled={pending || live === null}
              title={
                live === null
                  ? "La liste des liens n'est pas disponible : rechargez l'écran."
                  : undefined
              }
              onClick={remplacer}
            >
              {pending && <Spinner />}
              Révoquer et créer un nouveau lien
            </Button>
          ) : (
            <Button type="button" disabled={pending} onClick={emettre}>
              {pending ? <Spinner /> : <KeyRoundIcon />}
              Créer le lien
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
