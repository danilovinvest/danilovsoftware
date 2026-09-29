"use client";

import type { Metier } from "../lib/cycle";
import type { Jalons, StepMarks } from "../lib/jalons";
import { jalonProgress, type ProjectSection as SectionKey } from "../lib/project-sections";
import type { useProjectSections } from "../hooks/use-project-sections";
import type { useProjectSettlement } from "../hooks/use-project-settlement";
import type {
  CustomerDetail,
  Interaction,
  Project,
  ProjectMission,
  Quote,
  StepProof,
} from "../lib/types";
import { depositTotalOf, type SettlementTransfers } from "./deposit-field";
import { InvoiceTotals } from "./invoice-totals";
import { JoinedQuoteDocs } from "./joined-quote-docs";
import { ProjectJalons } from "./project-jalons";
import { ProjectNotes } from "./project-notes";
import { ProjectSection } from "./project-section";
import { ProjectTimeline } from "./project-timeline";
import { QuoteList } from "./quote-list";
import { SubcontractingPanel } from "./subcontracting-panel";

type Sections = ReturnType<typeof useProjectSections>;

type SectionsProps = {
  sections: Sections;
  customer: CustomerDetail;
  project: Project;
  metier: Metier;
  mission: ProjectMission;
  quotes: Quote[];
  interactions: Interaction[];
  /** Les preuves jointes aux crans de cette affaire. */
  proofs: StepProof[];
  jalons: Jalons;
  settlement: ReturnType<typeof useProjectSettlement>;
  depositTransfers: SettlementTransfers | undefined;
  canWrite: boolean;
  /** Une écriture est en vol : les cases se verrouillent. */
  busy: boolean;
  onMaterials: (list: string[] | null) => Promise<boolean>;
  onOverride: (patch: Partial<Jalons & StepMarks>) => Promise<boolean>;
  onSettle: (kind: "acompte" | "solde") => void;
  onChanged: () => void;
};

/**
 * Le contenu d'une affaire ouverte, en quatre sections lues de haut en bas :
 * l'argent, l'après-signature, l'histoire, les notes.
 *
 * C'étaient trois onglets, sous les onglets de la fiche : deux niveaux
 * d'onglets empilés, et ce qui vivait dans un onglet fermé ne se voyait pas.
 * Chaque section dit replié ce qu'elle contient — nombre de devis, jalons
 * franchis, échanges — et une seule s'ouvre d'office (`defaultSection`).
 */
export function ProjectSections(props: SectionsProps) {
  const { sections, project, metier, mission, quotes, interactions, jalons, canWrite } = props;
  const section = (key: SectionKey) => ({
    open: sections.isOpen(key),
    onOpenChange: (open: boolean) => sections.setOpen(key, open),
    sectionRef: sections.refFor(key),
  });
  const progress = jalonProgress(metier, mission, jalons);
  const notes = project.notes || project.source_status;

  return (
    <div className="flex flex-col gap-3">
      <ProjectSection
        title="Devis & règlements"
        count={quotes.length > 0 ? String(quotes.length) : null}
        demo="tab-devis"
        {...section("devis")}
      >
        <MoneySection {...props} />
      </ProjectSection>

      <ProjectSection
        title="Après-signature"
        count={`${progress.done}/${progress.total}`}
        demo="tab-apres"
        {...section("apres")}
      >
        <AfterSignature {...props} />
      </ProjectSection>

      <ProjectSection
        title="Chronologie"
        count={interactions.length > 0 ? String(interactions.length) : null}
        demo="tab-chronologie"
        {...section("chronologie")}
      >
        <ProjectTimeline interactions={interactions} />
      </ProjectSection>

      {/* Rien à lire et rien à écrire : la section n'aurait que son titre. */}
      {(notes || canWrite) && (
        <ProjectSection
          title="Notes"
          hint={project.notes ? project.notes.split("\n")[0] : null}
          demo="tab-notes"
          {...section("notes")}
        >
          <div className="flex flex-col gap-2">
            <ProjectNotes project={project} canWrite={canWrite} onChanged={props.onChanged} />
            {project.source_status && (
              <p className="text-muted-foreground text-xs">
                Suivi Excel :{" "}
                <span className="font-mono text-[0.7rem]">« {project.source_status} »</span>
              </p>
            )}
          </div>
        </ProjectSection>
      )}
    </div>
  );
}

/** Les devis et ce qu'ils ont rapporté — et, en face, ce que coûte la sous-traitance. */
function MoneySection({ customer, project, quotes, proofs, settlement, canWrite, onSettle, onChanged }: SectionsProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* En tête des devis : c'est l'argent qui est entré, ou qui doit entrer. */}
      <InvoiceTotals project={project} />
      <QuoteList
        quotes={quotes}
        payments={customer.payments}
        carrierId={settlement.porteur?.id ?? null}
        onSettle={onSettle}
        onChanged={onChanged}
      />
      <JoinedQuoteDocs proofs={proofs} />
      {/* La sous-traitance se lit en face des devis : c'est là que la marge a un sens. */}
      <SubcontractingPanel
        key={project.subcontractors.map((s) => `${s.subcontractor_id}:${s.amount}`).join("|")}
        project={project}
        quotes={quotes}
        canWrite={canWrite}
        onChanged={onChanged}
      />
    </div>
  );
}

/** Les jalons d'après-signature, cochables ici comme dans la frise. */
function AfterSignature({
  metier,
  mission,
  jalons,
  settlement,
  depositTransfers,
  canWrite,
  busy,
  onMaterials,
  onOverride,
}: SectionsProps) {
  const { porteur } = settlement;
  return (
    <ProjectJalons
      metier={metier}
      mission={mission}
      jalons={jalons}
      onMaterials={onMaterials}
      depositTotal={depositTotalOf(porteur)}
      onDeposit={settlement.encaisser}
      onDepositRemove={settlement.retirerAcompte}
      depositPaidAt={porteur?.deposit_paid_at ?? null}
      depositTransfers={depositTransfers}
      // Même verrou que la frise : ces cases écrivent par la même route,
      // qui remplace la ligne entière.
      disabled={!canWrite || busy}
      onToggle={async (key, value) => {
        // « Facturé » appartient au devis : décoché, il dit qu'il n'y a pas
        // d'acompte, daté il corrige le jour. Les autres jalons passent par
        // leur table.
        if (key === "deposit_invoiced_at") {
          await settlement.facturerAcompte(value);
          return;
        }
        // L'encaissement passe par l'éditeur des règlements ; ce chemin ne
        // reste que pour un jalon qui n'en aurait pas.
        if (key === "deposit_paid_at") {
          await (value
            ? settlement.encaisser(jalons.deposit_amount, value.slice(0, 10))
            : settlement.retirerAcompte());
          return;
        }
        void onOverride({ [key]: value });
      }}
    />
  );
}
