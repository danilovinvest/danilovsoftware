"use client";

import { useState } from "react";
import { FilePlusIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { usePermission } from "@/modules/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SelectField, TextField } from "@/shared/ui/form";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { formatAmount, formatDate } from "@/shared/lib/format";
import * as api from "../lib/api";
import {
  PAYMENT_STATUS,
  PROJECT_OUTCOME,
  PROJECT_STAGE,
  QUOTE_KIND,
  QUOTE_STATUS,
  toOptions,
} from "../lib/labels";
import { useAction } from "../hooks/use-customers";
import { EnumBadge } from "./enum-badge";
import { RelanceButton } from "./relance-button";
import type {
  Project,
  ProjectOutcome,
  ProjectPayload,
  ProjectStage,
  Quote,
  QuotePayload,
} from "../lib/types";

const EMPTY_PROJECT: ProjectPayload = {
  label: "",
  stage: "demande_recue",
  outcome: null,
  outcome_note: "",
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
  const changeStage = useAction(
    (id: string, stage: ProjectStage, outcome: ProjectOutcome | null, note: string) =>
      api.setProjectStage(id, { stage, outcome, outcome_note: note }),
  );

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
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-4">
        <CardTitle className="text-sm">Projets et devis</CardTitle>
        <CardDescription className="text-xs">
          Un projet par chantier ; un devis par étude, sondage ou lot de travaux.
        </CardDescription>
        {canWrite && (
          <CardAction>
            <Button size="sm" variant="outline" onClick={() => setProjectOpen(true)}>
              <PlusIcon />
              Nouveau projet
            </Button>
          </CardAction>
        )}
      </CardHeader>

      {projects.length === 0 ? (
        <EmptyState
          title="Aucun projet"
          description="Créez un projet pour rattacher les devis et le chantier."
        />
      ) : (
        <ul className="divide-y">
          {projects.map((item) => {
            const projectQuotes = quotes.filter((q) => q.project_id === item.id);
            return (
              <li key={item.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {item.label}
                      <EnumBadge value={item.stage} entries={PROJECT_STAGE} />
                      {item.outcome && (
                        <EnumBadge value={item.outcome} entries={PROJECT_OUTCOME} />
                      )}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {[item.site_address, item.site_postal_code, item.site_city]
                        .filter(Boolean)
                        .join(", ") || "Adresse de chantier non renseignée"}
                      {item.outcome_note && ` — ${item.outcome_note}`}
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
                        <FilePlusIcon />
                        Devis
                      </Button>
                    )}
                    {canWrite && (
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Supprimer le projet ${item.label}`}
                        onClick={async () => {
                          await removeProject.run(item.id);
                          onChanged();
                        }}
                      >
                        <Trash2Icon />
                      </Button>
                    )}
                  </div>
                </div>

                {canWrite && (
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <SelectField
                      label="Étape"
                      wrapperClassName="w-52"
                      options={toOptions(PROJECT_STAGE)}
                      value={item.stage}
                      onValueChange={async (value) => {
                        await changeStage.run(
                          item.id,
                          value as ProjectStage,
                          item.outcome,
                          item.outcome_note,
                        );
                        onChanged();
                      }}
                    />
                    <SelectField
                      label="Issue"
                      wrapperClassName="w-52"
                      placeholder="L'affaire avance"
                      emptyLabel="L'affaire avance"
                      options={toOptions(PROJECT_OUTCOME)}
                      value={item.outcome ?? ""}
                      onValueChange={async (value) => {
                        await changeStage.run(
                          item.id,
                          item.stage,
                          (value || null) as ProjectOutcome | null,
                          value ? item.outcome_note : "",
                        );
                        onChanged();
                      }}
                    />
                    <RelanceButton
                      projectId={item.id}
                      lastReminderAt={item.last_reminder_at}
                      onDone={onChanged}
                      className="pb-2"
                    />
                  </div>
                )}

                {projectQuotes.length > 0 && (
                  <div className="mt-3 overflow-x-auto rounded-lg border">
                    <Table className="min-w-[40rem] text-xs">
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Référence</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">HT</TableHead>
                          <TableHead className="text-right">TTC</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Acompte</TableHead>
                          {canDeleteQuotes && <TableHead />}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {projectQuotes.map((q) => (
                          <TableRow key={q.id}>
                            <TableCell className="font-mono">
                              {q.reference || "—"}
                              {q.label && (
                                <span className="text-muted-foreground block font-sans">
                                  {q.label}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <EnumBadge value={q.kind} entries={QUOTE_KIND} />
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDate(q.issued_at)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatAmount(q.amount_ht)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {q.amount_ttc
                                ? formatAmount(q.amount_ttc)
                                : q.amount_note || "—"}
                            </TableCell>
                            <TableCell>
                              <EnumBadge value={q.status} entries={QUOTE_STATUS} />
                            </TableCell>
                            <TableCell>
                              <EnumBadge
                                value={q.deposit_status}
                                entries={PAYMENT_STATUS}
                              />
                            </TableCell>
                            {canDeleteQuotes && (
                              <TableCell className="text-right">
                                <Button
                                  size="icon-xs"
                                  variant="ghost"
                                  aria-label="Supprimer le devis"
                                  onClick={async () => {
                                    await removeQuote.run(q.id);
                                    onChanged();
                                  }}
                                >
                                  <Trash2Icon />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={projectOpen} onOpenChange={setProjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau projet</DialogTitle>
          </DialogHeader>
          <form id="project-form" onSubmit={submitProject} className="grid gap-4 sm:grid-cols-2">
            {createProject.error && (
              <div className="sm:col-span-2">
                <ErrorNotice message={createProject.error} />
              </div>
            )}
            <TextField
              label="Intitulé"
              required
              wrapperClassName="sm:col-span-2"
              placeholder="Ex. Ouverture d'un mur porteur"
              value={project.label}
              error={createProject.fields.label}
              onChange={(event) => setProject({ ...project, label: event.target.value })}
            />
            <SelectField
              label="Étape"
              options={toOptions(PROJECT_STAGE)}
              value={project.stage}
              onValueChange={(value) =>
                setProject({ ...project, stage: value as ProjectStage })
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
              wrapperClassName="sm:col-span-2"
              value={project.site_address}
              onChange={(event) =>
                setProject({ ...project, site_address: event.target.value })
              }
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
              onChange={(event) =>
                setProject({ ...project, site_city: event.target.value })
              }
            />
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectOpen(false)}>
              Annuler
            </Button>
            <Button form="project-form" type="submit" disabled={createProject.pending}>
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={quoteFor !== null} onOpenChange={(open) => !open && setQuoteFor(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {quoteFor ? `Nouveau devis — ${quoteFor.label}` : "Nouveau devis"}
            </DialogTitle>
          </DialogHeader>
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
              onValueChange={(value) =>
                setQuote({ ...quote, kind: value as QuotePayload["kind"] })
              }
            />
            <TextField
              label="Intitulé"
              wrapperClassName="sm:col-span-2"
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
              onChange={(event) =>
                setQuote({ ...quote, amount_ht: event.target.value || null })
              }
            />
            <TextField
              label="Montant TTC"
              inputMode="decimal"
              placeholder="8975.00"
              value={quote.amount_ttc ?? ""}
              onChange={(event) =>
                setQuote({ ...quote, amount_ttc: event.target.value || null })
              }
            />
            <TextField
              label="Date du devis"
              type="date"
              value={quote.issued_at ?? ""}
              onChange={(event) =>
                setQuote({ ...quote, issued_at: event.target.value || null })
              }
            />
            <SelectField
              label="Statut"
              options={toOptions(QUOTE_STATUS)}
              value={quote.status}
              onValueChange={(value) =>
                setQuote({ ...quote, status: value as QuotePayload["status"] })
              }
            />
            <SelectField
              label="Acompte"
              options={toOptions(PAYMENT_STATUS)}
              value={quote.deposit_status}
              onValueChange={(value) =>
                setQuote({
                  ...quote,
                  deposit_status: value as QuotePayload["deposit_status"],
                })
              }
            />
            <SelectField
              label="Solde"
              options={toOptions(PAYMENT_STATUS)}
              value={quote.balance_status}
              onValueChange={(value) =>
                setQuote({
                  ...quote,
                  balance_status: value as QuotePayload["balance_status"],
                })
              }
            />
            <TextField
              label="Montant non chiffré"
              wrapperClassName="sm:col-span-2"
              hint="Pour les fourchettes : « 5000-6000 € », « 6181,82 € (+2000) »"
              value={quote.amount_note}
              onChange={(event) => setQuote({ ...quote, amount_note: event.target.value })}
            />
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuoteFor(null)}>
              Annuler
            </Button>
            <Button form="quote-form" type="submit" disabled={createQuote.pending}>
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
