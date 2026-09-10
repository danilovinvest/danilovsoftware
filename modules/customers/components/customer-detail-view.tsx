"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArchiveIcon,
  ArrowLeftIcon,
  MailIcon,
  PencilIcon,
  PhoneIcon,
  SparklesIcon,
} from "lucide-react";
import { usePermission } from "@/modules/auth";
import { useSetPageTitle } from "@/modules/shell";
import { CustomerMail } from "@/modules/mail";
import { CustomerDocuments } from "@/modules/files";
import { CustomerTasksPanel } from "@/modules/tasks";
import { Button } from "@/components/ui/button";
import { Bar, ListSkeleton } from "@/shared/ui/loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorNotice } from "@/shared/ui/feedback";
import { formatPhone } from "@/shared/lib/format";
import { CUSTOMER_KIND, CUSTOMER_STATUS } from "../lib/labels";
import { useCustomer } from "../hooks/use-customer";
import { useAction } from "../hooks/use-customers";
import * as api from "../lib/api";
import { CustomerForm } from "./customer-form";
import { CustomerHeadline } from "./customer-headline";
import { ReviewChecks } from "./review-checks";
import { EnrichDialog } from "./enrich-dialog";
import { DetailsPanel } from "./details-panel";
import { EnumBadge } from "./enum-badge";
import { InteractionsPanel } from "./interactions-panel";
import { ProjectsPanel } from "./projects-panel";

/**
 * Fiche client en trois onglets plutôt qu'en une page dense : les affaires (le
 * quotidien), les échanges, puis les informations qu'on ne consulte que
 * ponctuellement. Les coordonnées restent dans l'en-tête, toujours visibles.
 */
export function CustomerDetailView({ customerId }: { customerId: string }) {
  const router = useRouter();
  const { customer, loading, error, reload } = useCustomer(customerId);
  const [editing, setEditing] = useState(false);
  const [enriching, setEnriching] = useState(false);

  useSetPageTitle(customer?.display_name ?? null);

  const canWrite = usePermission("customers:write");
  const canDelete = usePermission("customers:delete");
  // Lire les échanges d'un client est plus intrusif que lire sa fiche : la
  // permission est distincte, et l'onglet disparaît avec elle.
  const canReadMail = usePermission("mail:read");
  const remove = useAction(() => api.deleteCustomer(customerId));

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

  if (error || !customer) {
    return <ErrorNotice message={error ?? "Fiche introuvable."} />;
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

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href="/customers">
          <ArrowLeftIcon />
          Retour aux fiches
        </Link>
      </Button>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{customer.display_name}</h1>
            <EnumBadge value={customer.status} entries={CUSTOMER_STATUS} />
            <EnumBadge value={customer.kind} entries={CUSTOMER_KIND} />
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

          <CustomerHeadline customer={customer} className="mt-3" />

          {/*
            La relecture de la fiche, distincte du cycle de l'affaire : celui-ci
            dit où en est la vente, celle-là ce qu'on sait de la fiche. Les deux
            cent quarante-quatre fiches reprises n'ont jamais été ouvertes une à
            une, et sans trace de ce qui a été relu on rouvre trois fois la même.
          */}
          <ReviewChecks
            customerId={customer.id}
            review={customer.review}
            editable={canWrite}
            className="mt-3"
          />
        </div>

        <div className="flex gap-2">
          {/*
            Chercher dans la messagerie demande `mail:read` côté serveur : faire
            lire vingt-cinq courriels par un modèle est aussi intrusif que les
            lire soi-même. Le bouton suit donc la même permission que l'onglet
            Courriels.
          */}
          {canWrite && canReadMail && (
            <Button variant="outline" onClick={() => setEnriching(true)}>
              <SparklesIcon />
              Chercher dans les courriels
            </Button>
          )}
          {canWrite && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              <PencilIcon />
              Modifier
            </Button>
          )}
          {canDelete && (
            <Button
              variant="destructive"
              disabled={remove.pending}
              onClick={async () => {
                if (!confirm("Archiver cette fiche ? Elle n'apparaîtra plus dans la liste.")) {
                  return;
                }
                if (await remove.run()) router.push("/customers");
              }}
            >
              <ArchiveIcon />
              Archiver
            </Button>
          )}
        </div>
      </header>

      {remove.error && <ErrorNotice message={remove.error} />}

      <Tabs defaultValue="affaires">
        <TabsList>
          <TabsTrigger value="affaires">
            Affaires
            <span className="text-muted-foreground ml-1.5">{customer.projects.length}</span>
          </TabsTrigger>
          <TabsTrigger value="echanges">
            Échanges
            <span className="text-muted-foreground ml-1.5">
              {customer.interactions.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="taches">Tâches</TabsTrigger>
          {canReadMail && <TabsTrigger value="courriels">Courriels</TabsTrigger>}
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="details">Détails</TabsTrigger>
        </TabsList>

        <TabsContent value="affaires" className="mt-4">
          <ProjectsPanel
            customer={customer}
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
            onChanged={reload}
          />
        </TabsContent>

        {canReadMail && (
          <TabsContent value="courriels" className="mt-4">
            <CustomerMail customerId={customer.id} />
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
        </TabsContent>

        <TabsContent value="taches" className="mt-4">
          <CustomerTasksPanel
            customerId={customer.id}
            customerName={customer.display_name}
          />
        </TabsContent>

        <TabsContent value="details" className="mt-4">
          <DetailsPanel customer={customer} onChanged={reload} />
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
