"use client";

import Link from "next/link";
import { ArrowRightIcon, LayoutDashboardIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth, usePermission } from "@/modules/auth";
import { ClaudeButton, dashboardContext } from "@/modules/assistant";
import { plural } from "@/shared/lib/format";
import { HUE } from "@/shared/ui/hue";
import {
  alertCount,
  useAgenda,
  useCycleCounts,
  useMyProjects,
  useMyTasks,
  useWorksiteAlerts,
} from "../hooks/use-live";
import { AgendaPanel } from "./agenda-panel";
import { BlockedPanels } from "./blocked-panels";
import { CycleStrip } from "./cycle-strip";
import { ExportSection } from "./export-section";
import { CommercialSection } from "./commercial-section";
import { MyProjectsPanel } from "./my-projects-panel";
import { SectionTitle } from "./parts";
import { TasksPanel } from "./tasks-panel";
import { UnassignedPanel } from "./unassigned-panel";

const dayFormat = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

/**
 * Le tableau de bord, ordonné par ce qu'on en attend le matin.
 *
 * **Tout ce qui ouvre l'écran vient de la base.** Il commençait par quatre
 * compteurs et une liste de relances tirés d'un export figé : des chiffres
 * justes le jour de l'export, et présentés un mois plus tard comme l'état du
 * jour. L'ordre est désormais celui des questions qu'on se pose en arrivant :
 *
 *  1. **Où en sont les fiches** — cinq comptes de cycle, chacun ouvrant sa liste ;
 *  2. **Ma journée** — mes tâches, l'agenda, mes dossiers ;
 *  3. **Signé, mais bloqué** — là où l'argent dort, puisqu'il est déjà gagné ;
 *  4. **À attribuer** — ce que personne ne porte ;
 *  5. l'analyse de l'export, repliée et datée.
 *
 * Chaque panneau a sa lecture, son attente et son erreur : une route qui ne
 * répond pas n'éteint que son bloc.
 */
export function DashboardView() {
  const { account } = useAuth();
  const canReadTasks = usePermission("tasks:read");
  // Des montants de devis : la permission des pièces, comme leur écran.
  const canReadQuotes = usePermission("quotes:read");

  const cycle = useCycleCounts();
  const tasks = useMyTasks(canReadTasks);
  // La route des événements exige `calendar:read`, que la garde de la page ne
  // donne pas : sans lui, le panneau ne se monte pas plutôt que d'afficher un 403.
  const canReadCalendar = usePermission("calendar:read");
  const agenda = useAgenda(canReadCalendar);
  const projects = useMyProjects();
  const blocked = useWorksiteAlerts();

  const firstName = account?.first_name?.trim();
  const relances = cycle.data?.by_filter.a_relancer ?? null;
  const overdue = canReadTasks ? (tasks.data?.overdueTotal ?? null) : 0;
  const alertes = alertCount(blocked.data);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        {/* Le titre porte la teinte du module, comme la barre latérale et le
            fil d'Ariane : on sait où l'on est avant d'avoir lu le mot. */}
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl",
              HUE.violet.soft,
              HUE.violet.text,
            )}
          >
            <LayoutDashboardIcon className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {firstName ? `Bonjour ${firstName}` : "Tableau de bord"}
            </h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              <span className="first-letter:uppercase inline-block">{dayFormat.format(agenda.now)}</span>
              {" — "}
              <Summary
                overdue={overdue}
                relances={relances}
                alertes={alertes}
                pending={cycle.loading || tasks.loading || blocked.loading}
              />
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ClaudeButton
            className="h-8"
            context={dashboardContext({ relances, blocked: alertes, overdue })}
          />
          <Button variant="outline" size="sm" asChild>
            <Link href="/customers">
              Ouvrir les fiches
              <ArrowRightIcon />
            </Link>
          </Button>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <SectionTitle>Où en sont les fiches</SectionTitle>
        <CycleStrip live={cycle} />
      </section>

      {canReadQuotes && <CommercialSection />}

      <section className="flex flex-col gap-3">
        <SectionTitle>Ma journée</SectionTitle>
        <div
          className={cn(
            "grid items-start gap-4",
            // Autant de colonnes que de panneaux permis : pas de colonne vide.
            (canReadTasks || canReadCalendar) && "lg:grid-cols-2",
            canReadTasks && canReadCalendar && "xl:grid-cols-3",
          )}
        >
          {canReadTasks && <TasksPanel live={tasks} />}
          {canReadCalendar && <AgendaPanel live={agenda} now={agenda.now} />}
          <MyProjectsPanel live={projects} />
        </div>
      </section>

      {/*
        Les quatre attentes d'après-signature, dans l'ordre du cycle. Elles
        portent sur de l'argent déjà gagné : un devis sans réponse peut ne
        jamais se signer, un acompte non encaissé est un dû qu'on oublie de
        réclamer.
      */}
      <section className="flex flex-col gap-3">
        <SectionTitle
          aside={
            alertes !== null && alertes > 0 ? (
              <span className="text-muted-foreground text-xs">
                {plural(alertes, "alerte")} sur les affaires signées
              </span>
            ) : undefined
          }
        >
          Signé, mais bloqué
        </SectionTitle>
        <BlockedPanels live={blocked} etudes={blocked.etudes} />
      </section>

      {/* Qui porte quoi est un fait du jour. */}
      <UnassignedPanel />

      <ExportSection />
    </div>
  );
}

/**
 * La phrase du matin : ce qui presse, en chiffres qui viennent de la base.
 *
 * Elle ne dit « rien ne presse » que lorsque les trois lectures sont revenues
 * à zéro. Tant qu'une seule manque, elle se tait sur celle-là plutôt que de
 * conclure : une bonne nouvelle annoncée sur une réponse absente est fausse.
 */
function Summary({
  overdue,
  relances,
  alertes,
  pending,
}: {
  overdue: number | null;
  relances: number | null;
  alertes: number | null;
  /** Une lecture au moins n'est pas encore revenue. */
  pending: boolean;
}) {
  const known = [overdue, relances, alertes].filter((value) => value !== null);

  const parts = [
    overdue ? `${plural(overdue, "tâche")} en retard` : null,
    relances ? `${plural(relances, "fiche")} à relancer` : null,
    alertes ? `${plural(alertes, "alerte")} après signature` : null,
  ].filter((part): part is string => part !== null);

  if (parts.length === 0) {
    if (pending) return <>lecture de l&apos;activité…</>;
    return known.length === 3 ? (
      <>rien ne presse.</>
    ) : (
      <>une partie de l&apos;activité n&apos;a pas pu être lue.</>
    );
  }
  return (
    <>
      {parts.map((part, index) => (
        <span key={part}>
          {index > 0 && ", "}
          <strong className="text-foreground font-semibold">{part}</strong>
        </span>
      ))}
      .
    </>
  );
}
