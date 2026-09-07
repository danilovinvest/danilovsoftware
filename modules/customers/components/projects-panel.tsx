"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRightIcon,
  FilePlusIcon,
  FileTextIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { usePermission } from "@/modules/auth";
import { createTask } from "@/modules/tasks";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/shared/ui/feedback";
import { TONE_SOFT } from "@/shared/ui/panel";
import { formatAmount, formatDate } from "@/shared/lib/format";
import { cn } from "@/lib/utils";
import * as api from "../lib/api";
import { PAYMENT_STATUS, PROJECT_STAGE, QUOTE_KIND, QUOTE_STATUS } from "../lib/labels";
import {
  hasSurvey,
  leadQuote,
  nextAction,
  readCycle,
  revisions,

  type ActionKey,
} from "../lib/cycle";
import { readJalons, type Jalons } from "../lib/jalons";
import { useAction } from "../hooks/use-customers";
import { EnumBadge } from "./enum-badge";
import { InteractionDialog } from "./interaction-dialog";
import { OutcomeDialog } from "./outcome-dialog";
import { ProjectCycle } from "./project-cycle";
import { ProjectJalons } from "./project-jalons";
import { ProjectNextAction } from "./project-next-action";
import { ProjectTimeline } from "./project-timeline";
import { ProjectDialog, QuoteDialog } from "./project-dialogs";
import { RelanceDialog } from "./relance-dialog";
import type {
  CustomerDetail,
  Interaction,
  InteractionKind,
  Project,
  Quote,
} from "../lib/types";

/**
 * Onglet « Affaires ».
 *
 * Chaque affaire est un accordéon. Replié, il répond à « où en est-on » sans
 * qu'on l'ouvre : la frise et le temps d'attente suffisent. Déplié, il dit quoi
 * faire, puis montre l'histoire, les devis et l'après-signature.
 *
 * L'ancien écran posait une liste déroulante d'étape et un bouton « Signaler un
 * blocage ». Les deux demandaient à l'utilisateur de traduire lui-même son
 * métier en vocabulaire de base de données. Ici c'est l'inverse : l'écran lit
 * la base et propose le geste suivant.
 */
export function ProjectsPanel({
  customer,
  projects,
  quotes,
  interactions,
  onChanged,
}: {
  customer: CustomerDetail;
  projects: Project[];
  quotes: Quote[];
  interactions: Interaction[];
  onChanged: () => void;
}) {
  const canWrite = usePermission("customers:write");
  const canWriteQuotes = usePermission("quotes:write");

  const [projectOpen, setProjectOpen] = useState(false);
  const [quoteFor, setQuoteFor] = useState<Project | null>(null);

  // L'instant est figé au montage : sinon « 12 jours sans réponse » se
  // recalculerait à chaque rendu, sur une horloge qui a bougé.
  const [now] = useState(() => Date.now());

  /**
   * Ce que l'utilisateur coche sur les jalons simulés, le temps de la session.
   * Ce n'est pas de l'état d'affichage : c'est la seule mémoire dont disposent
   * les quatre jalons que l'API ne stocke pas encore.
   */
  /*
    Les jalons ne vivent plus en mémoire.

    Ils étaient conservés ici, par affaire, et mouraient au rechargement :
    cocher « RIB envoyé » ne servait à rien, et l'alerte « aucune date de
    chantier » ne reposait sur rien. Chaque case écrit maintenant en base, puis
    la fiche se recharge — un jalon se coche deux ou trois fois dans la vie
    d'une affaire, ça ne mérite pas une mise à jour optimiste.
  */
  const saveJalons = useAction(
    async (project: Project, patch: Partial<Jalons>) => {
      // La date de chantier est `started_at` de l'affaire, pas un jalon à
      // part : c'est la colonne que l'écran Chantiers lit déjà.
      if ("worksite_date" in patch) {
        const date = patch.worksite_date;
        await api.updateProject(project.id, {
          label: project.label,
          stage: project.stage,
          outcome: project.outcome,
          outcome_note: project.outcome_note,
          site_address: project.site_address,
          site_postal_code: project.site_postal_code,
          site_city: project.site_city,
          notes: project.notes,
          started_at: date ? date.slice(0, 10) : null,
          closed_at: project.closed_at,
        });
        return;
      }

      const actuels = readJalons(
        project.id,
        quotes.filter((quote) => quote.project_id === project.id),
        customer.milestones,
        project,
      );
      const suivant = { ...actuels, ...patch };
      await api.setMilestones(project.id, {
        rib_sent_at: suivant.rib_sent_at,
        insurance_sent_at: suivant.insurance_sent_at,
        materials_ordered_at: suivant.materials_ordered_at,
        resume_at: suivant.resume_at,
      });
    },
  );

  if (projects.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {canWrite && <NewProjectButton onClick={() => setProjectOpen(true)} />}
        <Card>
          <EmptyState
            title="Aucune affaire"
            description="Créez une affaire pour y suivre le cycle, du premier appel à la commande des matériaux."
          />
        </Card>
        <ProjectDialog
          key={projectOpen ? "project-open" : "project-closed"}
          customerId={customer.id}
          open={projectOpen}
          onOpenChange={setProjectOpen}
          onSaved={onChanged}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {canWrite && (
        <div className="flex justify-end">
          <NewProjectButton onClick={() => setProjectOpen(true)} />
        </div>
      )}

      {projects.map((project, index) => (
        <ProjectBlock
          key={project.id}
          customer={customer}
          project={project}
          quotes={quotes.filter((quote) => quote.project_id === project.id)}
          interactions={interactions.filter((entry) => entry.project_id === project.id)}
          jalons={readJalons(
            project.id,
            quotes.filter((quote) => quote.project_id === project.id),
            customer.milestones,
            project,
          )}
          now={now}
          canWrite={canWrite}
          canWriteQuotes={canWriteQuotes}
          // La première affaire s'ouvre : sur la majorité des fiches il n'y en
          // a qu'une, et la refermer d'office ferait un clic pour rien.
          defaultOpen={index === 0}
          onOverride={async (patch) => {
            if (await saveJalons.run(project, patch)) onChanged();
          }}
          onAddQuote={() => setQuoteFor(project)}
          onChanged={onChanged}
        />
      ))}

      <ProjectDialog
        key={projectOpen ? "project-open" : "project-closed"}
        customerId={customer.id}
        open={projectOpen}
        onOpenChange={setProjectOpen}
        onSaved={onChanged}
      />
      <QuoteDialog
        key={quoteFor?.id ?? "quote-closed"}
        project={quoteFor}
        onOpenChange={(open) => !open && setQuoteFor(null)}
        onSaved={onChanged}
      />
    </div>
  );
}

function NewProjectButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="sm" variant="outline" onClick={onClick}>
      <PlusIcon />
      Nouvelle affaire
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Une affaire
// ---------------------------------------------------------------------------

function ProjectBlock({
  customer,
  project,
  quotes,
  interactions,
  jalons,
  now,
  canWrite,
  canWriteQuotes,
  defaultOpen,
  onOverride,
  onAddQuote,
  onChanged,
}: {
  customer: CustomerDetail;
  project: Project;
  quotes: Quote[];
  interactions: Interaction[];
  jalons: Jalons;
  now: number;
  canWrite: boolean;
  canWriteQuotes: boolean;
  defaultOpen: boolean;
  onOverride: (patch: Partial<Jalons>) => void | Promise<void>;
  onAddQuote: () => void;
  onChanged: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [tab, setTab] = useState("chronologie");
  const [relance, setRelance] = useState(false);
  const [outcome, setOutcome] = useState<"refuse" | "postpone" | null>(null);
  const [logging, setLogging] = useState<InteractionKind | null>(null);

  const points = readCycle(project, quotes, interactions, jalons, now);
  const action = nextAction(points, project, quotes, jalons, now);
  const lead = leadQuote(quotes);

  const reopen = useAction(() =>
    api.setProjectStage(project.id, { stage: project.stage, outcome: null, outcome_note: "" }),
  );

  // L'acompte est réel : il vit sur le devis signé. Le marquer facturé ou
  // encaissé écrit donc en base, contrairement aux quatre jalons simulés.
  const setDeposit = useAction((status: "en_attente" | "recu") => {
    const target = quotes.find((q) => q.status === "accepte" || q.status === "realise") ?? lead;
    if (!target) throw new Error("Aucun devis à mettre à jour sur cette affaire.");
    return api.updateQuote(target.id, {
      reference: target.reference,
      kind: target.kind,
      label: target.label,
      status: target.status,
      issued_at: target.issued_at,
      amount_ht: target.amount_ht,
      amount_ttc: target.amount_ttc,
      vat_rate: target.vat_rate,
      amount_note: target.amount_note,
      deposit_status: status,
      balance_status: target.balance_status,
      comment: target.comment,
    });
  });

  const remove = useAction(() => api.deleteProject(project.id));

  async function act(key: ActionKey) {
    switch (key) {
      case "interaction":
        setLogging("appel");
        break;
      case "plan_rdv":
        setLogging("rdv");
        break;
      case "open_calendar":
        router.push("/calendar");
        break;
      case "new_quote":
        onAddQuote();
        break;
      case "relance":
        setRelance(true);
        break;
      case "refuse":
        setOutcome("refuse");
        break;
      case "postpone":
        setOutcome("postpone");
        break;
      case "reopen":
      case "resume":
        if (await reopen.run()) onChanged();
        break;
      case "deposit_invoiced":
        if (await setDeposit.run("en_attente")) onChanged();
        break;
      case "deposit_paid":
        if (await setDeposit.run("recu")) onChanged();
        break;
      case "send_rib":
        onOverride({ rib_sent_at: new Date().toISOString() });
        break;
      case "send_insurance":
        onOverride({ insurance_sent_at: new Date().toISOString() });
        break;
      case "book_date":
        // Réserver une date demande de choisir, pas de cocher : on emmène
        // l'utilisateur là où le sélecteur se trouve.
        setOpen(true);
        setTab("apres");
        break;
      case "order_materials":
        onOverride({ materials_ordered_at: new Date().toISOString() });
        break;
      case "open_worksite":
        router.push("/chantiers");
        break;
    }
  }

  const site = [project.site_address, project.site_postal_code, project.site_city]
    .filter(Boolean)
    .join(", ");

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="hover:bg-muted/30 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors">
          <ChevronRightIcon
            className={cn(
              "text-muted-foreground size-4 shrink-0 transition-transform",
              open && "rotate-90",
            )}
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-medium">{project.label}</span>
              {hasSurvey(quotes) && (
                <span className="text-muted-foreground bg-muted rounded-md px-1.5 py-0.5 text-[0.65rem]">
                  sondage
                </span>
              )}
            </div>
            <div className="text-muted-foreground truncate text-xs">
              {site || "Chantier non renseigné"}
            </div>
          </div>

          {/* Replié, la frise et l'attente répondent seules à « où en est-on ». */}
          <ProjectCycle points={points} size="mini" className="hidden shrink-0 sm:inline-flex" />

          <span
            className={cn(
              "hidden shrink-0 rounded-md px-1.5 py-0.5 text-[0.7rem] whitespace-nowrap md:inline-block",
              action.alert ? TONE_SOFT[action.tone] : "text-muted-foreground",
            )}
          >
            {action.title}
          </span>

          <span className="shrink-0 text-sm font-semibold tabular-nums">
            {project.total_amount_ttc === "0" ? "—" : formatAmount(project.total_amount_ttc)}
          </span>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="flex flex-col gap-4 border-t px-4 py-4">
            <ProjectCycle points={points} />

            {canWrite && (
              <ProjectNextAction
                action={action}
                onAct={act}
                pending={reopen.pending || setDeposit.pending}
              />
            )}

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
                  <TabsTrigger value="devis">
                    Devis
                    {quotes.length > 0 && (
                      <span className="text-muted-foreground ml-1.5 text-xs">{quotes.length}</span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="apres">Après-signature</TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-2">
                  <EnumBadge value={project.stage} entries={PROJECT_STAGE} />
                  {canWriteQuotes && (
                    <Button size="xs" variant="outline" onClick={onAddQuote}>
                      <FilePlusIcon />
                      Devis
                    </Button>
                  )}
                  {canWrite && (
                    <Button
                      size="xs"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive"
                      disabled={remove.pending}
                      onClick={async () => {
                        if (!confirm(`Supprimer l'affaire « ${project.label} » et ses devis ?`)) return;
                        if (await remove.run()) onChanged();
                      }}
                    >
                      <Trash2Icon />
                    </Button>
                  )}
                </div>
              </div>

              <TabsContent value="chronologie" className="pt-4">
                <ProjectTimeline interactions={interactions} />
              </TabsContent>

              <TabsContent value="devis" className="pt-4">
                <QuoteList quotes={quotes} onChanged={onChanged} />
              </TabsContent>

              <TabsContent value="apres" className="pt-4">
                <ProjectJalons
                  jalons={jalons}
                  disabled={!canWrite || setDeposit.pending}
                  onToggle={async (key, value) => {
                    /*
                      L'acompte appartient au devis : cocher « facturé » ou
                      « encaissé » change son statut, et le serveur en horodate
                      la date. Les quatre autres jalons passent par leur table.
                    */
                    if (key === "deposit_invoiced_at") {
                      if (await setDeposit.run(value ? "en_attente" : "en_attente")) onChanged();
                      return;
                    }
                    if (key === "deposit_paid_at") {
                      if (await setDeposit.run(value ? "recu" : "en_attente")) onChanged();
                      return;
                    }
                    onOverride({ [key]: value });
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {relance && (
        <RelanceDialog
          customer={customer}
          project={project}
          quotes={quotes}
          open={relance}
          onOpenChange={setRelance}
          onSaved={onChanged}
        />
      )}
      {outcome && (
        <OutcomeDialog
          project={project}
          mode={outcome}
          open={outcome !== null}
          onOpenChange={(next) => !next && setOutcome(null)}
          onSaved={onChanged}
          onScheduleResume={async (date, _outcome, note) => {
            await onOverride({ resume_at: date });
            /*
            Une affaire reportée n'est réveillée par rien.

            La date de reprise devient donc une vraie tâche, échue ce jour-là et
            rattachée à l'affaire. C'est le seul mécanisme du CRM qui sache
            revenir vers quelqu'un à une date, et le réécrire ici en aurait fait
            un second — qui aurait divergé du premier.
            */
            await createTask({
              title: `Reprendre « ${project.label} »`,
              body: note ? `Reportée : ${note}` : "Affaire reportée, à revoir.",
              status: "a_faire",
              due_at: new Date(`${date}T09:00:00`).toISOString(),
              assignee_id: null,
              targets: [{ project_id: project.id }],
            }).catch(() => {
              // Le report lui-même est déjà enregistré : échouer ici ne doit
              // pas défaire ce que l'utilisateur vient de valider.
            });
          }}
        />
      )}
      {logging && (
        <InteractionDialog
          project={project}
          kind={logging}
          open={logging !== null}
          onOpenChange={(next) => !next && setLogging(null)}
          onSaved={onChanged}
        />
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Les devis, et la négociation qui s'y lit
// ---------------------------------------------------------------------------

/**
 * La liste des devis, du plus ancien au plus récent.
 *
 * L'ordre chronologique n'est pas cosmétique : c'est ainsi qu'on voit la
 * négociation. Deux devis de même nature à trois semaines d'écart, le second
 * moins cher, racontent une remise — l'écart est affiché, parce que c'est lui
 * qu'on cherche.
 */
function QuoteList({ quotes, onChanged }: { quotes: Quote[]; onChanged: () => void }) {
  const canDelete = usePermission("quotes:delete");
  const remove = useAction((id: string) => api.deleteQuote(id));

  if (quotes.length === 0) {
    return (
      <EmptyState
        title="Aucun devis"
        description="L'étude, les sondages et les travaux se chiffrent ici, un devis par lot."
      />
    );
  }

  const ordered = revisions(quotes);

  return (
    <ul className="divide-y">
      {ordered.map((quote, index) => {
        const previous = ordered
          .slice(0, index)
          .filter((other) => other.kind === quote.kind)
          .at(-1);
        const delta = previous ? amount(quote) - amount(previous) : 0;
        const revision = previous ? ordered.slice(0, index).filter((o) => o.kind === quote.kind).length + 1 : 0;

        return (
          <li key={quote.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
            <span className="font-mono text-xs">{quote.reference || quote.label || "Devis"}</span>
            <EnumBadge value={quote.kind} entries={QUOTE_KIND} />
            <EnumBadge value={quote.status} entries={QUOTE_STATUS} />

            {revision > 1 && (
              <span className="text-muted-foreground bg-muted rounded-md px-1.5 py-0.5 text-[0.65rem]">
                révision {revision}
              </span>
            )}

            {quote.deposit_status !== "non_applicable" && (
              <span className="text-muted-foreground text-xs">
                acompte {PAYMENT_STATUS[quote.deposit_status].label.toLowerCase()}
              </span>
            )}

            <span className="text-muted-foreground text-xs">{formatDate(quote.issued_at)}</span>

            <span className="ml-auto flex items-center gap-2">
              {delta !== 0 && (
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    delta < 0 ? "text-success" : "text-warning",
                  )}
                  title={`Écart avec ${previous?.reference || "le devis précédent"}`}
                >
                  {delta > 0 ? "+" : ""}
                  {Math.round(delta).toLocaleString("fr-FR")} €
                </span>
              )}
              <span className="text-sm font-medium tabular-nums">
                {quote.amount_ttc || quote.amount_ht
                  ? formatAmount(quote.amount_ttc ?? quote.amount_ht)
                  : quote.amount_note || "—"}
              </span>
            </span>

            {/*
              Le devis lui-même, quand la copie OneDrive en connaît l'adresse.
              Le fichier n'est pas dans le CRM : le lien l'ouvre chez Microsoft,
              et c'est ce qui évite de faire entrer trois cents PDF en base.
            */}
            {quote.drive_url && (
              <a
                href={quote.drive_url}
                target="_blank"
                rel="noreferrer"
                title={quote.drive_name}
                className="text-muted-foreground hover:text-primary hover:border-primary/40 flex w-full min-w-0 items-center gap-1.5 rounded-md border border-dashed px-2 py-1.5 text-xs transition-colors"
              >
                <FileTextIcon className="size-3.5 shrink-0" />
                <span className="truncate">{quote.drive_name || "Ouvrir le devis"}</span>
              </a>
            )}

            {quote.comment && (
              <p className="text-muted-foreground w-full text-xs">{quote.comment}</p>
            )}

            {/*
              Un devis peut être faux : deux fois le même repris d'un dossier
              OneDrive, un montant lu de travers, une référence attribuée à la
              mauvaise affaire. On le supprime ici, à la ligne où on le voit.
            */}
            {canDelete && (
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-muted-foreground/50 hover:text-danger -my-1"
                aria-label="Supprimer le devis"
                disabled={remove.pending}
                onClick={async () => {
                  const nom = quote.reference || quote.label || "ce devis";
                  if (!confirm(`Supprimer le devis « ${nom} » ?`)) return;
                  if (await remove.run(quote.id)) onChanged();
                }}
              >
                <Trash2Icon />
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function amount(quote: Quote): number {
  const raw = quote.amount_ttc ?? quote.amount_ht;
  const value = raw ? Number.parseFloat(raw) : Number.NaN;
  return Number.isNaN(value) ? 0 : value;
}
