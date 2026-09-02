"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/shared/api/errors";
import { ErrorNotice, Spinner } from "@/shared/ui/feedback";
import { TextAreaField, TextField } from "@/shared/ui/form";
import { createRole, updateRole } from "../lib/api";
import type { Role } from "../lib/types";

/**
 * Création et renommage d'un rôle.
 *
 * Le slug ne se saisit qu'à la création, et il est ensuite immuable : il voyage
 * dans le jeton d'accès et sert de clé au rang des rôles. Le changer laisserait
 * des jetons valides désignant un rôle qui n'existe plus.
 *
 * Un rôle naît **sans aucune permission** : l'écran le dit, parce qu'un rôle
 * créé et aussitôt attribué ne donnerait accès à rien et laisserait croire à
 * une panne.
 */
export function RoleDialog({
  role,
  onClose,
  onSaved,
}: {
  /** Null pour une création. */
  role: Role | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    slug: role?.slug ?? "",
    name: role?.name ?? "",
    description: role?.description ?? "",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  // Le slug se déduit du nom tant que personne ne l'a touché : « Assistante de
  // direction » donne « assistante-de-direction », ce qui évite d'expliquer
  // une contrainte que l'utilisateur n'a pas envie de connaître.
  const [slugTouched, setSlugTouched] = useState(role !== null);

  function suggest(name: string): string {
    return name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 31);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFields({});
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
      };
      if (role) await updateRole(role.slug, payload);
      else await createRole({ ...payload, slug: form.slug.trim() });
      onSaved();
      onClose();
    } catch (cause) {
      if (cause instanceof ApiError && cause.isValidation) setFields(cause.fields);
      else setError(cause instanceof Error ? cause.message : "Échec de l'enregistrement.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle className="text-base">
              {role ? "Modifier le rôle" : "Nouveau rôle"}
            </DialogTitle>
            <DialogDescription>
              {role === null
                ? "Le rôle est créé sans aucune permission ; vous les cocherez ensuite."
                : role.is_system
                  ? "Rôle livré avec le CRM : son nom et sa description sont libres, son identifiant technique et son existence ne le sont pas."
                  : "L'identifiant technique n'est pas modifiable."}
            </DialogDescription>
          </DialogHeader>

          {error && <ErrorNotice message={error} />}

          <TextField
            label="Nom"
            required
            autoFocus
            placeholder="Assistante de direction"
            value={form.name}
            error={fields.name}
            onChange={(event) => {
              const name = event.target.value;
              setForm((state) => ({
                ...state,
                name,
                slug: slugTouched ? state.slug : suggest(name),
              }));
            }}
          />

          <TextField
            label="Identifiant technique"
            required
            disabled={role !== null}
            placeholder="assistante-de-direction"
            hint="Minuscules, chiffres et tirets. Définitif une fois le rôle créé."
            value={form.slug}
            error={fields.slug}
            onChange={(event) => {
              setSlugTouched(true);
              setForm((state) => ({ ...state, slug: event.target.value }));
            }}
          />

          <TextAreaField
            label="Description"
            placeholder="Ce que ce rôle permet, en une phrase."
            value={form.description}
            error={fields.description}
            onChange={(event) =>
              setForm((state) => ({ ...state, description: event.target.value }))
            }
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              {role ? "Enregistrer" : "Créer le rôle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
