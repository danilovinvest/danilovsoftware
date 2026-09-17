"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, errorMessage } from "@/shared/api/errors";
import { ErrorNotice } from "@/shared/ui/feedback";
import { SelectField, TextField } from "@/shared/ui/form";
import { SummaryLine, WizardNav, WizardSteps } from "@/shared/ui/wizard";
import { companyLabel, companyOptions } from "@/modules/group";
import { useAuth } from "@/modules/auth";
import { createInvitation, invitationUrl } from "../lib/api";
import type { Role } from "../lib/types";

/**
 * Invitation guidée.
 *
 * Trois temps parce qu'il y a trois décisions : qui, avec quels droits, et que
 * faire du lien. Le troisième n'est pas une étape de saisie mais le résultat —
 * le lien n'existe qu'une fois, la base n'en garde que le condensat, et le
 * séparer du formulaire évite de fermer la fenêtre sans l'avoir copié.
 */
const STEPS = [
  { title: "La personne", hint: "À qui le lien est destiné" },
  { title: "Son rôle", hint: "Ce qu'elle pourra faire en arrivant" },
  { title: "Le lien", hint: "À transmettre — il ne sera plus affiché" },
];

export function InviteWizard({
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
  const { account } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    role: "user",
    // Un appelant lié invite chez lui, et n'a rien à choisir.
    issuer: account?.issuer ?? "",
  });
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const assignable = roles.filter((role) => role.rank <= actorRank);
  const societes = companyOptions(account?.issuer ?? "");
  const chosen = roles.find((role) => role.slug === form.role);
  const fullName = [form.first_name, form.last_name].filter(Boolean).join(" ");

  function next() {
    if (step === 0 && !form.email.includes("@")) {
      setError("Une adresse e-mail valide est requise pour continuer.");
      return;
    }
    setError(null);
    setStep(1);
  }

  async function finish() {
    // La société est obligatoire, et le dire ici évite un aller-retour pour
    // s'entendre répondre la même chose. Le serveur la refuse aussi : c'est lui
    // qui protège, l'écran ne fait que l'annoncer plus tôt.
    if (form.issuer === "") {
      setFields({ issuer: "Choisissez la société où ce compte entre." });
      return;
    }
    setPending(true);
    setError(null);
    setFields({});
    try {
      const created = await createInvitation({
        email: form.email.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        role: form.role,
        issuer: form.issuer,
      });
      setLink(invitationUrl(created.token));
      setStep(2);
      onCreated();
    } catch (cause) {
      if (cause instanceof ApiError && cause.isValidation) {
        setFields(cause.fields);
        setStep(0);
      } else {
        setError(errorMessage(cause));
      }
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
      // Le presse-papier peut être refusé (permission, contexte non sécurisé) :
      // le champ reste sélectionnable à la main, ce n'est pas une impasse.
      setError("Copie impossible : sélectionnez le lien et copiez-le à la main.");
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex flex-col gap-4 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Inviter quelqu&apos;un</DialogTitle>
        </DialogHeader>

        <WizardSteps steps={STEPS} current={step} />

        <div>
          <h2 className="text-sm font-medium">{STEPS[step].title}</h2>
          <p className="text-muted-foreground text-xs">{STEPS[step].hint}</p>
        </div>

        {error && <ErrorNotice message={error} />}

        {step === 0 && (
          <div className="flex flex-col gap-4">
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
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <SelectField
              label="Rôle à l'arrivée"
              options={assignable.map((role) => ({
                value: role.slug,
                label: role.name,
              }))}
              value={form.role}
              error={fields.role}
              onValueChange={(value) => setForm((state) => ({ ...state, role: value }))}
            />

            {/* La société vient après le rôle : ce sont les deux dimensions de
                l'arrivée — ce qu'on peut faire, et pour laquelle des sociétés. */}
            <SelectField
              /* Un `id` et non un `data-demo` : `SelectField` ne transmet
                 aucun attribut arbitraire — il ne retient qu'un identifiant —
                 et un attribut à trait d'union échappe au contrôle de
                 TypeScript, donc il serait jeté en silence. */
              id="invite-company"
              label="Société"
              hint="Le CRM où le lien fait entrer"
              required
              placeholder="À choisir"
              options={societes}
              /* Plus d'option vide : « Tout le groupe » est une valeur de la
                 liste (`tous`), pas l'absence de réponse. Elle l'était, donc on
                 ouvrait l'accès aux deux sociétés en ne remplissant pas le
                 champ — exactement ce que le découpage vient d'empêcher. */
              value={form.issuer}
              error={fields.issuer}
              /* Un compte lié n'a qu'une société et aucun « tout le groupe » :
                 il n'y a rien à choisir, et un champ actif sans alternative
                 ferait chercher ce qu'on peut y changer. */
              disabled={Boolean(account?.issuer)}
              onValueChange={(value) => setForm((state) => ({ ...state, issuer: value }))}
            />

            {chosen && (
              <dl className="divide-y rounded-lg border px-3">
                <SummaryLine label="Invité" value={fullName || form.email} />
                <SummaryLine label="Adresse" value={form.email} />
                <SummaryLine
                  label="Permissions"
                  value={
                    chosen.grants_all
                      ? "toutes — rôle souverain"
                      : `${chosen.permission_count} permission${chosen.permission_count > 1 ? "s" : ""}`
                  }
                />
                {chosen.description && (
                  <SummaryLine label="Ce rôle" value={chosen.description} />
                )}
                <SummaryLine
                  label="Société"
                  value={companyLabel(form.issuer)}
                />
                <SummaryLine label="Validité du lien" value="7 jours, un seul usage" />
              </dl>
            )}
          </div>
        )}

        {step === 2 && link && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Input
                readOnly
                autoFocus
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
              Transmettez-le à {form.email}. Il ne sera plus affiché : seule son
              empreinte est conservée. Perdu, il faut révoquer l&apos;invitation
              et en créer une autre.
            </p>
          </div>
        )}

        {step === 2 ? (
          <div className="flex justify-end">
            <Button type="button" onClick={onClose}>
              Terminé
            </Button>
          </div>
        ) : (
          <WizardNav
            step={step}
            count={2}
            pending={pending}
            finishLabel="Créer le lien"
            size="sm"
            onBack={() => setStep(0)}
            onNext={next}
            onFinish={finish}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
