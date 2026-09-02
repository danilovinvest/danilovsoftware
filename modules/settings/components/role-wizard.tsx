"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/modules/auth";
import { ApiError, errorMessage } from "@/shared/api/errors";
import { ErrorNotice } from "@/shared/ui/feedback";
import { TextAreaField, TextField } from "@/shared/ui/form";
import { SummaryLine, WizardNav, WizardSteps } from "@/shared/ui/wizard";
import { createRole, setRolePermissions } from "../lib/api";
import type { PermissionEntry } from "../lib/types";
import { PermissionMatrix, summarizeSelection } from "./permission-matrix";

/**
 * Création guidée d'un rôle.
 *
 * Créer un rôle demande deux décisions de nature différente — comment il
 * s'appelle, et ce qu'il permet — et l'API les traite en deux appels. Les poser
 * dans un même formulaire mélangeait une étiquette et une matrice de vingt
 * cases ; les enchaîner rend la seconde évidente au moment où elle se pose.
 *
 * La modification garde son formulaire simple : on sait déjà ce qu'on vient
 * changer.
 */
const STEPS = [
  { title: "Le rôle", hint: "Son nom, et l'identifiant qui le désignera" },
  { title: "Les permissions", hint: "Ce que ce rôle autorise dans le CRM" },
  { title: "Vérification", hint: "Un dernier coup d'œil avant création" },
];

function suggestSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 31);
}

export function RoleWizard({
  catalog,
  catalogLoading,
  onClose,
  onCreated,
}: {
  catalog: PermissionEntry[];
  catalogLoading: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { account } = useAuth();
  const held = useMemo(() => new Set(account?.permissions ?? []), [account]);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: "", slug: "", description: "" });
  const [slugTouched, setSlugTouched] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set<string>());

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  function toggle(slug: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function next() {
    if (step === 0) {
      if (form.name.trim() === "") {
        setError("Le nom du rôle est requis pour continuer.");
        return;
      }
      if (form.slug.trim() === "") {
        setError("L'identifiant technique est requis pour continuer.");
        return;
      }
    }
    setError(null);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  async function finish() {
    setPending(true);
    setError(null);
    setFields({});
    try {
      const created = await createRole({
        slug: form.slug.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
      });
      // Deux appels, parce que l'API refuse qu'un rôle naisse avec des
      // permissions. Si le second échoue, le rôle existe mais reste vide : on
      // le dit plutôt que de laisser croire à un échec complet.
      if (selected.size > 0) {
        try {
          await setRolePermissions(created.slug, [...selected]);
        } catch (cause) {
          onCreated();
          setError(
            `Le rôle « ${created.name} » a été créé, mais ses permissions n'ont pas pu être enregistrées : ${errorMessage(cause)}`,
          );
          setPending(false);
          return;
        }
      }
      onCreated();
      onClose();
    } catch (cause) {
      if (cause instanceof ApiError && cause.isValidation) {
        setFields(cause.fields);
        setStep(0);
      } else {
        setError(errorMessage(cause));
      }
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-4 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">Nouveau rôle</DialogTitle>
        </DialogHeader>

        <WizardSteps steps={STEPS} current={step} />

        <div>
          <h2 className="text-sm font-medium">{STEPS[step].title}</h2>
          <p className="text-muted-foreground text-xs">{STEPS[step].hint}</p>
        </div>

        {error && <ErrorNotice message={error} />}

        <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
          {step === 0 && (
            <div className="flex flex-col gap-4">
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
                    slug: slugTouched ? state.slug : suggestSlug(name),
                  }));
                }}
              />
              <TextField
                label="Identifiant technique"
                required
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
            </div>
          )}

          {step === 1 && (
            <PermissionMatrix
              catalog={catalog}
              held={held}
              selected={selected}
              loading={catalogLoading}
              onToggle={toggle}
            />
          )}

          {step === 2 && (
            <dl className="divide-y">
              <SummaryLine label="Nom" value={form.name} />
              <SummaryLine
                label="Identifiant"
                value={<span className="font-mono text-xs">{form.slug}</span>}
              />
              {form.description && (
                <SummaryLine label="Description" value={form.description} />
              )}
              <SummaryLine
                label="Permissions"
                value={
                  selected.size === 0
                    ? "aucune — le rôle ne donnera accès à rien"
                    : `${selected.size} sur ${summarizeSelection(catalog, selected)}`
                }
              />
              <SummaryLine label="Membres" value="aucun pour l'instant" />
            </dl>
          )}
        </div>

        <WizardNav
          step={step}
          count={STEPS.length}
          pending={pending}
          finishLabel="Créer le rôle"
          size="sm"
          onBack={() => setStep((current) => Math.max(current - 1, 0))}
          onNext={next}
          onFinish={finish}
        />
      </DialogContent>
    </Dialog>
  );
}
