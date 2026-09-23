"use client";

import { createTask } from "@/modules/tasks";
import { errorMessage } from "@/shared/api/errors";
import { formatDate } from "@/shared/lib/format";
import { notifySuccess } from "@/shared/ui/toaster";
import type { Jalons, StepMarks } from "../lib/jalons";
import type { BlockDialog } from "../lib/project-actions";
import type { Metier, Parcours } from "../lib/cycle";
import type { CustomerDetail, Milestones, Project, Quote } from "../lib/types";
import { CycleOrderDialog } from "./cycle-order-dialog";
import { DeleteProjectDialog } from "./delete-project-dialog";
import { SettlementDialog, type SettlementEditorProps } from "./deposit-field";
import { InteractionDialog } from "./interaction-dialog";
import { MaterialsDialog } from "./materials-field";
import { OutcomeDialog } from "./outcome-dialog";
import { PlanEvent } from "./plan-event";
import { ProjectClosureDialog } from "./project-closure-dialog";
import { ProjectIssuerDialog } from "./project-issuer-dialog";
import { ProjectOnboardingDrawer } from "./project-onboarding";
import { RelanceDialog } from "./relance-dialog";

/**
 * Les boîtes d'une affaire, **une seule montée à la fois**.
 *
 * Elles étaient douze, toutes montées en permanence sous chaque affaire : sur
 * une fiche à six affaires, soixante-douze boîtes fermées se rendaient à chaque
 * frappe. Seule celle qu'on ouvre existe désormais, et fermer la démonte — son
 * brouillon repart donc de ce que porte l'affaire à la prochaine ouverture.
 */
export function ProjectBlockDialogs({
  dialog,
  onClose,
  customer,
  project,
  quotes,
  jalons,
  metier,
  milestone,
  site,
  saving,
  cycleOrder,
  settlement,
  onOverride,
  onMaterials,
  onChanged,
}: {
  dialog: BlockDialog | null;
  onClose: () => void;
  customer: CustomerDetail;
  project: Project;
  quotes: Quote[];
  jalons: Jalons;
  /** Le métier nomme le geste de clôture : on ne termine pas une étude comme un mur. */
  metier: Metier;
  milestone: Milestones | undefined;
  site: string;
  saving: boolean;
  /** Le parcours affiché, que « Réordonner la frise » part de. */
  cycleOrder: Parcours;
  /** L'éditeur des règlements, déjà réglé sur la pièce porteuse, par règlement. */
  settlement: (kind: "acompte" | "solde") => SettlementEditorProps;
  onOverride: (patch: Partial<Jalons & StepMarks>) => Promise<boolean>;
  onMaterials: (list: string[] | null) => Promise<boolean>;
  onChanged: () => void;
}) {
  if (!dialog) return null;
  const openChange = (open: boolean) => {
    if (!open) onClose();
  };

  switch (dialog.kind) {
    case "settlement":
      return <SettlementDialog open onOpenChange={openChange} {...settlement(dialog.reglement)} />;
    case "materials":
      return (
        <MaterialsDialog
          open
          onOpenChange={openChange}
          materials={jalons.materials}
          marked={jalons.materials_ordered_at}
          pending={saving}
          onSave={onMaterials}
        />
      );
    case "complete":
      return (
        <ProjectOnboardingDrawer
          customer={customer}
          project={project}
          milestones={milestone}
          open
          onOpenChange={openChange}
          onSaved={onChanged}
        />
      );
    case "issuer":
      return (
        <ProjectIssuerDialog
          project={project}
          quotes={quotes}
          open
          onOpenChange={openChange}
          onSaved={onChanged}
        />
      );
    case "closure":
      return (
        <ProjectClosureDialog
          open
          onClose={onClose}
          project={project}
          quotes={quotes}
          pvSentAt={jalons.pv_sent_at}
          pvSignedAt={jalons.pv_signed_at}
          metier={metier}
          onDone={onChanged}
        />
      );
    case "order":
      return <CycleOrderDialog open onOpenChange={openChange} initial={cycleOrder} />;
    case "delete":
      return (
        <DeleteProjectDialog
          project={project}
          open
          onOpenChange={openChange}
          onDeleted={() => {
            onClose();
            onChanged();
          }}
        />
      );
    case "relance":
      return (
        <RelanceDialog
          customer={customer}
          project={project}
          quotes={quotes}
          open
          onOpenChange={openChange}
          onSaved={onChanged}
        />
      );
    case "log":
      return (
        <InteractionDialog
          project={project}
          kind={dialog.interaction}
          open
          onOpenChange={openChange}
          onSaved={onChanged}
        />
      );
    case "outcome":
      return (
        <OutcomeDialog
          project={project}
          mode={dialog.mode}
          open
          onOpenChange={openChange}
          onSaved={onChanged}
          onScheduleResume={(date, _outcome, note) => scheduleResume(project, date, note, onOverride)}
        />
      );
    case "plan":
      return (
        <PlanEvent
          open
          onClose={onClose}
          onSaved={() => {
            onClose();
            notifySuccess("Rendez-vous ajouté à l'agenda.");
            onChanged();
          }}
          preset={{
            kind: "rdv",
            customerId: customer.id,
            customerName: customer.display_name,
            projectId: project.id,
            // Le rendez-vous est d'abord celui du responsable de l'affaire.
            assigneeId: project.manager_id,
            title: `RDV — ${customer.display_name}`,
            location: site,
          }}
        />
      );
  }
}

/**
 * Une affaire reportée n'est réveillée par rien.
 *
 * La date de reprise devient donc une vraie tâche, échue ce jour-là et
 * rattachée à l'affaire. C'est le seul mécanisme du CRM qui sache revenir vers
 * quelqu'un à une date, et le réécrire ici en aurait fait un second — qui aurait
 * divergé du premier.
 *
 * Rend le message d'échec, ou `null` quand tout est enregistré.
 */
async function scheduleResume(
  project: Project,
  date: string,
  note: string,
  onOverride: (patch: Partial<Jalons & StepMarks>) => Promise<boolean>,
): Promise<string | null> {
  if (!(await onOverride({ resume_at: date }))) {
    return "La date de reprise n'a pas été enregistrée.";
  }
  try {
    await createTask({
      title: `Reprendre « ${project.label} »`,
      body: note ? `Reportée : ${note}` : "Affaire reportée, à revoir.",
      status: "a_faire",
      // Une affaire reportée se reprend, elle n'urge pas.
      priority: "normale",
      size: null,
      due_at: new Date(`${date}T09:00:00`).toISOString(),
      assignee_id: null,
      targets: [{ project_id: project.id }],
    });
  } catch (cause) {
    // Le report est enregistré ; c'est le rappel qui manque, et il doit se
    // voir : sans lui, l'affaire reportée s'oublie.
    return `L'affaire est reportée, mais la tâche de reprise n'a pas été créée : ${errorMessage(cause)}`;
  }
  notifySuccess(`Tâche de reprise créée pour le ${formatDate(date)}.`);
  return null;
}
