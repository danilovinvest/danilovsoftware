"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePermission } from "@/modules/auth";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { ErrorNotice } from "@/shared/ui/feedback";
import { deadlineOf, deliveredAt, missionOf } from "../lib/mission";
import { autoProofsOf } from "../lib/proofs";
import {
  hasSurvey,
  leadQuote,
  nextAction,
  parcoursOf,
  projectMetier,
  readCycle,
  stepMarkedAt,
} from "../lib/cycle";
import { readJalons, readMarks, type Jalons, type StepMarks } from "../lib/jalons";
import type { BlockDialog } from "../lib/project-actions";
import { useArchiveProject } from "../hooks/use-archive-project";
import { useCycleOrders } from "../hooks/use-cycle-orders";
import { useProjectGestures } from "../hooks/use-project-gestures";
import { useProjectSettlement } from "../hooks/use-project-settlement";
import { useStepProofActions } from "../hooks/use-step-proof-actions";
import type {
  CustomerDetail,
  Interaction,
  Project,
  Quote,
} from "../lib/types";
import { defaultSection, sectionFromParam } from "../lib/project-sections";
import { useProjectSections } from "../hooks/use-project-sections";
import { ProjectNextAssignment } from "./next-assignment";
import { ProjectOnboardingButton, projetIncomplet } from "./project-onboarding";
import { ProjectBlockDialogs } from "./project-block-dialogs";
import { ProjectCyclePanel } from "./project-cycle-panel";
import { ProjectHeader } from "./project-header";
import { ProjectLineActions } from "./project-line-actions";
import { ProjectNextAction } from "./project-next-action";
import { ProjectSections } from "./project-sections";

export type ProjectBlockProps = {
  customer: CustomerDetail;
  project: Project;
  quotes: Quote[];
  interactions: Interaction[];
  /** Ce que l'utilisateur vient de cocher, affiché avant la réponse du serveur. */
  optimistic: Partial<Jalons & StepMarks> | undefined;
  /** Une écriture de jalons de cette affaire est en vol : plus un cran ne se coche. */
  saving: boolean;
  now: number;
  canWrite: boolean;
  canWriteQuotes: boolean;
  defaultOpen: boolean;
  /** Désignée par l'adresse : elle vient à l'écran au montage. */
  focused?: boolean;
  /** La section demandée par l'adresse (`?onglet=`) : devis, apres ou chronologie. */
  initialTab?: string | null;
  onQuote?: (quote: Quote) => void;
  onOverride: (project: Project, patch: Partial<Jalons & StepMarks>) => Promise<boolean>;
  onAddQuote: (project: Project) => void;
  onEdit: (project: Project) => void;
  onChanged: () => void;
};

/**
 * Une affaire : un accordéon.
 *
 * Replié, il répond à « où en est-on » sans qu'on l'ouvre. Déplié : la frise,
 * un seul bandeau « à faire » — l'action et qui la porte —, puis des sections
 * repliables — devis et règlements, après-signature, chronologie, notes.
 *
 * **Mémorisé** : une saisie dans une affaire — un cran coché, une écriture en
 * vol — ne fait plus rendre les autres affaires de la fiche. Les accessoires
 * sont stables à dessein : les rappels reçoivent l'affaire au lieu d'être
 * refabriqués pour elle, et les listes de devis et d'échanges gardent leur
 * identité tant que leur contenu ne change pas.
 */
export const ProjectBlock = memo(function ProjectBlock({
  customer,
  project,
  quotes,
  interactions,
  optimistic,
  saving,
  now,
  canWrite,
  canWriteQuotes,
  defaultOpen,
  focused = false,
  initialTab = null,
  onQuote,
  onOverride: overrideFor,
  onAddQuote: addQuoteFor,
  onEdit,
  onChanged,
}: ProjectBlockProps) {
  const [open, setOpen] = useState(defaultOpen);
  // La section de l'adresse d'abord ; sinon celle que l'affaire réclame. Lue
  // une fois : le bloc est remonté quand l'adresse change d'affaire ou d'onglet.
  const [asked] = useState(() => sectionFromParam(initialTab));
  const sections = useProjectSections(asked ?? defaultSection(quotes));
  /** La boîte ouverte, une à la fois. */
  const [dialog, setDialog] = useState<BlockDialog | null>(null);
  // Stable : la liste des devis est mémorisée, et ne se rend pas à chaque cran coché.
  const settle = useCallback(
    (reglement: "acompte" | "solde") => setDialog({ kind: "settlement", reglement }),
    [],
  );
  const bloc = useRef<HTMLDivElement>(null);
  // Une affaire désignée par un lien vient à l'écran : sur une fiche à six
  // affaires, elle serait sinon dépliée hors de vue. Un lien qui nomme une
  // section (`&onglet=devis`) mène à la section elle-même.
  const { reveal } = sections;
  useEffect(() => {
    if (!focused) return;
    if (asked) reveal(asked);
    else bloc.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [focused, asked, reveal]);

  const onOverride = (patch: Partial<Jalons & StepMarks>) => overrideFor(project, patch);
  const onAddQuote = () => addQuoteFor(project);

  /** L'ordre choisi des crans, et qui peut le changer : c'est un réglage de l'entreprise. */
  const orders = useCycleOrders();
  const canOrder = usePermission("system:admin");

  /*
    L'état complet de l'affaire : ses jalons, ses marques, et le geste en cours.
    Les deux se lisent ensemble parce qu'ils s'écrivent ensemble — une même
    ligne en base, une même requête. Leurs clés sont disjointes.
  */
  const milestone = customer.milestones?.find((entry) => entry.project_id === project.id);
  const etat = useMemo(
    () => ({
      ...readJalons(project.id, quotes, customer.milestones, project),
      ...readMarks(project.id, customer.milestones),
      ...optimistic,
    }),
    [project, quotes, customer.milestones, optimistic],
  );
  const jalons: Jalons = etat;
  const marks: StepMarks = etat;

  const points = readCycle(project, quotes, interactions, jalons, now, undefined, marks, orders);
  const action = nextAction(points, project, quotes, jalons, now);

  /*
    Deux sociétés sur une même affaire : deux frises.

    Le même chantier peut porter l'étude de STRUCTURE et les travaux de GROUPE.
    La seconde frise se **lit seulement** : cocher un cran écrit sur le devis
    porteur, qui appartient à l'une des deux sociétés — rendre les deux frises
    cliquables ferait écrire l'acompte de GROUPE sur un devis de STRUCTURE.
  */
  const devisStructure = quotes.filter((quote) => quote.issuer === "ompt-structure");
  const devisGroupe = quotes.filter((quote) => quote.issuer === "ompt-groupe");
  const melangee = devisStructure.length > 0 && devisGroupe.length > 0;
  const metier = projectMetier(project, quotes);
  const pointsSecond = melangee
    ? readCycle(
        project,
        metier === "etudes" ? devisGroupe : devisStructure,
        interactions,
        jalons,
        now,
        metier === "etudes" ? "travaux" : "etudes",
        marks,
        orders,
      )
    : null;
  const lead = leadQuote(quotes);
  /** Les preuves jointes aux crans de cette affaire. */
  const preuves = (customer.step_proofs ?? []).filter((proof) => proof.project_id === project.id);

  const proofActions = useStepProofActions(project.id, onChanged);

  /*
    La mission et le délai. Une affaire livrée ne dit plus son délai : un
    retard rattrapé n'est plus une alerte. Pour un chantier, « livré » veut dire
    réalisé.
  */
  const mission = missionOf(project, quotes);
  const echeance = deadlineOf(
    project,
    metier === "etudes" ? deliveredAt(jalons, mission) !== null : project.stage === "realise",
    now,
  );

  const archive = useArchiveProject(project, onChanged);

  const settlement = useProjectSettlement(quotes, onQuote, onChanged, {
    payments: customer.payments,
    canWrite: canWriteQuotes,
  });
  const settlementProps = settlement.editorProps;

  const gestures = useProjectGestures({
    project,
    jalons,
    onOverride,
    onAddQuote,
    openDialog: setDialog,
    revealAfterSignature: () => {
      setOpen(true);
      sections.reveal("apres");
    },
    invoiceDeposit: () => settlement.facturerAcompte(),
    onChanged,
  });
  const { marquerCran, commanderMateriaux } = gestures;

  const site = [project.site_address, project.site_postal_code, project.site_city]
    .filter(Boolean)
    .join(", ");
  const busy = saving || settlement.pending;

  return (
    <Card ref={bloc} className="gap-0 overflow-hidden scroll-mt-4 py-0">
      <Collapsible open={open} onOpenChange={setOpen}>
        <ProjectHeader
          project={project}
          metier={metier}
          mission={mission}
          echeance={echeance}
          survey={hasSurvey(quotes)}
          site={site}
          points={points}
          action={action}
          open={open}
          actions={
            <ProjectLineActions
              project={project}
              metier={metier}
              site={site}
              quotes={quotes}
              interactionsCount={interactions.length}
              canWrite={canWrite}
              canWriteQuotes={canWriteQuotes}
              onIssuer={() => setDialog({ kind: "issuer" })}
              onEdit={() => onEdit(project)}
              onAddQuote={onAddQuote}
              onClose={() => setDialog({ kind: "closure" })}
              onArchive={() => void archive.archiver()}
              onDelete={() => setDialog({ kind: "delete" })}
            />
          }
        />

        <CollapsibleContent>
          <div className="flex flex-col gap-4 border-t px-4 py-4">
            <ProjectCyclePanel
              points={points}
              pointsSecond={pointsSecond}
              metier={metier}
              canOrder={canOrder}
              onOrder={() => setDialog({ kind: "order" })}
              edit={
                canWrite
                  ? {
                      markedAt: (step) => stepMarkedAt(step, jalons, marks),
                      onMark: marquerCran,
                      hasQuote: lead !== null,
                      onAddQuote,
                      materials: jalons.materials,
                      onMaterials: commanderMateriaux,
                      onSettle: settle,
                      negotiationNote: marks.negotiation_note,
                      onNote: (note) => onOverride({ negotiation_note: note }),
                      proofs: (step) => preuves.filter((proof) => proof.step === step),
                      autoProofs: (step) => autoProofsOf(step, quotes, interactions),
                      customerId: customer.id,
                      drivePath: project.drive_path,
                      onAddProof: proofActions.add,
                      onRemoveProof: proofActions.remove,
                      pending: busy,
                    }
                  : undefined
              }
            />

            {/* Le règlement écrit sur le devis : un refus doit se lire quelque part. */}
            {settlement.error && <ErrorNotice message={settlement.error} />}
            {archive.error && <ErrorNotice message={archive.error} />}
            {proofActions.error && <ErrorNotice message={proofActions.error} />}

            {/* Un seul bandeau « à faire » : l'action, puis qui la porte. */}
            <ProjectNextAction
              action={action}
              onAct={gestures.act}
              pending={gestures.reopenPending || busy}
              readOnly={!canWrite}
              className="scroll-mt-4"
            >
              <ProjectNextAssignment
                project={project}
                customerName={customer.display_name}
                action={action}
                canWrite={canWrite}
                onChanged={onChanged}
              />
            </ProjectNextAction>

            {/*
              L'affaire ne dit pas de quoi il s'agit : on ne chiffre pas ce qu'on
              n'a pas nommé. L'alerte disparaît dès que le type est posé.
            */}
            {canWrite && projetIncomplet(project) && (
              <ProjectOnboardingButton onClick={() => setDialog({ kind: "complete" })} />
            )}

            <ProjectSections
              sections={sections}
              customer={customer}
              project={project}
              metier={metier}
              mission={mission}
              quotes={quotes}
              interactions={interactions}
              proofs={preuves}
              jalons={jalons}
              settlement={settlement}
              depositTransfers={settlementProps("acompte").transfers}
              canWrite={canWrite}
              busy={busy}
              onMaterials={commanderMateriaux}
              onOverride={onOverride}
              onSettle={settle}
              onChanged={onChanged}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      <ProjectBlockDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        customer={customer}
        project={project}
        quotes={quotes}
        jalons={jalons}
        metier={metier}
        milestone={milestone}
        site={site}
        saving={saving}
        cycleOrder={parcoursOf(metier, mission)}
        settlement={settlementProps}
        onOverride={onOverride}
        onMaterials={commanderMateriaux}
        onChanged={onChanged}
      />
    </Card>
  );
});
