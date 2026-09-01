"use client";

import { useState } from "react";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { usePermission } from "@/modules/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { SelectField, TextAreaField, TextField } from "@/shared/ui/form";
import { formatDateTime } from "@/shared/lib/format";
import * as api from "../lib/api";
import { INTERACTION_KIND, toOptions } from "../lib/labels";
import { useAction } from "../hooks/use-customers";
import { EnumBadge } from "./enum-badge";
import type {
  Interaction,
  InteractionKind,
  InteractionPayload,
  Project,
} from "../lib/types";

function emptyInteraction(): InteractionPayload {
  return {
    project_id: null,
    kind: "appel",
    // <input type="datetime-local"> attend une heure locale sans fuseau.
    occurred_at: new Date(Date.now() - new Date().getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 16),
    summary: "",
    details: "",
  };
}

/**
 * Onglet « Échanges ». Le formulaire reste replié : la page s'ouvre sur
 * l'historique, pas sur une saisie.
 */
export function InteractionsPanel({
  customerId,
  interactions,
  projects,
  onChanged,
}: {
  customerId: string;
  interactions: Interaction[];
  projects: Project[];
  onChanged: () => void;
}) {
  const canWrite = usePermission("customers:write");
  const [adding, setAdding] = useState(false);
  const [values, setValues] = useState<InteractionPayload>(emptyInteraction);

  const create = useAction(() =>
    api.createInteraction(customerId, {
      ...values,
      occurred_at: new Date(values.occurred_at).toISOString(),
    }),
  );
  const remove = useAction((id: string) => api.deleteInteraction(id));

  return (
    <div className="flex flex-col gap-4">
      {canWrite && !adding && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setValues(emptyInteraction());
              setAdding(true);
            }}
          >
            <PlusIcon />
            Ajouter un échange
          </Button>
        </div>
      )}

      {adding && (
        <Card className="p-5">
          <form
            className="grid gap-4 sm:grid-cols-3"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!(await create.run())) return;
              setAdding(false);
              onChanged();
            }}
          >
            {create.error && (
              <div className="sm:col-span-3">
                <ErrorNotice message={create.error} />
              </div>
            )}
            <SelectField
              label="Type"
              options={toOptions(INTERACTION_KIND)}
              value={values.kind}
              onValueChange={(value) =>
                setValues({ ...values, kind: value as InteractionKind })
              }
            />
            <TextField
              label="Date"
              type="datetime-local"
              value={values.occurred_at}
              onChange={(event) =>
                setValues({ ...values, occurred_at: event.target.value })
              }
            />
            <SelectField
              label="Affaire liée"
              placeholder="Aucune"
              emptyLabel="Aucune"
              options={projects.map((project) => ({
                value: project.id,
                label: project.label,
              }))}
              value={values.project_id ?? ""}
              onValueChange={(value) =>
                setValues({ ...values, project_id: value || null })
              }
            />
            <TextField
              label="Résumé"
              required
              wrapperClassName="sm:col-span-3"
              placeholder="Relance téléphonique"
              value={values.summary}
              error={create.fields.summary}
              onChange={(event) => setValues({ ...values, summary: event.target.value })}
            />
            <TextAreaField
              label="Détails"
              wrapperClassName="sm:col-span-3"
              className="min-h-20"
              placeholder="Sans réponse, rappeler lundi."
              value={values.details}
              onChange={(event) => setValues({ ...values, details: event.target.value })}
            />
            <div className="flex gap-2 sm:col-span-3">
              <Button type="submit" disabled={create.pending}>
                Enregistrer
              </Button>
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                Annuler
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="gap-0 py-0">
        {interactions.length === 0 ? (
          <EmptyState
            title="Aucun échange"
            description="Appels, relances, rendez-vous et rapports apparaîtront ici."
          />
        ) : (
          <ol className="divide-y">
            {interactions.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-4 px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <EnumBadge value={item.kind} entries={INTERACTION_KIND} />
                    <span className="font-medium">{item.summary}</span>
                  </p>
                  {item.details && (
                    <p className="text-muted-foreground mt-1 text-sm whitespace-pre-line">
                      {item.details}
                    </p>
                  )}
                  <p className="text-muted-foreground mt-1 text-xs">
                    {formatDateTime(item.occurred_at)}
                    {item.author_name && ` · ${item.author_name}`}
                  </p>
                </div>
                {canWrite && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Supprimer l'échange"
                    disabled={remove.pending}
                    onClick={async () => {
                      await remove.run(item.id);
                      onChanged();
                    }}
                  >
                    <Trash2Icon />
                  </Button>
                )}
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
