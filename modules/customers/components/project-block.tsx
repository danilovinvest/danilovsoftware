"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ListOrderedIcon } from "lucide-react";
import { usePermission } from "@/modules/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorNotice } from "@/shared/ui/feedback";
import * as api from "../lib/api";
import { deadlineOf, deliveredAt, missionOf } from "../lib/mission";
import { autoProofsOf, describeBatch } from "../lib/proofs";
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
import { DIALOG_ACTIONS, STAMP_ACTIONS, type BlockDialog } from "../lib/project-actions";
import { useAction } from "../hooks/use-customers";
import { useCycleOrders } from "../hooks/use-cycle-orders";
import { useProjectSettlement } from "../hooks/use-project-settlement";
import type {
  CustomerDetail,
  Interaction,
  ProofBatch,
  Project,
  Quote,
  StepProofInput,
} from "../lib/types";
import { depositTotalOf, type SettlementEditorProps } from "./deposit-field";
import { JoinedQuoteDocs } from "./joined-quote-docs";
import { ProjectNextAssignment } from "./next-assignment";
import { ProjectOnboardingButton, projetIncomplet } from "./project-onboarding";
import { ProjectBlockDialogs } from "./project-block-dialogs";
import { ProjectCycle } from "./project-cycle";
import { ProjectHeader } from "./project-header";
import { ProjectJalons } from "./project-jalons";
import { ProjectNextAction } from "./project-next-action";
import { ProjectTimeline } from "./project-timeline";
import { ProjectToolbar } from "./project-toolbar";
import { QuoteList } from "./quote-list";
import { SubcontractingPanel } from "./subcontracting-panel";

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

const TABS = ["chronologie", "devis", "apres"];

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
    initialTab && TABS.includes(initialTab) ? initialTab : "chronologie",
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
  const titreFrise = (m: "etudes" | "travaux") =>
    m === "etudes" ? "OMPT STRUCTURE · étude" : "OMPT GROUPE · travaux";
  const lead = leadQuote(quotes);
  /** Les preuves jointes aux crans de cette affaire. */
  const preuves = (customer.step_proofs ?? []).filter((proof) => proof.project_id === project.id);

  /*
    Trois chemins pour une preuve, une seule réponse : un fichier part dans
    OneDrive, un courriel y copie ses pièces jointes, une note ou un lien reste
    en base. L'écran lit la même forme dans les trois cas.
  */
  const ajouterPreuve = useAction(
    async (step: CycleStep, input: StepProofInput, file: File | null): Promise<ProofBatch> => {
      if (file) return api.uploadStepProof(project.id, step, input, file);
      if (input.mail_message_id) return api.createMailStepProof(project.id, { step, ...input });
      const proof = await api.createStepProof(project.id, { step, ...input });
      return { proofs: [proof], folder_path: "", folder_url: "", folder_created: false, skipped: [], warning: "" };
    },
    { inline: true },
  );
  const retirerPreuve = useAction((id: string) => api.deleteStepProof(id), { inline: true });

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

  const settlement = useProjectSettlement(quotes, onQuote, onChanged);
  const { porteur } = settlement;

  /**
   * L'éditeur des règlements, réglé sur la pièce porteuse : le même pour la
   * frise, « à faire maintenant », l'après-signature et la ligne du devis.
   */
  function settlementProps(kind: "acompte" | "solde"): SettlementEditorProps {
    const acompte = kind === "acompte";
    return {
      kind,
      amount: acompte ? jalons.deposit_amount : (porteur?.balance_amount ?? null),
      // La date réelle, jamais le repli sur l'émission du devis : la préremplir
      // la ferait passer pour un fait.
      paidAt: acompte ? (porteur?.deposit_paid_at ?? null) : (porteur?.balance_paid_at ?? null),
      paid: acompte ? jalons.deposit_paid_at !== null : porteur?.balance_status === "recu",
      total: depositTotalOf(porteur),
      transfers: porteur
        ? {
            quoteId: porteur.id,
            payments: customer.payments.filter(
              (payment) => payment.quote_id === porteur.id && payment.kind === kind,
            ),
            canWrite: canWriteQuotes,
            onChanged,
          }
        : undefined,
      pending: settlement.pending,
      onSave: acompte ? settlement.encaisser : settlement.solder,
      onRemove: acompte ? settlement.retirerAcompte : settlement.retirerSolde,
    };
  }

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
          return (at ? settlement.encaisser(null) : settlement.retirerAcompte()).then(() => {});
        }
        return (at ? settlement.solder(null) : settlement.retirerSolde()).then(() => {});
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
    const stamp = STAMP_ACTIONS[key];
    if (stamp) {
      void onOverride({ [stamp]: new Date().toISOString() });
      return;
    }
    const opens = DIALOG_ACTIONS[key];
    if (opens) {
      setDialog(opens);
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
            {/*
              La frise se coche ici, et seulement ici : c'est le seul écran où
              l'affaire est ouverte, donc le seul où l'on sait de quelle affaire
              on parle.
            */}
            <div data-demo="project-cycle">
              {(melangee || canOrder) && (
                <div className="mb-1.5 flex items-center gap-2">
                  {melangee && (
                    <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
                      {titreFrise(metier)}
                    </span>
                  )}
                  {canOrder && (
                    <Button
                      size="xs"
                      variant="ghost"
                      className="text-muted-foreground ml-auto h-6"
                      data-demo="frise-reordonner"
                      onClick={() => setDialog({ kind: "order" })}
                    >
                      <ListOrderedIcon />
                      Réordonner la frise
                    </Button>
                  )}
                </div>
              )}
              <ProjectCycle
                points={points}
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
                        onAddProof: async (step, input, file) => {
                          const batch = await ajouterPreuve.run(step, input, file);
                          if (batch === null) return { ok: false, message: "" };
                          onChanged();
                          return { ok: true, message: describeBatch(batch) };
                        },
                        onRemoveProof: async (id) => {
                          // 204 sans corps rend `undefined` : seul `null` dit l'échec.
                          const ok = (await retirerPreuve.run(id)) !== null;
                          if (ok) onChanged();
                          return ok;
                        },
                        pending: busy,
                      }
                    : undefined
                }
              />
            </div>

            {pointsSecond && (
              <div className="flex flex-col gap-1.5" data-demo="project-cycle-second">
                <span className="text-muted-foreground block text-[11px] font-medium tracking-wide uppercase">
                  {titreFrise(metier === "etudes" ? "travaux" : "etudes")}
                </span>
                <ProjectCycle points={pointsSecond} />
                <p className="text-muted-foreground text-[11px]">
                  Cette affaire porte des devis des deux sociétés, donc deux
                  parcours. Cette frise se lit seulement : cocher un cran
                  écrirait sur le devis porteur, qui appartient à l&apos;autre
                  société.
                </p>
              </div>
            )}

            {/*
              L'affaire ne dit pas de quoi il s'agit : on ne chiffre pas ce qu'on
              n'a pas nommé. L'alerte disparaît dès que le type est posé.
            */}
            {canWrite && projetIncomplet(project) && (
              <ProjectOnboardingButton onClick={() => setDialog({ kind: "complete" })} />
            )}

            {/* Le règlement écrit sur le devis : un refus doit se lire quelque part. */}
            {settlement.error && <ErrorNotice message={settlement.error} />}
            {(ajouterPreuve.error || retirerPreuve.error) && (
              <ErrorNotice message={ajouterPreuve.error ?? retirerPreuve.error ?? ""} />
            )}

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

            <Tabs value={tab} onValueChange={setTab}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <TabsList>
                  <TabsTrigger value="chronologie">
                    Chronologie
                    {interactions.length > 0 && (
                      <span className="text-muted-foreground ml-1.5 text-xs">
                        {interactions.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="devis" data-demo="tab-devis">
                    Devis
                    {quotes.length > 0 && (
                      <span className="text-muted-foreground ml-1.5 text-xs">{quotes.length}</span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="apres" data-demo="tab-apres">Après-signature</TabsTrigger>
                </TabsList>

                <ProjectToolbar
                  project={project}
                  metier={metier}
                  site={site}
                  quotesCount={quotes.length}
                  documentsCount={quotes.filter((quote) => quote.drive_url).length}
                  interactionsCount={interactions.length}
                  canWrite={canWrite}
                  canWriteQuotes={canWriteQuotes}
                  onAddQuote={onAddQuote}
                  onEdit={() => onEdit(project)}
                  onIssuer={() => setDialog({ kind: "issuer" })}
                  onDelete={() => setDialog({ kind: "delete" })}
                />
              </div>

              <TabsContent value="chronologie" className="pt-4">
                <ProjectTimeline interactions={interactions} />
              </TabsContent>

              <TabsContent value="devis" className="pt-4">
                <div className="flex flex-col gap-3">
                  <QuoteList
                    quotes={quotes}
                    payments={customer.payments}
                    carrierId={porteur?.id ?? null}
                    onSettle={settle}
                    onChanged={onChanged}
                  />
                  <JoinedQuoteDocs proofs={preuves} />
                  {/* La sous-traitance se lit en face des devis : c'est là que la
                      marge a un sens. */}
                  <SubcontractingPanel
                    key={project.subcontractors.map((s) => `${s.subcontractor_id}:${s.amount}`).join("|")}
                    project={project}
                    quotes={quotes}
                    canWrite={canWrite}
                    onChanged={onChanged}
                  />
                </div>
              </TabsContent>

              <TabsContent value="apres" className="pt-4">
                <ProjectJalons
                  metier={metier}
                  mission={mission}
                  jalons={jalons}
                  onMaterials={commanderMateriaux}
                  depositTotal={depositTotalOf(porteur)}
                  onDeposit={settlement.encaisser}
                  onDepositRemove={settlement.retirerAcompte}
                  depositPaidAt={porteur?.deposit_paid_at ?? null}
                  depositTransfers={settlementProps("acompte").transfers}
                  // Même verrou que la frise : ces cases écrivent par la même
                  // route, qui remplace la ligne entière.
                  disabled={!canWrite || busy}
                  onToggle={async (key, value) => {
                    // « Facturé » appartient au devis : décoché, il dit qu'il
                    // n'y a pas d'acompte. Les autres jalons passent par leur table.
                    if (key === "deposit_invoiced_at") {
                      await settlement.facturerAcompte(value !== null);
                      return;
                    }
                    // L'encaissement passe par l'éditeur des règlements ; ce
                    // chemin ne reste que pour un jalon qui n'en aurait pas.
                    if (key === "deposit_paid_at") {
                      await (value
                        ? settlement.encaisser(jalons.deposit_amount, value.slice(0, 10))
                        : settlement.retirerAcompte());
                      return;
                    }
                    void onOverride({ [key]: value });
                  }}
                />
              </TabsContent>
            </Tabs>
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
