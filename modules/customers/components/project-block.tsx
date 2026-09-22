"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePermission } from "@/modules/auth";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { ErrorNotice } from "@/shared/ui/feedback";
import * as api from "../lib/api";
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
  stepWrite,
  type ActionKey,
  type CycleStep,
} from "../lib/cycle";
import { readJalons, readMarks, type Jalons, type StepMarks } from "../lib/jalons";
import {
  DIALOG_ACTIONS,
  STAMP_ACTIONS,
  isDialogAction,
  isStampAction,
  type BlockDialog,
} from "../lib/project-actions";
import { useAction } from "../hooks/use-customers";
import { useCycleOrders } from "../hooks/use-cycle-orders";
import { useProjectSettlement } from "../hooks/use-project-settlement";
import { useStepProofActions } from "../hooks/use-step-proof-actions";
import type {
  CustomerDetail,
  Interaction,
  Project,
  Quote,
} from "../lib/types";
import { ProjectNextAssignment } from "./next-assignment";
import { ProjectOnboardingButton, projetIncomplet } from "./project-onboarding";
import { ProjectBlockDialogs } from "./project-block-dialogs";
import { ProjectCyclePanel } from "./project-cycle-panel";
import { ProjectHeader } from "./project-header";
import { ProjectNextAction } from "./project-next-action";
import { PROJECT_TABS, ProjectTabs } from "./project-tabs";

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
  /** L'onglet demandé par l'adresse : chronologie, devis ou apres. */
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
 * Replié, il répond à « où en est-on » sans qu'on l'ouvre. Déplié, il dit quoi
 * faire, puis montre l'histoire, les devis et l'après-signature.
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
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [tab, setTab] = useState(() =>
    initialTab && PROJECT_TABS.includes(initialTab) ? initialTab : "chronologie",
  );
  /** La boîte ouverte, une à la fois. */
  const [dialog, setDialog] = useState<BlockDialog | null>(null);
  // Stable : la liste des devis est mémorisée, et ne se rend pas à chaque cran coché.
  const settle = useCallback(
    (reglement: "acompte" | "solde") => setDialog({ kind: "settlement", reglement }),
    [],
  );
  const bloc = useRef<HTMLDivElement>(null);
  // Une affaire désignée par un lien vient à l'écran : sur une fiche à six
  // affaires, elle serait sinon dépliée hors de vue.
  useEffect(() => {
    if (focused) bloc.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [focused]);

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

  const reopen = useAction(() =>
    api.setProjectStage(project.id, { stage: project.stage, outcome: null, outcome_note: "" }),
  );

  const settlement = useProjectSettlement(quotes, onQuote, onChanged, {
    payments: customer.payments,
    canWrite: canWriteQuotes,
  });
  const settlementProps = settlement.editorProps;

  /*
    Cocher un cran de la frise.

    Chaque cran écrit là où le fait vit déjà — l'affaire, le devis, les jalons —
    et `stepWrite` est le seul endroit qui le dit. Un cran n'attend jamais celui
    d'avant.
  */
  function marquerCran(step: CycleStep, at: string | null): void | Promise<void> {
    const write = stepWrite(step);
    switch (write.target) {
      case "mark":
      case "jalon":
      case "materials":
        // `poserJalon` peint avant d'écrire : le panneau peut se fermer sur un
        // cran déjà vert.
        void onOverride({ [write.field]: at } as Partial<Jalons & StepMarks>);
        return;
      case "worksite_date":
        void onOverride({ worksite_date: at });
        return;
      case "quote":
        // Porté par le devis : aucun aperçu local possible, le panneau attend
        // l'aller-retour au lieu de se fermer sur un point resté gris.
        if (write.field === "deposit") {
          return (at ? settlement.encaisser(null, at) : settlement.retirerAcompte()).then(() => {});
        }
        return (at ? settlement.solder(null, at) : settlement.retirerSolde()).then(() => {});
    }
  }

  /**
   * La commande de matériaux : ce qui a été commandé, et quand. `null` retire
   * les deux. La date déjà posée est **conservée** : compléter la liste trois
   * jours plus tard ne doit pas faire croire qu'on a commandé aujourd'hui.
   */
  function commanderMateriaux(list: string[] | null): Promise<boolean> {
    if (list === null) return onOverride({ materials: [], materials_ordered_at: null });
    return onOverride({
      materials: list,
      materials_ordered_at: jalons.materials_ordered_at ?? new Date().toISOString(),
    });
  }

  async function act(key: ActionKey) {
    if (isStampAction(key)) {
      void onOverride({ [STAMP_ACTIONS[key]]: new Date().toISOString() });
      return;
    }
    if (isDialogAction(key)) {
      setDialog(DIALOG_ACTIONS[key]);
      return;
    }
    switch (key) {
      case "open_calendar":
        router.push("/calendar");
        return;
      case "new_quote":
        onAddQuote();
        return;
      case "reopen":
      case "resume":
        if (await reopen.run()) onChanged();
        return;
      case "deposit_invoiced":
        await settlement.facturerAcompte(true);
        return;
      case "book_date":
        // Réserver une date demande de choisir : on emmène l'utilisateur là
        // où le sélecteur se trouve.
        setOpen(true);
        setTab("apres");
        return;
      case "open_worksite":
        // Le chantier **est** cette affaire : on emmène son identifiant.
        router.push(`/chantiers?affaire=${project.id}`);
        return;
      default: {
        // Une action ajoutée à `ActionKey` sans table ni branche ferait un
        // bouton muet : le typage refuse de compiler plutôt.
        const unhandled: never = key;
        return unhandled;
      }
    }
  }

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
                      deposit: settlementProps("acompte"),
                      onDeposit: settlement.encaisser,
                      onDepositRemove: settlement.retirerAcompte,
                      balance: settlementProps("solde"),
                      onBalance: settlement.solder,
                      onBalanceRemove: settlement.retirerSolde,
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

            {/*
              L'affaire ne dit pas de quoi il s'agit : on ne chiffre pas ce qu'on
              n'a pas nommé. L'alerte disparaît dès que le type est posé.
            */}
            {canWrite && projetIncomplet(project) && (
              <ProjectOnboardingButton onClick={() => setDialog({ kind: "complete" })} />
            )}

            {/* Le règlement écrit sur le devis : un refus doit se lire quelque part. */}
            {settlement.error && <ErrorNotice message={settlement.error} />}
            {proofActions.error && <ErrorNotice message={proofActions.error} />}

            <div data-demo="next-action">
              {canWrite && (
                <ProjectNextAction
                  action={action}
                  onAct={act}
                  pending={reopen.pending || busy}
                />
              )}
              <ProjectNextAssignment
                project={project}
                customerName={customer.display_name}
                action={action}
                canWrite={canWrite}
                onChanged={onChanged}
              />
            </div>

            {project.source_status && (
              <p className="text-muted-foreground text-xs">
                Suivi Excel :{" "}
                <span className="font-mono text-[0.7rem]">« {project.source_status} »</span>
              </p>
            )}

            <ProjectTabs
              tab={tab}
              onTabChange={setTab}
              customer={customer}
              project={project}
              metier={metier}
              mission={mission}
              site={site}
              quotes={quotes}
              interactions={interactions}
              proofs={preuves}
              jalons={jalons}
              settlement={settlement}
              depositTransfers={settlementProps("acompte").transfers}
              canWrite={canWrite}
              canWriteQuotes={canWriteQuotes}
              busy={busy}
              onMaterials={commanderMateriaux}
              onOverride={onOverride}
              onAddQuote={onAddQuote}
              onEdit={() => onEdit(project)}
              onIssuer={() => setDialog({ kind: "issuer" })}
              onDelete={() => setDialog({ kind: "delete" })}
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
