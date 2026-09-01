"use client";

import { useState } from "react";
import { Trash2Icon } from "lucide-react";
import { usePermission } from "@/modules/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SelectField, TextAreaField, TextField } from "@/shared/ui/form";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
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
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-4">
        <CardTitle className="text-sm">Historique des échanges</CardTitle>
        <CardDescription className="text-xs">
          Appels, relances, rendez-vous et rapports, dans l&apos;ordre chronologique.
        </CardDescription>
      </CardHeader>

      {canWrite && (
        <CardContent className="bg-muted/40 border-b py-4">
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
              label="Projet lié"
              placeholder="Aucun"
              emptyLabel="Aucun"
              options={projects.map((p) => ({ value: p.id, label: p.label }))}
              value={values.project_id ?? ""}
              onValueChange={(value) =>
                setValues({ ...values, project_id: value || null })
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
              wrapperClassName="sm:col-span-3"
              className="min-h-16"
              placeholder="Sans réponse, rappeler lundi."
              value={values.details}
              onChange={(event) => setValues({ ...values, details: event.target.value })}
            />
            <div className="flex items-end">
              <Button type="submit" disabled={create.pending}>
                Ajouter l&apos;échange
              </Button>
            </div>
          </form>
        </CardContent>
      )}

      {interactions.length === 0 ? (
        <EmptyState title="Aucun échange enregistré" />
      ) : (
        <ol className="divide-y">
          {interactions.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-4 px-5 py-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <EnumBadge value={item.kind} entries={INTERACTION_KIND} />
                  <span className="font-medium">{item.summary}</span>
                </p>
                {item.details && (
                  <p className="text-muted-foreground mt-1 text-xs whitespace-pre-line">
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
  );
}
