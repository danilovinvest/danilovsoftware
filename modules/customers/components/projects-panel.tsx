"use client";

import { useState } from "react";
import { FilePlusIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { usePermission } from "@/modules/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/shared/ui/feedback";
import { SelectField, TextField } from "@/shared/ui/form";
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
import { ProjectDialog, QuoteDialog } from "./project-dialogs";
import { RelanceButton } from "./relance-button";
import type { Project, ProjectOutcome, ProjectStage, Quote } from "../lib/types";

/**
 * Onglet « Affaires ». Une affaire tient dans un bloc : son intitulé, son
 * avancement, ses devis. L'action courante — faire avancer l'étape — est un
 * seul menu ; marquer un blocage, plus rare, passe par un bouton secondaire.
 */
export function ProjectsPanel({
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

  const [projectOpen, setProjectOpen] = useState(false);
  const [quoteFor, setQuoteFor] = useState<Project | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {canWrite && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setProjectOpen(true)}>
            <PlusIcon />
            Nouvelle affaire
          </Button>
        </div>
      )}

      {projects.length === 0 ? (
        <Card>
          <EmptyState
            title="Aucune affaire"
            description="Créez une affaire pour y rattacher les devis et le chantier."
          />
        </Card>
      ) : (
        projects.map((project) => (
          <ProjectBlock
            key={project.id}
            project={project}
            quotes={quotes.filter((quote) => quote.project_id === project.id)}
            canWrite={canWrite}
            canWriteQuotes={canWriteQuotes}
            onAddQuote={() => setQuoteFor(project)}
            onChanged={onChanged}
          />
        ))
      )}

      <ProjectDialog
        key={projectOpen ? "project-open" : "project-closed"}
        customerId={customerId}
        open={projectOpen}
        onOpenChange={setProjectOpen}
        onSaved={onChanged}
      />
      <QuoteDialog
        key={quoteFor?.id ?? "quote-closed"}
        project={quoteFor}
        onOpenChange={(open) => !open && setQuoteFor(null)}
        onSaved={onChanged}
      />
    </div>
  );
}

function ProjectBlock({
  project,
  quotes,
  canWrite,
  canWriteQuotes,
  onAddQuote,
  onChanged,
}: {
  project: Project;
  quotes: Quote[];
  canWrite: boolean;
  canWriteQuotes: boolean;
  onAddQuote: () => void;
  onChanged: () => void;
}) {
  const changeStage = useAction(
    (stage: ProjectStage, outcome: ProjectOutcome | null, note: string) =>
      api.setProjectStage(project.id, { stage, outcome, outcome_note: note }),
  );
  const remove = useAction(() => api.deleteProject(project.id));

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            {project.label}
            <EnumBadge value={project.stage} entries={PROJECT_STAGE} />
            {project.outcome && (
              <EnumBadge value={project.outcome} entries={PROJECT_OUTCOME} />
            )}
          </p>
          <p className="text-muted-foreground text-sm">
            {[project.site_address, project.site_postal_code, project.site_city]
              .filter(Boolean)
              .join(", ") || "Chantier non renseigné"}
            {project.outcome_note && ` — ${project.outcome_note}`}
          </p>
        </div>
        <p className="text-lg font-semibold tabular-nums">
          {project.total_amount_ttc === "0"
            ? <span className="text-muted-foreground text-sm font-normal">Pas encore chiffrée</span>
            : formatAmount(project.total_amount_ttc)}
        </p>
      </div>

      {canWrite && (
        <div className="bg-muted/40 flex flex-wrap items-center gap-2 border-y px-5 py-3">
          <Select
            value={project.stage}
            onValueChange={async (value) => {
              await changeStage.run(
                value as ProjectStage,
                project.outcome,
                project.outcome_note,
              );
              onChanged();
            }}
          >
            <SelectTrigger className="w-56" aria-label="Étape de l'affaire">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {toOptions(PROJECT_STAGE).map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <BlockagePopover project={project} onChanged={onChanged} />

          <RelanceButton
            projectId={project.id}
            lastReminderAt={project.last_reminder_at}
            onDone={onChanged}
          />

          <div className="ml-auto flex items-center gap-1">
            {canWriteQuotes && (
              <Button size="sm" variant="ghost" onClick={onAddQuote}>
                <FilePlusIcon />
                Devis
              </Button>
            )}
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={`Supprimer l'affaire ${project.label}`}
              onClick={async () => {
                if (!confirm(`Supprimer l'affaire « ${project.label} » et ses devis ?`)) {
                  return;
                }
                await remove.run();
                onChanged();
              }}
            >
              <Trash2Icon />
            </Button>
          </div>
        </div>
      )}

      {quotes.length > 0 && (
        <ul className="divide-y">
          {quotes.map((quote) => (
            <li
              key={quote.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 text-sm"
            >
              <span className="font-mono text-xs">
                {quote.reference || quote.label || "Devis"}
              </span>
              <EnumBadge value={quote.kind} entries={QUOTE_KIND} />
              <EnumBadge value={quote.status} entries={QUOTE_STATUS} />
              {quote.deposit_status !== "non_applicable" && (
                <span className="text-muted-foreground text-xs">
                  acompte {PAYMENT_STATUS[quote.deposit_status].label.toLowerCase()}
                </span>
              )}
              <span className="text-muted-foreground text-xs">
                {formatDate(quote.issued_at)}
              </span>
              <span className="ml-auto font-medium tabular-nums">
                {quote.amount_ttc
                  ? formatAmount(quote.amount_ttc)
                  : quote.amount_note || "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/**
 * Déclarer un blocage est plus rare que faire avancer une affaire : le champ
 * reste replié pour ne pas encombrer la ligne d'actions.
 */
function BlockagePopover({
  project,
  onChanged,
}: {
  project: Project;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState<string>(project.outcome ?? "");
  const [note, setNote] = useState(project.outcome_note);

  const save = useAction(() =>
    api.setProjectStage(project.id, {
      stage: project.stage,
      outcome: (outcome || null) as ProjectOutcome | null,
      outcome_note: outcome ? note : "",
    }),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant={project.outcome ? "secondary" : "ghost"}>
          {project.outcome ? "Modifier le blocage" : "Signaler un blocage"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-3">
        <SelectField
          label="Pourquoi l'affaire n'avance plus"
          options={toOptions(PROJECT_OUTCOME)}
          emptyLabel="Elle avance normalement"
          placeholder="Elle avance normalement"
          value={outcome}
          onValueChange={setOutcome}
        />
        {outcome && (
          <TextField
            label="Précision"
            placeholder="Confrère, tiers attendu, condition à lever…"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        )}
        <Button
          className="w-full"
          disabled={save.pending}
          onClick={async () => {
            if (await save.run()) {
              setOpen(false);
              onChanged();
            }
          }}
        >
          Enregistrer
        </Button>
      </PopoverContent>
    </Popover>
  );
}
