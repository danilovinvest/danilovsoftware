"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeftIcon, MailIcon, PencilIcon, PhoneIcon } from "lucide-react";
import { usePermission } from "@/modules/auth";
import { useSetPageTitle } from "@/modules/shell";
import { CustomerMail } from "@/modules/mail";
import { ClaudeButton, customerContext } from "@/modules/assistant";
import { CustomerDocuments } from "@/modules/files";
import { CustomerTasksPanel } from "@/modules/tasks";
import { Button } from "@/components/ui/button";
import { Bar, ListSkeleton } from "@/shared/ui/loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorNotice } from "@/shared/ui/feedback";
import { formatPhone } from "@/shared/lib/format";
import { useCustomer } from "../hooks/use-customer";
import { CustomerForm } from "./customer-form";
import { CustomerGlance } from "./customer-glance";
import { CustomerStatus, StatusOverrides } from "./customer-status";
import { CustomerMoreMenu } from "./customer-more-menu";
import { EnrichDialog } from "./enrich-dialog";
import { FichePanel } from "./fiche-panel";
import { CustomerGraph } from "./customer-graph";
import { InteractionsPanel } from "./interactions-panel";
import { ProjectsPanel } from "./projects-panel";
import { SyncFooter } from "./sync-footer";
import { lastListHref } from "../lib/list-query";

/*
  Les onglets, dans l'ordre où on les ouvre : le quotidien d'abord, la fiche
  elle-même en dernier — on la consulte ponctuellement. « Détails » est devenu
  « Fiche » ; l'ancienne valeur d'adresse reste lue, pour que les liens déjà
  partagés (`?vue=details`) ouvrent toujours le bon onglet.
*/
const VUES = ["affaires", "echanges", "taches", "courriels", "documents", "graphe", "fiche"];
const ALIAS: Record<string, string> = { details: "fiche" };

/**
 * La fiche client : un en-tête qu'on lit d'un coup d'œil — nom, statut,
 * coordonnées, interlocuteurs et notes — puis des onglets. Les coordonnées
 * restent dans l'en-tête, toujours visibles.
 */
export function CustomerDetailView({ customerId }: { customerId: string }) {
  const router = useRouter();
  const { customer, loading, error, reload, mutate } = useCustomer(customerId);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const brute = searchParams.get("vue") ?? "";
  const vueDemandee = ALIAS[brute] ?? brute;
  const vue = searchParams.get("affaire") || !VUES.includes(vueDemandee) ? "affaires" : vueDemandee;
  const [editing, setEditing] = useState(false);
  const [enriching, setEnriching] = useState(false);

  useSetPageTitle(customer?.display_name ?? null);

  const canWrite = usePermission("customers:write");
  const canDelete = usePermission("customers:delete");
  // Lire les échanges d'un client est plus intrusif que lire sa fiche : la
  // permission est distincte, et l'onglet disparaît avec elle.
  const canReadMail = usePermission("mail:read");

  if (loading && !customer) {
    return (
      <div className="flex flex-col gap-4">
        {/* L'en-tête d'abord, les affaires ensuite : c'est l'ordre dans
            lequel la fiche se peint quand elle arrive. */}
        <div className="flex flex-col gap-2">
          <Bar hue="indigo" className="h-6 w-64" />
          <Bar className="h-3 w-96" />
        </div>
        <div className="bg-card overflow-hidden rounded-xl border">
          <ListSkeleton rows={4} hue="indigo" />
        </div>
      </div>
    );
  }

  if (!customer) {
    return <ErrorNotice message={error ?? "Fiche introuvable."} onRetry={reload} />;
  }

  if (editing) {
    return (
      <div className="flex w-full max-w-4xl flex-col gap-4">
        <h1 className="text-xl font-semibold">Modifier — {customer.display_name}</h1>
        <CustomerForm
          customer={customer}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            reload();
          }}
        />
      </div>
    );
  }

  function changerVue(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("affaire");
    params.delete("onglet");
    if (next === "affaires") params.delete("vue");
    else params.set("vue", next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-6">
      {/*
        Le retour ramène la liste telle qu'on l'a quittée — filtres, tri, page —
        et non « Clients, page 1 ». Le lien reste `/customers` pour le rendu et
        l'ouverture dans un nouvel onglet ; le clic lit la dernière liste.
      */}
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link
          href="/customers"
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
            event.preventDefault();
            router.push(lastListHref());
          }}
        >
          <ArrowLeftIcon />
          Retour aux fiches
        </Link>
      </Button>

      {/* La fiche reste à l'écran : c'est son rechargement qui a échoué. */}
      {error && <ErrorNotice message={`Fiche non actualisée : ${error}`} onRetry={reload} />}

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {/*
            Le nom, puis une seule zone de statut : les badges se lisent, et la
            rangée entière ouvre le menu qui les contredit à la main
            (`customer-status.tsx`).
          */}
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{customer.display_name}</h1>
            <CustomerStatus customer={customer} canWrite={canWrite} onChanged={reload} />
          </div>

          <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="font-mono text-xs">{customer.reference}</span>
            {customer.phone && (
              <a
                className="hover:text-primary flex items-center gap-1.5"
                href={`tel:${customer.phone}`}
              >
                <PhoneIcon className="size-3.5" />
                {formatPhone(customer.phone)}
              </a>
            )}
            {customer.email && (
              <a
                className="hover:text-primary flex items-center gap-1.5"
                href={`mailto:${customer.email}`}
              >
                <MailIcon className="size-3.5" />
                {customer.email}
              </a>
            )}
            {customer.city && <span>{customer.city}</span>}
          </div>

          <StatusOverrides customer={customer} />

          {/*
            « Où en est-on » ne se lit plus ici : la ligne qui résumait l'affaire
            la plus pressante répétait ce que chaque affaire dit déjà dans
            l'onglet Affaires, frise et « à faire maintenant » compris.
          */}
          <CustomerGlance customer={customer} onChanged={reload} className="mt-3" />
        </div>

        {/*
          Les gestes de la fiche : deux qu'on fait tous les jours, un menu pour
          le reste (`customer-more-menu.tsx`) — tous à la même hauteur. La
          rangée se replie : rien ne pousse la page de côté sur un téléphone.
        */}
        <div className="flex flex-wrap items-center gap-2">
          {canWrite && (
            <Button
              size="sm"
              variant="outline"
              title="Nom, coordonnées, adresse, propriétaire"
              onClick={() => setEditing(true)}
            >
              <PencilIcon />
              Modifier
            </Button>
          )}
          <ClaudeButton
            size="sm"
            context={customerContext({
              name: customer.display_name,
              reference: customer.reference,
              projects: customer.projects.length,
              quotes: customer.quotes.length,
              documents: customer.quotes.filter((quote) => quote.drive_url).length,
              contacts: customer.contacts.length,
              interactions: customer.interactions_total,
              mail: canReadMail,
            })}
          />
          <CustomerMoreMenu
            customer={customer}
            canEnrich={canWrite && canReadMail}
            canDelete={canDelete}
            onEnrich={() => setEnriching(true)}
          />
        </div>
      </header>

      {/*
        L'onglet se lit dans l'adresse (`?vue=`) et s'y écrit : un lien vers
        « les courriels de cette fiche » se partage, et une affaire désignée par
        `?affaire=` ouvre forcément l'onglet des affaires.
      */}
      <Tabs value={vue} onValueChange={changerVue}>
        {/*
          Sept onglets ne tiennent pas sur un téléphone de 390 pixels. La barre
          passe à la ligne (`flex-wrap`, hauteur libérée de son `h-8`) plutôt que
          de défiler : un onglet coupé au bord ne se voit pas. `justify-start`
          garde « Affaires » à gauche.
        */}
        <TabsList className="max-w-full flex-wrap justify-start group-data-horizontal/tabs:h-auto">
          <TabsTrigger className={TAB} value="affaires">
            Affaires
            <TabCount value={customer.projects.length} />
          </TabsTrigger>
          <TabsTrigger className={TAB} value="echanges">
            Échanges
            <TabCount value={customer.interactions_total} />
          </TabsTrigger>
          <TabsTrigger className={TAB} value="taches" data-demo="tab-taches">Tâches</TabsTrigger>
          {canReadMail && <TabsTrigger className={TAB} value="courriels">Courriels</TabsTrigger>}
          <TabsTrigger className={TAB} value="documents">Documents</TabsTrigger>
          <TabsTrigger className={TAB} value="graphe" data-demo="tab-graphe">Graphe</TabsTrigger>
          <TabsTrigger className={TAB} value="fiche" data-demo="tab-fiche">Fiche</TabsTrigger>
        </TabsList>

        <TabsContent value="affaires" className="mt-4">
          <ProjectsPanel
            focus={{
              affaire: searchParams.get("affaire"),
              onglet: searchParams.get("onglet"),
            }}
            customer={customer}
            onQuote={(updated) =>
              mutate((current) => ({
                ...current,
                quotes: current.quotes.map((quote) => (quote.id === updated.id ? updated : quote)),
              }))
            }
            projects={customer.projects}
            quotes={customer.quotes}
            interactions={customer.interactions}
            onChanged={reload}
          />
        </TabsContent>

        <TabsContent value="echanges" className="mt-4">
          <InteractionsPanel
            customerId={customer.id}
            customerName={customer.display_name}
            interactions={customer.interactions}
            total={customer.interactions_total}
            onChanged={reload}
          />
        </TabsContent>

        <TabsContent value="taches" className="mt-4">
          <CustomerTasksPanel customerId={customer.id} customerName={customer.display_name} />
        </TabsContent>

        {canReadMail && (
          <TabsContent value="courriels" className="mt-4">
            <CustomerMail customerId={customer.id} />
            <SyncFooter />
          </TabsContent>
        )}

        {/*
          Le dossier OneDrive de chaque affaire, lu en direct à l'ouverture de
          l'onglet. Sans compteur : on ne sait combien il y a de fichiers
          qu'en demandant à Microsoft, et on ne le demande pas avant qu'on
          regarde.
        */}
        <TabsContent value="documents" className="mt-4">
          <CustomerDocuments projects={customer.projects} />
          <SyncFooter />
        </TabsContent>

        {/*
          Tout ce qui gravite autour de la fiche sur un seul plan : le syndic et
          ses autres immeubles, les interlocuteurs, les affaires, leurs pièces et
          leurs paiements. Monté seulement quand l'onglet est ouvert — la toile et
          le second cercle ne coûtent rien à qui ne les regarde pas.
        */}
        <TabsContent value="graphe" className="mt-4">
          {vue === "graphe" && <CustomerGraph customer={customer} onChanged={reload} />}
        </TabsContent>

        <TabsContent value="fiche" className="mt-4">
          <FichePanel
            customer={customer}
            onChanged={reload}
            onEdit={canWrite ? () => setEditing(true) : undefined}
          />
        </TabsContent>
      </Tabs>

      {enriching && (
        <EnrichDialog
          customer={customer}
          open={enriching}
          onOpenChange={setEnriching}
          onSaved={reload}
        />
      )}
    </div>
  );
}

/**
 * Les onglets de la fiche, plus aérés que ceux de shadcn.
 *
 * Le compte d'un onglet se lisait comme un onglet de plus — « Affaires 1
 * Graphe » — parce qu'il était exactement aussi loin de son libellé (6 px de
 * `gap` plus sa marge) que de l'onglet suivant (deux fois `px-1.5`). Habiller
 * le chiffre n'y changeait rien : c'est l'écart qui groupe. La pastille colle
 * donc à son libellé (le seul `gap`) et les onglets s'écartent à 24 px.
 */
// Hauteur fixe et pas d'étirement : sur deux lignes, les onglets gardent leur
// taille au lieu de s'étaler pour remplir la rangée.
const TAB = "h-7 flex-none px-3";

/**
 * Le compte d'un onglet, dans une pastille. `bg-foreground/10` et non
 * `bg-muted` : la barre est déjà `muted`, la pastille y aurait disparu — celle-ci
 * ressort sur l'onglet gris comme sur l'onglet actif, dans les deux thèmes.
 */
function TabCount({ value }: { value: number }) {
  return (
    <span className="bg-foreground/10 text-foreground/70 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[11px] leading-none font-medium tabular-nums">
      {value}
    </span>
  );
}
