"use client";

import { useState } from "react";
import { usePermission } from "@/modules/auth";
import { Button } from "@/shared/ui/button";
import { Card, CardHeader } from "@/shared/ui/card";
import { SelectField, TextField } from "@/shared/ui/field";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { Modal } from "@/shared/ui/modal";
import { formatAmount, formatDate } from "@/shared/lib/format";
import * as api from "../lib/api";
import {
  PAYMENT_STATUS,
  PROJECT_STATUS,
  QUOTE_KIND,
  QUOTE_STATUS,
  toOptions,
} from "../lib/labels";
import { useAction } from "../hooks/use-customers";
import { EnumBadge } from "./enum-badge";
import type { Project, ProjectPayload, Quote, QuotePayload } from "../lib/types";

const EMPTY_PROJECT: ProjectPayload = {
  label: "",
  status: "a_qualifier",
  site_address: "",
  site_postal_code: "",
  site_city: "",
  notes: "",
  started_at: null,
  closed_at: null,
};

const EMPTY_QUOTE: QuotePayload = {
  reference: "",
  kind: "etude",
  label: "",
  status: "a_faire",
  issued_at: null,
  amount_ht: null,
  amount_ttc: null,
  vat_rate: null,
  amount_note: "",
  deposit_status: "non_applicable",
  balance_status: "non_applicable",
  comment: "",
};

export function ProjectsCard({
  customerId,
  projects,
  quotes,
  onChanged,
}: {
  customerId: string;
  projects: Project[];
  quotes: Quote[];
  onChanged: () => void;
}) {
  const canWrite = usePermission("customers:write");
  const canWriteQuotes = usePermission("quotes:write");
  const canDeleteQuotes = usePermission("quotes:delete");

  const [projectOpen, setProjectOpen] = useState(false);
  const [project, setProject] = useState<ProjectPayload>(EMPTY_PROJECT);
  const [quoteFor, setQuoteFor] = useState<Project | null>(null);
  const [quote, setQuote] = useState<QuotePayload>(EMPTY_QUOTE);

  const createProject = useAction((payload: ProjectPayload) =>
    api.createProject(customerId, payload),
  );
  const createQuote = useAction((projectId: string, payload: QuotePayload) =>
    api.createQuote(projectId, payload),
  );
  const removeQuote = useAction((id: string) => api.deleteQuote(id));
  const removeProject = useAction((id: string) => api.deleteProject(id));

  async function submitProject(event: React.FormEvent) {
    event.preventDefault();
    if (!(await createProject.run(project))) return;
    setProject(EMPTY_PROJECT);
    setProjectOpen(false);
    onChanged();
  }

  async function submitQuote(event: React.FormEvent) {
    event.preventDefault();
    if (!quoteFor) return;
    if (!(await createQuote.run(quoteFor.id, quote))) return;
    setQuote(EMPTY_QUOTE);
    setQuoteFor(null);
    onChanged();
  }

  return (
    <Card>
      <CardHeader
        title="Projets et devis"
        description="Un projet par chantier ; un devis par étude, sondage ou lot de travaux."
        action={
          canWrite && (
            <Button size="sm" variant="secondary" onClick={() => setProjectOpen(true)}>
              Nouveau projet
            </Button>
          )
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          title="Aucun projet"
          description="Créez un projet pour rattacher les devis et le chantier."
        />
      ) : (
        <ul className="divide-y divide-border-subtle">
          {projects.map((item) => {
            const projectQuotes = quotes.filter((q) => q.project_id === item.id);
            return (
              <li key={item.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                      {item.label}
                      <EnumBadge value={item.status} entries={PROJECT_STATUS} />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[item.site_address, item.site_postal_code, item.site_city]
                        .filter(Boolean)
                        .join(", ") || "Adresse de chantier non renseignée"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium tabular-nums">
                      {formatAmount(item.total_amount_ttc)}
                    </span>
                    {canWriteQuotes && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setQuote(EMPTY_QUOTE);
                          setQuoteFor(item);
                        }}
                      >
                        + Devis
                      </Button>
                    )}
                    {canWrite && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          await removeProject.run(item.id);
                          onChanged();
                        }}
                      >
                        Supprimer
                      </Button>
                    )}
                  </div>
                </div>

                {projectQuotes.length > 0 && (
                  <div className="mt-3 overflow-x-auto rounded-lg border border-border-subtle">
                    <table className="w-full min-w-[40rem] text-xs">
                      <thead className="bg-surface-muted text-left text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">Référence</th>
                          <th className="px-3 py-2">Type</th>
                          <th className="px-3 py-2">Date</th>
                          <th className="px-3 py-2 text-right">HT</th>
                          <th className="px-3 py-2 text-right">TTC</th>
                          <th className="px-3 py-2">Statut</th>
                          <th className="px-3 py-2">Acompte</th>
                          {canDeleteQuotes && <th className="px-3 py-2" />}
                        </tr>
                      </thead>
                      <tbody>
                        {projectQuotes.map((q) => (
                          <tr key={q.id} className="border-t border-border-subtle">
                            <td className="px-3 py-2 font-mono">
                              {q.reference || "—"}
                              {q.label && (
                                <span className="block font-sans text-muted-foreground">
                                  {q.label}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <EnumBadge value={q.kind} entries={QUOTE_KIND} />
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {formatDate(q.issued_at)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {formatAmount(q.amount_ht)}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {q.amount_ttc ? formatAmount(q.amount_ttc) : q.amount_note || "—"}
                            </td>
                            <td className="px-3 py-2">
                              <EnumBadge value={q.status} entries={QUOTE_STATUS} />
                            </td>
                            <td className="px-3 py-2">
                              <EnumBadge value={q.deposit_status} entries={PAYMENT_STATUS} />
                            </td>
                            {canDeleteQuotes && (
                              <td className="px-3 py-2 text-right">
                                <button
                                  type="button"
                                  className="text-muted-foreground hover:text-danger"
                                  onClick={async () => {
                                    await removeQuote.run(q.id);
                                    onChanged();
                                  }}
                                >
                                  Supprimer
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={projectOpen}
        title="Nouveau projet"
        onClose={() => setProjectOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setProjectOpen(false)}>
              Annuler
            </Button>
            <Button form="project-form" type="submit" loading={createProject.pending}>
              Créer
            </Button>
          </>
        }
      >
        <form id="project-form" onSubmit={submitProject} className="grid gap-4 sm:grid-cols-2">
          {createProject.error && (
            <div className="sm:col-span-2">
              <ErrorNotice message={createProject.error} />
            </div>
          )}
          <TextField
            label="Intitulé"
            required
            className="sm:col-span-2"
            placeholder="Ex. Ouverture d'un mur porteur"
            value={project.label}
            error={createProject.fields.label}
            onChange={(event) => setProject({ ...project, label: event.target.value })}
          />
          <SelectField
            label="Statut"
            options={toOptions(PROJECT_STATUS)}
            value={project.status}
            onChange={(event) =>
              setProject({ ...project, status: event.target.value as ProjectPayload["status"] })
            }
          />
          <TextField
            label="Début"
            type="date"
            value={project.started_at ?? ""}
            onChange={(event) =>
              setProject({ ...project, started_at: event.target.value || null })
            }
          />
          <TextField
            label="Adresse du chantier"
            className="sm:col-span-2"
            value={project.site_address}
            onChange={(event) => setProject({ ...project, site_address: event.target.value })}
          />
          <TextField
            label="Code postal"
            value={project.site_postal_code}
            onChange={(event) =>
              setProject({ ...project, site_postal_code: event.target.value })
            }
          />
          <TextField
            label="Ville"
            value={project.site_city}
            onChange={(event) => setProject({ ...project, site_city: event.target.value })}
          />
        </form>
      </Modal>

      <Modal
        open={quoteFor !== null}
        title={quoteFor ? `Nouveau devis — ${quoteFor.label}` : "Nouveau devis"}
        onClose={() => setQuoteFor(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setQuoteFor(null)}>
              Annuler
            </Button>
            <Button form="quote-form" type="submit" loading={createQuote.pending}>
              Créer
            </Button>
          </>
        }
      >
        <form id="quote-form" onSubmit={submitQuote} className="grid gap-4 sm:grid-cols-2">
          {createQuote.error && (
            <div className="sm:col-span-2">
              <ErrorNotice message={createQuote.error} />
            </div>
          )}
          <TextField
            label="Référence"
            placeholder="DE2026-0092"
            value={quote.reference}
            error={createQuote.fields.reference}
            onChange={(event) => setQuote({ ...quote, reference: event.target.value })}
          />
          <SelectField
            label="Type"
            options={toOptions(QUOTE_KIND)}
            value={quote.kind}
            onChange={(event) =>
              setQuote({ ...quote, kind: event.target.value as QuotePayload["kind"] })
            }
          />
          <TextField
            label="Intitulé"
            className="sm:col-span-2"
            placeholder="sondages + étude + travaux"
            value={quote.label}
            onChange={(event) => setQuote({ ...quote, label: event.target.value })}
          />
          <TextField
            label="Montant HT"
            inputMode="decimal"
            placeholder="8050.00"
            value={quote.amount_ht ?? ""}
            error={createQuote.fields.amount_ht}
            onChange={(event) => setQuote({ ...quote, amount_ht: event.target.value || null })}
          />
          <TextField
            label="Montant TTC"
            inputMode="decimal"
            placeholder="8975.00"
            value={quote.amount_ttc ?? ""}
            onChange={(event) => setQuote({ ...quote, amount_ttc: event.target.value || null })}
          />
          <TextField
            label="Date du devis"
            type="date"
            value={quote.issued_at ?? ""}
            onChange={(event) => setQuote({ ...quote, issued_at: event.target.value || null })}
          />
          <SelectField
            label="Statut"
            options={toOptions(QUOTE_STATUS)}
            value={quote.status}
            onChange={(event) =>
              setQuote({ ...quote, status: event.target.value as QuotePayload["status"] })
            }
          />
          <SelectField
            label="Acompte"
            options={toOptions(PAYMENT_STATUS)}
            value={quote.deposit_status}
            onChange={(event) =>
              setQuote({
                ...quote,
                deposit_status: event.target.value as QuotePayload["deposit_status"],
              })
            }
          />
          <SelectField
            label="Solde"
            options={toOptions(PAYMENT_STATUS)}
            value={quote.balance_status}
            onChange={(event) =>
              setQuote({
                ...quote,
                balance_status: event.target.value as QuotePayload["balance_status"],
              })
            }
          />
          <TextField
            label="Montant non chiffré"
            className="sm:col-span-2"
            hint="Pour les fourchettes : « 5000-6000 € », « 6181,82 € (+2000) »"
            value={quote.amount_note}
            onChange={(event) => setQuote({ ...quote, amount_note: event.target.value })}
          />
        </form>
      </Modal>
    </Card>
  );
}
