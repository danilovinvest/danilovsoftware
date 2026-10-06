"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSWRConfig } from "swr";
import { LIVE, useCached } from "@/shared/api/cache";
import { errorMessage } from "@/shared/api/errors";
import { listEvents, type CalendarEvent } from "@/modules/calendar";
import {
  deadlineOf,
  getSales,
  getStats,
  listAwaitingQuotes,
  type AwaitingQuotes,
  type SalesSummary,
  listMyProjects,
  listUnassigned,
  urgencyOf,
  type CustomerStats,
  type Deadline,
  type MyProject,
  type ProjectUrgency,
  type UnassignedPage,
} from "@/modules/customers";
import { scopeParam, useScope } from "@/modules/group";
import { listTasks, type Task, type TaskStatus } from "@/modules/tasks";
import {
  alerts,
  listWorksites,
  read,
  studyAlerts,
  type Alert,
} from "@/modules/worksites";
import { agendaWindow, dayKey, groupAgenda, type AgendaDays } from "../lib/today";

/**
 * Les lectures vivantes du tableau de bord.
 *
 * Chacune passe par le cache partagé (`useCached`) : revenir sur l'écran
 * montre tout de suite la dernière réponse, puis la revérifie. Et chaque
 * panneau garde **son** attente et **son** erreur — un agenda qui ne répond
 * pas ne doit pas éteindre les tâches du jour.
 */
export type Live<T> = {
  data: T | null;
  /** Cette question n'a encore aucune réponse, ni bonne ni mauvaise. */
  loading: boolean;
  error: string | null;
  /** Relit, et ne rend la main qu'une fois la réponse revenue. */
  reload: () => Promise<void>;
};

function useLive<T>(key: string | null, load: () => Promise<T>): Live<T> {
  const { data, error, isLoading, mutate } = useCached(key, load, LIVE);
  const reload = useCallback(async () => {
    await mutate();
  }, [mutate]);
  return {
    data: data ?? null,
    loading: isLoading && data === undefined,
    error: error ? errorMessage(error) : null,
    reload,
  };
}

/** Au-delà d'une minute, l'instant lu n'est plus « maintenant ». */
const NOW_STALE_MS = 60_000;
const NOW_TICK_MS = 5 * 60_000;

/**
 * L'instant de référence de l'écran, tenu à jour sans bouger à chaque rendu.
 *
 * Il était lu une fois au montage — et l'application reste ouverte des jours :
 * le mardi, « aujourd'hui » rangeait encore lundi, et aucun dossier ne passait
 * en retard. Il avance donc au retour sur la fenêtre et toutes les cinq
 * minutes, jamais pendant un rendu : deux lignes se jugent sur la même horloge.
 */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      setNow((previous) =>
        Date.now() - previous.getTime() > NOW_STALE_MS ? new Date() : previous,
      );
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const timer = setInterval(refresh, NOW_TICK_MS);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      clearInterval(timer);
    };
  }, []);
  return now;
}

/** Ce qui réclame encore quelque chose : tout sauf « terminée ». */
const OPEN: TaskStatus[] = ["a_faire", "en_cours", "en_attente"];

export type MyTasks = {
  overdue: Task[];
  /** Le compte du serveur : la liste, elle, est bornée à une page. */
  overdueTotal: number;
  today: Task[];
};

/**
 * Mes tâches en retard et du jour — les deux questions que pose déjà la cloche.
 *
 * `due=today` ne retire pas les tâches terminées côté serveur, d'où le statut
 * passé explicitement. Une tâche d'aujourd'hui dont l'heure est passée est
 * aussi en retard : elle n'est comptée qu'une fois, dans le retard.
 */
export function useMyTasks(enabled: boolean): Live<MyTasks> {
  return useLive(enabled ? "dashboard:tasks:mine" : null, async () => {
    const [late, day] = await Promise.all([
      listTasks({ assignee_id: "mine", due: "overdue", status: OPEN, sort: "due", per_page: 20 }),
      listTasks({ assignee_id: "mine", due: "today", status: OPEN, sort: "due", per_page: 20 }),
    ]);
    return {
      overdue: late.items,
      overdueTotal: late.total,
      today: day.items.filter((task) => !task.is_overdue),
    };
  });
}

/** Les rendez-vous d'aujourd'hui et de demain, et l'instant qui les a rangés. */
export function useAgenda(enabled: boolean): Live<AgendaDays<CalendarEvent>> & { now: Date } {
  const now = useNow();
  // La clé ne porte que le jour : l'instant avance sans reposer la question.
  const live = useLive(enabled ? `dashboard:agenda:${dayKey(now)}` : null, () => {
    const { from, to } = agendaWindow(now);
    return listEvents(from, to).then((result) => result.items);
  });
  const days = useMemo(() => (live.data ? groupAgenda(live.data, now) : null), [live.data, now]);
  return { ...live, data: days, now };
}

export type MyProjectRow = {
  project: MyProject;
  deadline: Deadline | null;
  urgency: ProjectUrgency;
};

/** Le plafond d'une page côté API : la liste arrive triée par urgence. */
const MY_PROJECTS_LIMIT = 200;
const MY_PROJECTS_KEY = "dashboard:projects:mine";

/** Mes dossiers, dans l'ordre d'urgence que le serveur a déjà posé. */
export function useMyProjects(): Live<MyProjectRow[]> {
  const now = useNow().getTime();
  const live = useLive(MY_PROJECTS_KEY, () =>
    listMyProjects(MY_PROJECTS_LIMIT).then((page) => page.items),
  );
  const rows = useMemo(
    () =>
      live.data?.map((project) => {
        const deadline = deadlineOf(project, project.is_delivered, now);
        return { project, deadline, urgency: urgencyOf(project, deadline) };
      }) ?? null,
    [live.data, now],
  );
  return { ...live, data: rows };
}

/**
 * Les comptes de cycle, pour la société en cours.
 *
 * La clé est celle de la liste des fiches (`useCustomerStats`) : les deux
 * écrans posent la même question, ils partagent la même réponse.
 */
export function useCycleCounts(): Live<CustomerStats> {
  const issuer = scopeParam(useScope()) ?? "";
  return useLive(`customers:stats:${issuer}`, () => getStats(issuer));
}

/** Les quatre listes d'après-signature : mêmes clés pour les deux métiers. */
export type AlertLists = Record<"unplanned" | "running" | "toInvoice" | "noDeposit", Alert[]>;

/**
 * Ce qui est signé et n'avance pas, lu sur la base.
 *
 * Par les mêmes règles que les listes de travail des écrans Chantiers et
 * Études — deux écrans, une seule vérité. L'en-tête et les quatre panneaux
 * lisent cette réponse-ci : le chiffre annoncé en haut est celui qu'on compte
 * en bas.
 */
export function useWorksiteAlerts(): Live<AlertLists> & { etudes: boolean } {
  const scope = useScope();
  const issuer = scopeParam(scope) ?? "";
  const etudes = scope === "ompt-structure";
  const live = useLive<AlertLists>(`dashboard:worksites:${issuer}:${etudes ? "etudes" : "travaux"}`, () =>
    listWorksites("", issuer).then((result) => {
      // L'horloge du serveur, pas celle du poste : c'est elle qui a daté la réponse.
      const now = Date.parse(result.generated_at);
      const reads = result.items.map((worksite) => read(worksite, now));
      return etudes ? studyAlerts(reads) : alerts(reads);
    }),
  );
  return { ...live, etudes };
}

/** Combien d'alertes en tout, ou nul tant qu'on ne le sait pas. */
export function alertCount(lists: AlertLists | null): number | null {
  if (!lists) return null;
  return lists.unplanned.length + lists.running.length + lists.toInvoice.length + lists.noDeposit.length;
}

/** Les dossiers actifs que personne ne porte, pour la société en cours. */
export function useUnassigned(limit: number): Live<UnassignedPage> {
  const issuer = scopeParam(useScope());
  return useLive(`dashboard:unassigned:${issuer ?? ""}:${limit}`, () =>
    listUnassigned({ limit, issuer }),
  );
}

/**
 * Ce qu'une attribution change ailleurs sur l'écran.
 *
 * S'attribuer un dossier le fait entrer dans « Mes dossiers » : sans cette
 * relecture, il quittait un panneau sans apparaître dans l'autre avant le
 * prochain retour sur la fenêtre.
 */
export function useRefreshMyProjects(): () => Promise<void> {
  const { mutate } = useSWRConfig();
  return useCallback(async () => {
    await mutate(MY_PROJECTS_KEY);
  }, [mutate]);
}

/**
 * La synthèse commerciale : douze mois de devis, et ceux qui attendent une
 * réponse. La seconde partage la clé de l'écran « Devis sans réponse », qui
 * s'ouvre donc déjà chargé depuis le tableau de bord. Nulles sans `quotes:read`.
 */
export function useSales(enabled: boolean): Live<SalesSummary> {
  const issuer = scopeParam(useScope());
  return useLive(enabled ? `dashboard:sales:${issuer ?? ""}` : null, () => getSales(issuer));
}

export function useAwaitingQuotes(enabled: boolean): Live<AwaitingQuotes> {
  const issuer = scopeParam(useScope());
  return useLive(enabled ? `customers:awaiting:${issuer ?? ""}` : null, () =>
    listAwaitingQuotes(issuer),
  );
}
