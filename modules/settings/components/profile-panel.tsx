"use client";

import { useState } from "react";
import {
  changePassword,
  logoutAll,
  updateProfile,
  useAuth,
} from "@/modules/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorNotice } from "@/shared/ui/feedback";
import { GradientAvatar } from "@/shared/ui/gradient-avatar";
import { TextField } from "@/shared/ui/form";
import { errorMessage } from "@/shared/api/errors";
import { askConfirm } from "@/shared/ui/confirm";
import { initials } from "@/shared/lib/format";
import { DeviceList } from "./device-list";
import { PasskeysSection } from "./passkeys-section";
import { SettingsPage, SettingsSection } from "./settings-page";

export function ProfilePanel() {
  const { account } = useAuth();
  if (!account) return null;

  return (
    <SettingsPage title="Profil" description="Votre compte et vos accès.">
      <PictureSection email={account.email} name={displayName(account)} />
      <NameSection />
      <EmailSection email={account.email} />
      <PasswordSection />
      <PasskeysSection />
      <DeviceList />
      <DangerZone />
    </SettingsPage>
  );
}

function displayName(account: { first_name: string; last_name: string; email: string }) {
  return (
    [account.first_name, account.last_name].filter(Boolean).join(" ") || account.email
  );
}

/**
 * L'avatar est calculé, pas téléversé : les couleurs découlent de l'adresse
 * e-mail par l'algorithme de vercel/avatar, reproduit dans le navigateur.
 *
 * Les boutons « Téléverser » et « Retirer » de Twenty étaient affichés grisés
 * pour dire ce qui manquait — un stockage d'images. Un bouton qui ne fait rien
 * promet une fonction qui n'existe pas : ils sont partis, et reviendront avec
 * le stockage.
 */
function PictureSection({ email, name }: { email: string; name: string }) {
  return (
    <SettingsSection title="Photo">
      <div className="flex items-center gap-4">
        <GradientAvatar seed={email} text={initials(name)} size={64} rounded={8} />
        <p className="text-muted-foreground text-xs">
          Votre avatar est généré à partir de votre adresse : il vous distingue des autres
          dans le CRM.
        </p>
      </div>
    </SettingsSection>
  );
}

function NameSection() {
  const { account, refreshAccount } = useAuth();
  const [firstName, setFirstName] = useState(account?.first_name ?? "");
  const [lastName, setLastName] = useState(account?.last_name ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty =
    firstName !== (account?.first_name ?? "") || lastName !== (account?.last_name ?? "");

  async function save() {
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      await updateProfile(firstName, lastName);
      // Le compte en contexte porte le nom affiché partout ailleurs : il doit
      // être rechargé, sinon la barre latérale garderait l'ancien.
      await refreshAccount();
      setSaved(true);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsSection
      title="Nom"
      description="Votre nom tel qu'il apparaît dans le CRM."
      action={
        dirty && (
          <Button size="sm" disabled={pending} onClick={save}>
            {pending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        )
      }
    >
      {error && <ErrorNotice message={error} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Prénom"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
        />
        <TextField
          label="Nom"
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
        />
      </div>
      {saved && !dirty && (
        <p className="text-success text-xs">Nom mis à jour.</p>
      )}
    </SettingsSection>
  );
}

/*
  L'adresse se lit, elle ne se modifie pas ici : c'est l'identifiant de
  connexion, et la changer relève de `users:write`, pas du libre-service. Le
  crayon grisé qui l'accompagnait promettait une modification que rien ne
  permettait — l'écran dit à la place à qui la demander.

  L'authentification à deux facteurs, affichée « désactivée » sous cette
  section, a disparu pour la même raison : l'API n'a ni secret TOTP ni codes de
  secours. Les clés d'accès, plus bas, sont la protection qui existe.
*/
function EmailSection({ email }: { email: string }) {
  return (
    <SettingsSection
      title="E-mail"
      description="L'adresse associée à votre compte. Pour la changer, adressez-vous à un administrateur."
    >
      <Input value={email} readOnly className="text-muted-foreground" />
    </SettingsSection>
  );
}

/**
 * Twenty envoie un lien par e-mail ; le CRM n'a pas de service d'envoi, mais il
 * a `POST /v1/auth/password`. On propose donc le vrai changement de mot de
 * passe plutôt qu'un bouton mort.
 */
function PasswordSection() {
  const { endSession } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFields({});
    try {
      await changePassword(current, next);
      // L'API révoque toutes les sessions au changement de mot de passe : il
      // faut se reconnecter. La session est oubliée ici aussi — la garde
      // renvoie alors à la connexion, qui dit pourquoi.
      await endSession("mot-de-passe");
    } catch (cause) {
      setError(errorMessage(cause));
      if (cause && typeof cause === "object" && "fields" in cause) {
        setFields((cause as { fields: Record<string, string> }).fields);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <SettingsSection
      title="Mot de passe"
      description="Le changer ferme toutes vos sessions, sur cet appareil comme sur les autres."
    >
      <form onSubmit={submit} className="flex flex-col gap-3">
        {error && !Object.keys(fields).length && <ErrorNotice message={error} />}
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Mot de passe actuel"
            type="password"
            autoComplete="current-password"
            value={current}
            error={fields.current_password}
            onChange={(event) => setCurrent(event.target.value)}
          />
          <TextField
            label="Nouveau mot de passe"
            type="password"
            autoComplete="new-password"
            hint="10 caractères minimum."
            value={next}
            error={fields.new_password}
            onChange={(event) => setNext(event.target.value)}
          />
        </div>
        <Button
          type="submit"
          size="sm"
          className="w-fit"
          disabled={pending || !current || !next}
        >
          {pending ? "Changement…" : "Changer le mot de passe"}
        </Button>
      </form>
    </SettingsSection>
  );
}

function DangerZone() {
  const { endSession } = useAuth();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function closeAll() {
    const ok = await askConfirm({
      title: "Fermer toutes vos sessions",
      description:
        "Tous vos appareils seront déconnectés, celui-ci compris. Il faudra vous reconnecter partout.",
      confirmLabel: "Tout fermer",
    });
    if (!ok) return;
    setPending(true);
    setError(null);
    try {
      await logoutAll();
      await endSession("sessions-fermees");
    } catch (cause) {
      // Rien n'est fermé : on le dit plutôt que de renvoyer à la connexion
      // en laissant croire que les autres appareils l'ont été.
      setError(errorMessage(cause));
      setPending(false);
    }
  }

  return (
    <SettingsSection
      title="Zone de danger"
      description="Ferme les sessions de tous vos appareils, celui-ci compris."
    >
      {error && <ErrorNotice message={error} />}
      <div
        data-demo="profil-tout-fermer"
        className="border-danger/30 flex items-center justify-between gap-4 rounded-lg border px-3 py-2.5"
      >
        <div>
          <p className="text-sm">Se déconnecter partout</p>
          <p className="text-muted-foreground text-xs">
            À utiliser si vous pensez qu&apos;un appareil vous échappe.
          </p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={() => void closeAll()}
        >
          {pending ? "Fermeture…" : "Tout fermer"}
        </Button>
      </div>
    </SettingsSection>
  );
}
