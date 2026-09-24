"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Metier } from "../lib/cycle";
import type { Jalons, StepMarks } from "../lib/jalons";
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
import { ProjectTimeline } from "./project-timeline";
import { ProjectToolbar } from "./project-toolbar";
import { QuoteList } from "./quote-list";
import { SubcontractingPanel } from "./subcontracting-panel";

export const PROJECT_TABS = ["chronologie", "devis", "apres"];

/**
 * Les trois onglets d'une affaire ouverte — son histoire, ses devis, son
 * après-signature — et, à leur droite, les gestes qui la touchent.
 */
export function ProjectTabs({
  tab,
  onTabChange,
  customer,
  project,
  metier,
  mission,
  site,
  quotes,
  interactions,
  proofs,
  jalons,
  settlement,
  depositTransfers,
  canWrite,
  canWriteQuotes,
  busy,
  onMaterials,
  onOverride,
  onAddQuote,
  onEdit,
  onIssuer,
  onCloseProject,
  onArchive,
  onDelete,
  onSettle,
  onChanged,
}: {
  tab: string;
  onTabChange: (tab: string) => void;
  customer: CustomerDetail;
  project: Project;
  metier: Metier;
  mission: ProjectMission;
  site: string;
  quotes: Quote[];
  interactions: Interaction[];
  /** Les preuves jointes aux crans de cette affaire. */
  proofs: StepProof[];
  jalons: Jalons;
  settlement: ReturnType<typeof useProjectSettlement>;
  depositTransfers: SettlementTransfers | undefined;
  canWrite: boolean;
  canWriteQuotes: boolean;
  /** Une écriture est en vol : les cases se verrouillent. */
  busy: boolean;
  onMaterials: (list: string[] | null) => Promise<boolean>;
  onOverride: (patch: Partial<Jalons & StepMarks>) => Promise<boolean>;
  onAddQuote: () => void;
  onEdit: () => void;
  onIssuer: () => void;
  /** Termine le chantier, ou le rouvre. */
  onCloseProject: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onSettle: (kind: "acompte" | "solde") => void;
  onChanged: () => void;
}) {
  const { porteur } = settlement;

  return (
    <Tabs value={tab} onValueChange={onTabChange}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList>
          <TabsTrigger value="chronologie">
            Chronologie
            {interactions.length > 0 && (
              <span className="text-muted-foreground ml-1.5 text-xs">{interactions.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="devis" data-demo="tab-devis">
            Devis
            {quotes.length > 0 && (
              <span className="text-muted-foreground ml-1.5 text-xs">{quotes.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="apres" data-demo="tab-apres">
            Après-signature
          </TabsTrigger>
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
          onEdit={onEdit}
          onIssuer={onIssuer}
          onClose={onCloseProject}
          onArchive={onArchive}
          onDelete={onDelete}
        />
      </div>

      <TabsContent value="chronologie" className="pt-4">
        <ProjectTimeline interactions={interactions} />
      </TabsContent>

      <TabsContent value="devis" className="pt-4">
        <div className="flex flex-col gap-3">
          {/* En tête des devis : c'est l'argent qui est entré, ou qui doit entrer. */}
          <InvoiceTotals project={project} />
          <QuoteList
            quotes={quotes}
            payments={customer.payments}
            carrierId={porteur?.id ?? null}
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
      </TabsContent>

      <TabsContent value="apres" className="pt-4">
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
            // d'acompte. Les autres jalons passent par leur table.
            if (key === "deposit_invoiced_at") {
              await settlement.facturerAcompte(value !== null);
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
      </TabsContent>
    </Tabs>
  );
}
