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
import { SelectField, TextField } from "@/shared/ui/form";
import { ErrorNotice, Spinner } from "@/shared/ui/feedback";
import { ApiError } from "@/shared/api/errors";
import { companyOptions } from "@/modules/group";
import { useAuth } from "@/modules/auth";
import { setUserCompany, updateUser } from "../lib/api";
import type { Role, WorkspaceUser } from "../lib/types";

/**
 * Modification d'un compte.
 *
 * Les règles affichées ici ne sont qu'un reflet de celles que l'API applique :
 * on n'agit que sur un compte de rang strictement inférieur au sien, on
 * n'attribue pas un rôle au-dessus du sien, et on ne change ni son propre rôle
 * ni sa propre activation. Griser un champ évite un aller-retour inutile ; la
 * protection, elle, reste côté serveur.
 */
export function MemberDialog({
  user,
  roles,
  actorRank,
  isSelf,
  onClose,
  onSaved,
}: {
  user: WorkspaceUser;
  roles: Role[];
  /** Rang du compte connecté, pour borner les rôles proposés. */
  actorRank: number;
  isSelf: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  // Le formulaire est initialisé une fois, à l'ouverture. Le panneau monte ce
  // composant avec une clé portant l'identifiant de la cible : changer de
  // membre le remonte, plutôt que de le resynchroniser dans un effet.
  const [form, setForm] = useState({
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    role: user.role,
    issuer: user.issuer,
  });
  const [active, setActive] = useState(user.is_active);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const assignable = roles
    .filter((role) => role.rank <= actorRank)
    .map((role) => ({ value: role.slug, label: role.name }));

  // On ne range quelqu'un que dans une société qu'on détient soi-même : le
  // serveur le refuse, l'écran ne le propose donc pas.
  const { account } = useAuth();
  const societes = companyOptions(account?.issuer ?? "");

  // Rôle, adresse et activation voyagent dans le jeton d'accès : les changer
  // ferme les sessions de la personne. Le nom, non — et le dire évite qu'on
  // renonce à corriger une faute de peur de déconnecter un collègue.
  const disconnects =
    form.role !== user.role ||
    active !== user.is_active ||
    form.issuer !== user.issuer ||
    form.email.trim().toLowerCase() !== user.email.toLowerCase();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFields({});
    try {
      await updateUser(user.id, {
        email: form.email.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        role: form.role,
        is_active: active,
      });
      /*
        La société part par sa propre route, et seulement si elle a changé.

        Les deux écritures ne sont pas fusionnables : `PATCH /v1/users/{id}`
        remplace la ligne entière et n'emporte pas la société. Si la seconde
        échoue, la première reste appliquée — l'erreur s'affiche, et rouvrir le
        formulaire montre l'état réel plutôt qu'un succès inventé.
      */
      if (form.issuer !== user.issuer) {
        await setUserCompany(user.id, form.issuer);
      }
      onSaved();
      onClose();
    } catch (cause) {
      if (cause instanceof ApiError && cause.isValidation) setFields(cause.fields);
      else setError(cause instanceof Error ? cause.message : "Échec de la modification.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle className="text-base">Modifier le compte</DialogTitle>
            <DialogDescription>
              {isSelf
                ? "Votre propre compte : le nom et l'adresse sont modifiables, le rôle non."
                : `Compte créé le ${new Date(user.created_at).toLocaleDateString("fr-FR")}.`}
            </DialogDescription>
          </DialogHeader>

          {error && <ErrorNotice message={error} />}

          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Prénom"
              required
              value={form.first_name}
              error={fields.first_name}
              onChange={(event) =>
                setForm((state) => ({ ...state, first_name: event.target.value }))
              }
            />
            <TextField
              label="Nom"
              value={form.last_name}
              error={fields.last_name}
              onChange={(event) =>
                setForm((state) => ({ ...state, last_name: event.target.value }))
              }
            />
          </div>

          <TextField
            label="Adresse e-mail"
            type="email"
            required
            value={form.email}
            error={fields.email}
            onChange={(event) =>
              setForm((state) => ({ ...state, email: event.target.value }))
            }
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Rôle"
              options={assignable}
              value={form.role}
              error={fields.role}
              disabled={isSelf}
              onValueChange={(value) => setForm((state) => ({ ...state, role: value }))}
            />
            <SelectField
              label="Société"
              /* `SelectField` ne transmet pas d'attribut arbitraire : il ne
                 retient qu'un `id`. Un `data-demo` y serait jeté en silence,
                 et TypeScript ne le dirait pas — un attribut JSX à trait
                 d'union échappe au contrôle des propriétés en trop. La visite
                 guidée vise donc cet `id`, ce que sa doctrine prévoit. */
              id="member-company"
              options={societes}
              /* « Tout le groupe » n'est offert que par un compte qui le voit
                 lui-même : c'est la règle du serveur, et un choix qu'il
                 refuserait n'a rien à faire dans la liste. */
              emptyLabel={account?.issuer ? undefined : "Tout le groupe"}
              value={form.issuer}
              error={fields.issuer}
              disabled={isSelf}
              onValueChange={(value) =>
                setForm((state) => ({ ...state, issuer: value }))
              }
            />
            <SelectField
              label="Statut"
              options={[
                { value: "active", label: "Actif" },
                { value: "inactive", label: "Désactivé" },
              ]}
              value={active ? "active" : "inactive"}
              disabled={isSelf}
              onValueChange={(value) => setActive(value === "active")}
            />
          </div>

          {disconnects && (
            <p className="text-warning bg-warning-soft/50 rounded-lg px-3 py-2 text-xs">
              Changer le rôle, l&apos;adresse ou le statut ferme les sessions
              ouvertes de cette personne : elle devra se reconnecter. Un
              changement de nom seul ne la déconnecte pas.
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
