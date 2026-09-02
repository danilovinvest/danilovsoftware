"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
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
import { ApiError } from "@/shared/api/errors";
import { ErrorNotice, Spinner } from "@/shared/ui/feedback";
import { SelectField, TextField } from "@/shared/ui/form";
import { createInvitation, invitationUrl } from "../lib/api";
import type { Role } from "../lib/types";

/**
 * Émission d'un lien d'invitation.
 *
 * Le dialogue se joue en deux temps, et c'est délibéré : le lien n'existe
 * qu'une fois. La base n'en garde que le condensat SHA-256, exactement comme
 * pour un refresh token — refermer la fenêtre sans avoir copié le lien oblige à
 * en émettre un nouveau, et il vaut mieux que l'écran le dise.
 */
export function InviteDialog({
  roles,
  actorRank,
  onClose,
  onCreated,
}: {
  roles: Role[];
  actorRank: number;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    role: "user",
  });
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const assignable = roles
    .filter((role) => role.rank <= actorRank)
    .map((role) => ({ value: role.slug, label: role.name }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFields({});
    try {
      const created = await createInvitation({
        email: form.email.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        role: form.role,
      });
      setLink(invitationUrl(created.token));
      onCreated();
    } catch (cause) {
      if (cause instanceof ApiError && cause.isValidation) setFields(cause.fields);
      else setError(cause instanceof Error ? cause.message : "Échec de l'invitation.");
    } finally {
      setPending(false);
    }
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // Le presse-papier peut être refusé (contexte non sécurisé, permission) :
      // le champ reste sélectionnable à la main, ce n'est pas une impasse.
      setError("Copie impossible : sélectionnez le lien et copiez-le à la main.");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {link === null ? (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle className="text-base">Inviter quelqu&apos;un</DialogTitle>
              <DialogDescription>
                Un lien à usage unique, valable sept jours. L&apos;invité choisit
                lui-même son mot de passe : aucun secret ne transite par vous.
              </DialogDescription>
            </DialogHeader>

            {error && <ErrorNotice message={error} />}

            <TextField
              label="Adresse e-mail"
              type="email"
              required
              autoFocus
              placeholder="prenom.nom@exemple.fr"
              value={form.email}
              error={fields.email}
              onChange={(event) =>
                setForm((state) => ({ ...state, email: event.target.value }))
              }
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Prénom"
                hint="Pré-rempli à l'acceptation"
                value={form.first_name}
                onChange={(event) =>
                  setForm((state) => ({ ...state, first_name: event.target.value }))
                }
              />
              <TextField
                label="Nom"
                value={form.last_name}
                onChange={(event) =>
                  setForm((state) => ({ ...state, last_name: event.target.value }))
                }
              />
            </div>

            <SelectField
              label="Rôle"
              options={assignable}
              value={form.role}
              error={fields.role}
              onValueChange={(value) => setForm((state) => ({ ...state, role: value }))}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
                Annuler
              </Button>
              <Button type="submit" disabled={pending}>
                {pending && <Spinner />}
                Créer le lien
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle className="text-base">Lien créé</DialogTitle>
              <DialogDescription>
                Transmettez-le à {form.email}. Il expire dans sept jours et ne
                fonctionne qu&apos;une fois.
              </DialogDescription>
            </DialogHeader>

            {error && <ErrorNotice message={error} />}

            <div className="flex gap-2">
              <Input
                readOnly
                value={link}
                onFocus={(event) => event.currentTarget.select()}
                className="font-mono text-xs"
              />
              <Button type="button" variant="outline" onClick={copy}>
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? "Copié" : "Copier"}
              </Button>
            </div>

            <p className="text-warning bg-warning-soft/50 rounded-lg px-3 py-2 text-xs">
              Ce lien ne sera plus affiché : seule son empreinte est conservée.
              Si vous le perdez, révoquez l&apos;invitation et créez-en une autre.
            </p>

            <DialogFooter>
              <Button type="button" onClick={onClose}>
                Terminé
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
