"use client";

import { useState } from "react";
import { usePermission } from "@/modules/auth";
import { Button } from "@/shared/ui/button";
import { Card, CardBody, CardHeader } from "@/shared/ui/card";
import { SelectField, TextAreaField, TextField } from "@/shared/ui/field";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { formatDateTime } from "@/shared/lib/format";
import * as api from "../lib/api";
import { INTERACTION_KIND, toOptions } from "../lib/labels";
import { useAction } from "../hooks/use-customers";
import { EnumBadge } from "./enum-badge";
import type { Interaction, InteractionKind, InteractionPayload, Project } from "../lib/types";

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

export function InteractionsCard({
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
  const [values, setValues] = useState<InteractionPayload>(emptyInteraction);

  const create = useAction((payload: InteractionPayload) =>
    api.createInteraction(customerId, {
      ...payload,
      occurred_at: new Date(payload.occurred_at).toISOString(),
    }),
  );
  const remove = useAction((id: string) => api.deleteInteraction(id));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!(await create.run(values))) return;
    setValues(emptyInteraction());
    onChanged();
  }

  return (
    <Card>
      <CardHeader
        title="Historique des échanges"
        description="Appels, relances, rendez-vous et rapports, dans l'ordre chronologique."
      />

      {canWrite && (
        <CardBody className="border-b border-border-subtle bg-surface-muted/40">
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-4">
            {create.error && (
              <div className="sm:col-span-4">
                <ErrorNotice message={create.error} />
              </div>
            )}
            <SelectField
              label="Type"
              options={toOptions(INTERACTION_KIND)}
              value={values.kind}
              onChange={(event) =>
                setValues({ ...values, kind: event.target.value as InteractionKind })
              }
            />
            <TextField
              label="Date"
              type="datetime-local"
              value={values.occurred_at}
              onChange={(event) => setValues({ ...values, occurred_at: event.target.value })}
            />
            <SelectField
              label="Projet lié"
              placeholder="Aucun"
              options={projects.map((p) => ({ value: p.id, label: p.label }))}
              value={values.project_id ?? ""}
              onChange={(event) =>
                setValues({ ...values, project_id: event.target.value || null })
              }
            />
            <TextField
              label="Résumé"
              required
              placeholder="Relance téléphonique"
              value={values.summary}
              error={create.fields.summary}
              onChange={(event) => setValues({ ...values, summary: event.target.value })}
            />
            <TextAreaField
              label="Détails"
              className="min-h-16"
              placeholder="Sans réponse, rappeler lundi."
              value={values.details}
              onChange={(event) => setValues({ ...values, details: event.target.value })}
            />
            <div className="flex items-end sm:col-span-4">
              <Button type="submit" size="sm" loading={create.pending}>
                Ajouter l&apos;échange
              </Button>
            </div>
          </form>
        </CardBody>
      )}

      {interactions.length === 0 ? (
        <EmptyState title="Aucun échange enregistré" />
      ) : (
        <ol className="divide-y divide-border-subtle">
          {interactions.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-4 px-5 py-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm text-foreground">
                  <EnumBadge value={item.kind} entries={INTERACTION_KIND} />
                  <span className="font-medium">{item.summary}</span>
                </p>
                {item.details && (
                  <p className="mt-1 text-xs whitespace-pre-line text-muted-foreground">
                    {item.details}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(item.occurred_at)}
                  {item.author_name && ` · ${item.author_name}`}
                </p>
              </div>
              {canWrite && (
                <Button
                  size="sm"
                  variant="ghost"
                  loading={remove.pending}
                  onClick={async () => {
                    await remove.run(item.id);
                    onChanged();
                  }}
                >
                  Supprimer
                </Button>
              )}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
