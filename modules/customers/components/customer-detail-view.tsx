"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  ArchiveIcon,
  Trash2Icon,
  ArrowLeftIcon,
  EllipsisIcon,
  MailIcon,
  PencilIcon,
  PhoneIcon,
  SparklesIcon,
} from "lucide-react";
import { usePermission } from "@/modules/auth";
import { useSetPageTitle } from "@/modules/shell";
import { CustomerMail } from "@/modules/mail";
import { ClaudeButton, customerContext } from "@/modules/assistant";
import { CustomerDocuments } from "@/modules/files";
import { CustomerTasksPanel } from "@/modules/tasks";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MENU_ITEM, MENU_ITEM_DANGER, MENU_LABEL, MenuAction } from "@/shared/ui/menu-action";
import { Bar, ListSkeleton } from "@/shared/ui/loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorNotice } from "@/shared/ui/feedback";
import { formatPhone } from "@/shared/lib/format";
import { CUSTOMER_KIND, CUSTOMER_RELATION, CUSTOMER_STATUS } from "../lib/labels";
import { relationOf } from "../lib/classification";
import { useCustomer } from "../hooks/use-customer";
import { useAction } from "../hooks/use-customers";
import * as api from "../lib/api";
import { CustomerForm } from "./customer-form";
import { CustomerHeadline } from "./customer-headline";
import { CustomerGlance } from "./customer-glance";
import { ReviewChecks } from "./review-checks";
import { ClientToggle } from "./client-toggle";
import { CustomerIssuerBadge, CustomerIssuerNote } from "./customer-issuer";
import { EnrichDialog } from "./enrich-dialog";
import { DetailsPanel } from "./details-panel";
import { CustomerGraph } from "./customer-graph";
import { EnumBadge } from "./enum-badge";
import { InteractionsPanel } from "./interactions-panel";
import { ProjectsPanel } from "./projects-panel";
import { SyncFooter } from "./sync-footer";
import { askConfirm } from "@/shared/ui/confirm";
import { lastListHref } from "../lib/list-query";

/**
 * Fiche client en trois onglets plutôt qu'en une page dense : les affaires (le
 * quotidien), les échanges, puis les informations qu'on ne consulte que
 * ponctuellement. Les coordonnées restent dans l'en-tête, toujours visibles.
 */
export function CustomerDetailView({ customerId }: { customerId: string }) {
  const router = useRouter();
  const { customer, loading, error, reload, mutate } = useCustomer(customerId);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const VUES = ["affaires", "graphe", "echanges", "taches", "courriels", "documents", "details"];
  const vueDemandee = searchParams.get("vue") ?? "";
  const vue = searchParams.get("affaire") || !VUES.includes(vueDemandee) ? "affaires" : vueDemandee;
  const [editing, setEditing] = useState(false);
  const [enriching, setEnriching] = useState(false);

  useSetPageTitle(customer?.display_name ?? null);

  const canWrite = usePermission("customers:write");
  const canDelete = usePermission("customers:delete");
  // Lire les échanges d'un client est plus intrusif que lire sa fiche : la
  // permission est distincte, et l'onglet disparaît avec elle.
  const canReadMail = usePermission("mail:read");
  const remove = useAction(() => api.deleteCustomer(customerId), { inline: true });
  const purge = useAction(() => api.purgeCustomer(customerId), { inline: true });

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
      {error && (
        <ErrorNotice
          message={`Fiche non actualisée : ${error}`}
          onRetry={reload}
        />
      )}

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{customer.display_name}</h1>
            <EnumBadge value={customer.status} entries={CUSTOMER_STATUS} />
            {/* Déduit des pièces : une cliente archivée reste une cliente. */}
            {customer.is_client && customer.status !== "client" && (
              <span
                data-demo="customer-is-client"
                title="Déduit de ses pièces : devis signé, facture ou paiement reçu"
                className="bg-success-soft text-success rounded-md px-1.5 py-0.5 text-xs font-medium"
              >
                Client
              </span>
            )}
            <EnumBadge value={customer.kind} entries={CUSTOMER_KIND} />
            <RelationBadge customer={customer} />
            {/*
              La société de la fiche, et le geste qui la range. Elle se lit ici
              parce que c'est ici qu'on la cherche — et le badge est le bouton,
              plutôt qu'un réglage posé ailleurs que ce qu'il règle.
            */}
            <CustomerIssuerBadge customer={customer} canWrite={canWrite} onChanged={reload} />
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

          {/*
            Les deux endroits où un humain contredit les pièces : la qualité de
            client, et la société. Ils se relisent ensemble, sur la même ligne.
          */}
          {canWrite && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <ClientToggle customer={customer} onChanged={reload} />
              <CustomerIssuerNote customer={customer} onChanged={reload} />
            </div>
          )}

          <CustomerGlance customer={customer} onChanged={reload} className="mt-3" />

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

        {/*
          Les gestes de la fiche : deux qu'on fait tous les jours, un menu pour
          le reste.

          Il y en avait cinq de même poids sur une rangée, et « Archiver » y
          était rouge alors qu'archiver ne retire rien — la couleur du danger
          portée par un rangement, juste à côté d'une suppression définitive
          qui, elle, ne se rattrape pas. Restent Claude, la recherche dans les
          courriels et « Modifier » ; « Archiver » et « Supprimer » passent sous
          un « … », où la suppression vit seule, en rouge, sous un filet.

          La rangée se replie (`flex-wrap`) : cinq boutons sortaient de l'écran
          d'un téléphone de 390 pixels, et la page entière défilait alors
          latéralement.
        */}
        <div className="flex flex-wrap items-center gap-2">
          {/*
            Chercher dans la messagerie demande `mail:read` côté serveur : faire
            lire vingt-cinq courriels par un modèle est aussi intrusif que les
            lire soi-même. Le bouton suit donc la même permission que l'onglet
            Courriels.
          */}
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
          {canWrite && canReadMail && (
            <Button
              size="sm"
              variant="outline"
              data-demo="bouton-chercher-courriels"
              title="Lire les courriels de la fiche et proposer ce qui manque"
              onClick={() => setEnriching(true)}
            >
              <SparklesIcon />
              Chercher dans les courriels
            </Button>
          )}
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
          {canDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Autres actions sur la fiche"
                  disabled={remove.pending || purge.pending}
                  data-demo="customer-more"
                >
                  <EllipsisIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-1.5">
                <DropdownMenuLabel className={MENU_LABEL}>Fiche</DropdownMenuLabel>
                {/*
                  Archiver range, ça n'efface pas : la fiche sort de la liste
                  par défaut et se retrouve par la recherche. C'est le geste
                  courant, donc il vient en premier et hors du filet rouge.
                */}
                <DropdownMenuItem
                  className={MENU_ITEM}
                  data-demo="customer-archive"
                  onSelect={async () => {
                    const ok = await askConfirm({
                      title: `Archiver « ${customer.display_name} »`,
                      description:
                        "La fiche sort de la liste par défaut. Elle reste trouvable par la recherche et en cochant « Archivé ».",
                      confirmLabel: "Archiver",
                      destructive: false,
                    });
                    if (!ok) return;
                    /*
                      `!== null` et non une vérité : `useAction.run` rend `null`
                      en cas d'échec, et l'API rend **204 sans corps** en cas de
                      succès — donc `undefined`, qui est faux. Tester la vérité
                      faisait échouer silencieusement toute suite d'une
                      suppression réussie, et l'écran restait sur une fiche qui
                      n'existait plus.
                    */
                    if ((await remove.run()) !== null) router.push(lastListHref());
                  }}
                >
                  <MenuAction
                    icon={<ArchiveIcon />}
                    label="Archiver la fiche…"
                    hint="Sort des listes, reste trouvable par la recherche"
                  />
                </DropdownMenuItem>
                {/*
                  Effacer pour de bon, et le dire avant.

                  Ce geste-là ne se rattrape pas, et il existe parce qu'une
                  fiche née d'une faute de frappe continuait de remonter dans la
                  recherche sans qu'aucun écran ne sache s'en débarrasser. La
                  confirmation nomme ce qui part et ce qui reste.
                */}
                <DropdownMenuSeparator className="my-1.5" />
                <DropdownMenuItem
                  variant="destructive"
                  className={MENU_ITEM_DANGER}
                  data-demo="customer-purge"
                  onSelect={async () => {
                    const ok = await askConfirm({
                      title: `Supprimer définitivement « ${customer.display_name} »`,
                      description:
                        "Ses projets, devis, interlocuteurs et échanges partent avec elle. " +
                        "Les courriels et les rendez-vous sont conservés, simplement détachés. " +
                        "Cette suppression ne se rattrape pas.",
                      confirmLabel: "Supprimer définitivement",
                    });
                    if (!ok) return;
                    if ((await purge.run()) !== null) router.push(lastListHref());
                  }}
                >
                  <MenuAction
                    icon={<Trash2Icon />}
                    label="Supprimer définitivement…"
                    hint="Affaires, devis, interlocuteurs et échanges compris"
                    danger
                  />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {remove.error && <ErrorNotice message={remove.error} />}
      {purge.error && <ErrorNotice message={purge.error} />}

      {/*
        L'onglet se lit dans l'adresse (`?vue=`) et s'y écrit : un lien vers
        « les courriels de cette fiche » se partage, et une affaire désignée par
        `?affaire=` ouvre forcément l'onglet des affaires.
      */}
      <Tabs
        value={vue}
        onValueChange={(next) => {
          const params = new URLSearchParams(searchParams.toString());
          params.delete("affaire");
          params.delete("onglet");
          if (next === "affaires") params.delete("vue");
          else params.set("vue", next);
          const qs = params.toString();
          router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        }}
      >
        {/*
          Six onglets font 484 pixels, l'écran d'un téléphone en fait 390.

          La barre défile donc dans son propre cadre plutôt que de pousser la
          page entière : c'est la règle qui vaut déjà pour les tableaux larges.
          `justify-start` pour que « Affaires » reste à gauche au lieu d'être
          centré dans une largeur qu'on ne voit pas en entier.
        */}
        <TabsList className="max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="affaires">
            Affaires
            <span className="text-muted-foreground ml-1.5">{customer.projects.length}</span>
          </TabsTrigger>
          <TabsTrigger value="graphe" data-demo="tab-graphe">Graphe</TabsTrigger>
          <TabsTrigger value="echanges">
            Échanges
            <span className="text-muted-foreground ml-1.5">
              {customer.interactions_total}
            </span>
          </TabsTrigger>
          <TabsTrigger value="taches" data-demo="tab-taches">Tâches</TabsTrigger>
          {canReadMail && <TabsTrigger value="courriels">Courriels</TabsTrigger>}
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="details">Détails</TabsTrigger>
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

        {/*
          Tout ce qui gravite autour de la fiche sur un seul plan : le syndic et
          ses autres immeubles, les interlocuteurs, les affaires, leurs pièces et
          leurs paiements. Monté seulement quand l'onglet est ouvert — la toile et
          le second cercle ne coûtent rien à qui ne les regarde pas.
        */}
        <TabsContent value="graphe" className="mt-4">
          {vue === "graphe" && <CustomerGraph customer={customer} onChanged={reload} />}
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

/**
 * Ce que la fiche représente pour nous — le second axe, à côté du type.
 *
 * Déduite du type tant que personne ne tranche, et alors écrite en retrait :
 * une supposition affichée comme un fait se relit comme un fait.
 */
function RelationBadge({ customer }: { customer: Parameters<typeof relationOf>[0] }) {
  const relation = relationOf(customer);
  if (relation.deduced) {
    return (
      <span
        className="text-muted-foreground rounded-sm border border-dashed px-1.5 py-0.5 text-xs"
        title="Déduite du type — à confirmer dans l'onglet Détails"
      >
        {CUSTOMER_RELATION[relation.value].label}
      </span>
    );
  }
  return <EnumBadge value={relation.value} entries={CUSTOMER_RELATION} />;
}
