"use client";

import { useState } from "react";
import Link from "next/link";
import { usePermission } from "@/modules/auth";
import { scopeParam, useScope } from "@/modules/group";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LIVE, useCached } from "@/shared/api/cache";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { TableSkeleton } from "@/shared/ui/loading";
import { formatAmount, formatDate, plural } from "@/shared/lib/format";
import { getPortfolio } from "../lib/syndic-api";
import type { ChainMember, Portfolio } from "../lib/syndic-types";
import { BillingRulesEditor } from "./billing-rules-editor";
import { PortfolioBuildings } from "./portfolio-buildings";
import { PortfolioHandlers } from "./portfolio-handlers";
import { RecoveryList } from "./recovery-list";
import { SuccessorDialog } from "./successor-dialog";

/**
 * L'onglet « Portefeuille » d'un syndic ou d'un gestionnaire (feuille de route
 * du 29/09, phase 2).
 *
 * Un syndic est un client récurrent qui amène plusieurs immeubles, et rien ne
 * le montrait d'un coup d'œil : ses copropriétés avec ce que chacune a facturé,
 * encaissé et doit encore, ses gestionnaires et leurs immeubles, son circuit
 * de facturation, et ce qui reste à recouvrer chez lui.
 *
 * Lu à l'ouverture de l'onglet seulement, comme le graphe. Les fiches sont
 * entières des deux côtés, les montants sont ceux de la société affichée : le
 * périmètre part au serveur, qui impose de toute façon celui d'un compte lié.
 */
export function SyndicPortfolio({ customerId, customerName }: { customerId: string; customerName: string }) {
  const canWrite = usePermission("customers:write");
  const issuer = scopeParam(useScope());
  const { data, error, isLoading, mutate } = useCached(
    `customers:portfolio:${customerId}:${issuer ?? ""}`,
    () => getPortfolio(customerId, issuer),
    LIVE,
  );
  const [succeeding, setSucceeding] = useState(false);
  const reload = () => void mutate();

  if (error && !data) return <ErrorNotice message="Portefeuille illisible." onRetry={reload} />;
  if (isLoading && !data) return <TableSkeleton rows={4} columns={6} hue="indigo" />;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-4">
      {error ? <ErrorNotice message="Portefeuille non actualisé." onRetry={reload} /> : null}
      <Figures portfolio={data} />
      <Succession
        portfolio={data}
        canWrite={canWrite}
        onEdit={() => setSucceeding(true)}
      />

      {data.buildings.length === 0 && data.direct.projects === 0 ? (
        <EmptyState
          title="Aucun immeuble"
          description="Un immeuble entre ici quand sa fiche désigne ce cabinet dans « Géré par » (onglet Fiche, Classement)."
        />
      ) : (
        <PortfolioBuildings buildings={data.buildings} direct={data.direct} totals={data.totals} />
      )}

      {data.recovery.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">
            À recouvrer — {plural(data.recovery.length, "facture")}
          </h2>
          <RecoveryList items={data.recovery} onChanged={reload} demo="portfolio-recovery" />
        </section>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card className="gap-0 py-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="text-sm">Gestionnaires</CardTitle>
            <CardDescription className="text-xs">
              Qui suit quel immeuble : c&apos;est la personne à appeler.
            </CardDescription>
          </CardHeader>
          <CardContent className="py-4">
            <PortfolioHandlers
              gestionnaires={data.gestionnaires}
              buildings={data.buildings.map(({ id, name }) => ({ id, name }))}
              canWrite={canWrite}
              onChanged={reload}
            />
          </CardContent>
        </Card>

        <Card className="gap-0 py-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="text-sm">Circuit de facturation</CardTitle>
            <CardDescription className="text-xs">
              Valable pour tous ses immeubles, sauf ce qu&apos;une copropriété précise pour elle.
            </CardDescription>
          </CardHeader>
          <CardContent className="py-4">
            <BillingRulesEditor
              // Remonté quand les règles relues diffèrent de la saisie d'avant.
              key={JSON.stringify(data.billing_rules)}
              customerId={customerId}
              rules={data.billing_rules}
              onSaved={reload}
            />
          </CardContent>
        </Card>
      </div>

      {succeeding && (
        <SuccessorDialog
          customerId={customerId}
          customerName={customerName}
          current={data.successors[0] ?? null}
          onClose={() => setSucceeding(false)}
          onSaved={reload}
        />
      )}
    </div>
  );
}

/** Quatre chiffres : ce que le cabinet pèse, et combien de temps il met à payer. */
function Figures({ portfolio }: { portfolio: Portfolio }) {
  const { totals, payment_delay_days: delay, payment_delay_on: on } = portfolio;
  const figures = [
    {
      label: "Chiffre d'affaires facturé",
      value: formatAmount(totals.invoiced),
      note: `${plural(totals.projects, "affaire")}, dont ${totals.open_projects} en cours`,
    },
    { label: "Encaissé", value: formatAmount(totals.collected), note: `marché ${formatAmount(totals.market)}` },
    {
      label: "Reste dû",
      value: formatAmount(totals.remaining),
      note: plural(portfolio.recovery.length, "facture à recouvrer", "factures à recouvrer"),
      alert: Number(totals.remaining) > 0,
    },
    {
      label: "Délai moyen de paiement",
      value: delay === null ? "—" : plural(Math.round(delay), "jour"),
      note: on === 0 ? "aucune facture payée et datée" : `sur ${plural(on, "facture payée", "factures payées")}`,
    },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-demo="portfolio-figures">
      {figures.map((figure) => (
        <Card key={figure.label} className="gap-1 px-4 py-3">
          <p className="text-muted-foreground truncate text-xs">{figure.label}</p>
          <p className={`text-xl font-semibold tabular-nums ${figure.alert ? "text-danger" : ""}`}>
            {figure.value}
          </p>
          <p className="text-muted-foreground text-xs">{figure.note}</p>
        </Card>
      ))}
    </div>
  );
}

/** D'où vient le cabinet et qui l'a repris — Cerutti devenu CGI, AGEFIM devenu OXIA. */
function Succession({
  portfolio,
  canWrite,
  onEdit,
}: {
  portfolio: Portfolio;
  canWrite: boolean;
  onEdit: () => void;
}) {
  const { predecessors, successors } = portfolio;
  if (predecessors.length === 0 && successors.length === 0 && !canWrite) return null;
  return (
    <Card className="gap-0 py-0" data-demo="portfolio-succession">
      <CardHeader className="py-3">
        <CardTitle className="text-sm">Historique du cabinet</CardTitle>
        <CardDescription className="flex flex-col gap-0.5 text-xs">
          {predecessors.length === 0 && successors.length === 0 && (
            <span>Aucune reprise enregistrée : ni prédécesseur, ni successeur.</span>
          )}
          {predecessors.length > 0 && (
            <span>
              A repris <Chain members={predecessors} />
            </span>
          )}
          {successors.length > 0 && (
            <span>
              Repris par <Chain members={successors} />
            </span>
          )}
        </CardDescription>
        {canWrite && (
          <CardAction>
            <Button size="sm" variant="outline" onClick={onEdit}>
              Repris par…
            </Button>
          </CardAction>
        )}
      </CardHeader>
    </Card>
  );
}

function Chain({ members }: { members: ChainMember[] }) {
  return (
    <>
      {members.map((member, index) => (
        <span key={member.id}>
          {index > 0 && ", "}
          <Link href={`/customers/${member.id}?vue=portefeuille`} className="text-foreground font-medium hover:underline">
            {member.name}
          </Link>
          {member.started_at && ` (${formatDate(member.started_at)})`}
        </span>
      ))}
    </>
  );
}
