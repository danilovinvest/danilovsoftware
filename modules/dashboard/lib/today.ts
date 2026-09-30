/**
 * Ce que « aujourd'hui » veut dire pour le tableau de bord.
 *
 * Module pur : ni React, ni réseau, et l'instant lui est passé — une fonction
 * appelée au rendu doit rendre la même chose pour les mêmes entrées.
 */

/** Ce qu'il faut d'un événement pour le ranger dans la journée. */
export type AgendaEntry = {
  starts_at: string;
  ends_at: string;
  all_day: boolean;
};

export type AgendaDays<E> = { today: E[]; tomorrow: E[] };

/** Minuit, heure du poste : la journée de celui qui regarde l'écran. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** `AAAA-MM-JJ` local : la clé de cache d'une journée, pas un instant UTC. */
export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * La fenêtre demandée à l'agenda : aujourd'hui et demain.
 *
 * Demain en fait partie parce qu'on ouvre aussi cet écran à 18 h : une journée
 * finie afficherait un agenda vide, alors que le premier rendez-vous du
 * lendemain est exactement ce qu'on vient vérifier avant de partir.
 */
export function agendaWindow(now: Date): { from: Date; to: Date } {
  return { from: startOfDay(now), to: addDays(now, 2) };
}

/**
 * Range les événements de la fenêtre en deux journées.
 *
 * Un événement commencé avant demain appartient à aujourd'hui, même s'il a
 * débuté la veille : un chantier de trois jours est en cours, pas à venir. La
 * fin d'une journée entière est **exclusive** — un événement clos à minuit
 * pile n'occupe pas le jour qui s'ouvre.
 */
export function groupAgenda<E extends AgendaEntry>(events: E[], now: Date): AgendaDays<E> {
  const today = startOfDay(now).getTime();
  const tomorrow = addDays(now, 1).getTime();
  const after = addDays(now, 2).getTime();

  const overlaps = (event: E, from: number, to: number) =>
    Date.parse(event.starts_at) < to && Date.parse(event.ends_at) > from;
  // Les journées entières d'abord, puis l'ordre des heures.
  const order = (a: E, b: E) =>
    Number(b.all_day) - Number(a.all_day) || Date.parse(a.starts_at) - Date.parse(b.starts_at);

  return {
    today: events.filter((event) => overlaps(event, today, tomorrow)).sort(order),
    tomorrow: events
      .filter((event) => !overlaps(event, today, tomorrow) && overlaps(event, tomorrow, after))
      .sort(order),
  };
}

/** Un rendez-vous terminé : il reste lisible, mais ne réclame plus rien. */
export function isPast(event: AgendaEntry, now: Date): boolean {
  return Date.parse(event.ends_at) <= now.getTime();
}

/**
 * L'adresse de la liste des fiches derrière un compteur.
 *
 * `statut=tous` est la moitié du lien : les comptes du serveur portent sur
 * toute la base, et la liste s'ouvre sur « Clients ». Sans lui, « À relancer
 * 63 » mènerait à une liste de douze lignes — un compteur qui ne retrouve pas
 * ses fiches apprend à ne plus le croire.
 */
export function cycleHref(cycle: string): string {
  return `/customers?cycle=${encodeURIComponent(cycle)}&statut=tous`;
}

export function reviewHref(review: string): string {
  return `/customers?relecture=${encodeURIComponent(review)}&statut=tous`;
}
