import type { Attendee, CalendarStyle, CalendarView, Person, ResponseStatus } from "./types";

/**
 * Habillage du calendrier.
 *
 * Les agendas prennent les cinq teintes de graphique du thème (`--chart-1` à
 * `--chart-5`), qui sont précisément faites pour cela : distinctes entre elles,
 * et redéfinies dans le bloc sombre. Aucune couleur littérale n'entre ici, sans
 * quoi le thème sombre cesserait de fonctionner.
 *
 * Google donne pourtant sa propre couleur pour chaque agenda, et on ne s'en
 * sert pas : ce sont des pastels choisis sur fond blanc, dont plusieurs
 * deviennent illisibles en thème sombre. La couleur est donc attribuée par
 * **rang dans la liste** — stable d'une session à l'autre, puisque les agendas
 * arrivent triés, et toujours lisible.
 *
 * Les classes sont écrites en toutes lettres et non composées à la volée :
 * Tailwind ne voit pas `bg-chart-${n}`.
 */
export const CALENDAR_PALETTE: CalendarStyle[] = [
  {
    dot: "bg-chart-1",
    soft: "bg-chart-1/10 hover:bg-chart-1/20",
    text: "text-chart-1",
    solid: "bg-chart-1 text-white",
    rail: "border-l-chart-1",
  },
  {
    dot: "bg-chart-4",
    soft: "bg-chart-4/10 hover:bg-chart-4/20",
    text: "text-chart-4",
    solid: "bg-chart-4 text-white",
    rail: "border-l-chart-4",
  },
  {
    dot: "bg-chart-3",
    soft: "bg-chart-3/10 hover:bg-chart-3/20",
    text: "text-chart-3",
    solid: "bg-chart-3 text-white",
    rail: "border-l-chart-3",
  },
  {
    dot: "bg-chart-5",
    soft: "bg-chart-5/10 hover:bg-chart-5/20",
    text: "text-chart-5",
    solid: "bg-chart-5 text-white",
    rail: "border-l-chart-5",
  },
  {
    dot: "bg-chart-2",
    soft: "bg-chart-2/10 hover:bg-chart-2/20",
    text: "text-chart-2",
    solid: "bg-chart-2 text-white",
    rail: "border-l-chart-2",
  },
];

/** Au-delà de cinq agendas les teintes se répètent — mieux vaut deux agendas
 * de même couleur qu'une sixième teinte inventée hors du thème. */
export function paletteAt(index: number): CalendarStyle {
  return CALENDAR_PALETTE[index % CALENDAR_PALETTE.length];
}

export const VIEWS: Array<{ value: CalendarView; label: string }> = [
  { value: "mois", label: "Mois" },
  { value: "semaine", label: "Semaine" },
  { value: "agenda", label: "Agenda" },
];

/**
 * Le nom d'une personne, quoi qu'il manque.
 *
 * Google ne remplit `displayName` que si le contact porte un nom dans le compte.
 * Pour tout le reste — un client externe invité à une réunion — il n'y a que
 * l'adresse, et une case vide serait pire que l'adresse.
 */
export function personName(person: Attendee | Person | undefined): string {
  if (!person) return "—";
  return person.displayName || person.email || "—";
}

/** Un événement peut n'avoir pas de titre dans Google. */
export function eventTitle(summary: string | undefined): string {
  return summary?.trim() || "Sans titre";
}

export const RESPONSE: Record<ResponseStatus, { label: string; tone: string }> = {
  accepted: { label: "A accepté", tone: "text-success" },
  declined: { label: "A décliné", tone: "text-danger" },
  tentative: { label: "Peut-être", tone: "text-warning" },
  needsAction: { label: "Sans réponse", tone: "text-muted-foreground" },
};

/** Lundi en tête : la semaine française, pas celle du calendrier américain. */
export const WEEKDAYS = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."];

/** Plage horaire peinte par la vue semaine. Un BET ne travaille pas la nuit. */
export const DAY_START_HOUR = 7;
export const DAY_END_HOUR = 20;

const monthYear = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
const dayLong = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const dayShort = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });

export function formatMonthYear(date: Date): string {
  return monthYear.format(date);
}

export function formatDayLong(date: Date): string {
  return dayLong.format(date);
}

export function formatDayShort(date: Date): string {
  return dayShort.format(date);
}

/**
 * L'heure à la française : « 9h », « 14h30 ».
 *
 * Ce n'est pas une coquetterie de typographe, c'est de la place. Sur une case
 * de calendrier mensuel large de cent trente pixels, « 09:00 » prend cinq
 * caractères là où « 9h » en prend deux — et ce sont exactement ceux qui
 * manquaient au titre pour ne plus être coupé au troisième mot. C'est en outre
 * ce qu'écrit n'importe quel agenda de bureau en France.
 */
export function formatTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return minutes === 0 ? `${hours}h` : `${hours}h${String(minutes).padStart(2, "0")}`;
}

/** « 9h – 10h30 » ; « Toute la journée » pour un événement sans heure. */
export function formatRange(start: Date, end: Date, isAllDay: boolean): string {
  if (isAllDay) return "Toute la journée";
  return `${formatTime(start)} – ${formatTime(end)}`;
}

export function formatDuration(start: Date, end: Date): string {
  const minutes = Math.round((end.getTime() - start.getTime()) / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, "0")}`;
}

const RRULE_DAYS: Record<string, string> = {
  MO: "lundi",
  TU: "mardi",
  WE: "mercredi",
  TH: "jeudi",
  FR: "vendredi",
  SA: "samedi",
  SU: "dimanche",
};

/** Traduit la RRULE en français plutôt que de l'afficher brute. */
export function describeRecurrence(rules: string[] | undefined): string | null {
  const rule = rules?.[0];
  if (!rule) return null;

  const day = /BYDAY=(\d?)([A-Z]{2})/.exec(rule);
  const label = day ? RRULE_DAYS[day[2]] : null;

  if (rule.includes("FREQ=WEEKLY")) {
    return label ? `Toutes les semaines, le ${label}` : "Toutes les semaines";
  }
  if (rule.includes("FREQ=MONTHLY")) {
    const nth = day?.[1];
    if (label && nth) {
      const ordinal = nth === "1" ? "premier" : `${nth}ᵉ`;
      return `Tous les mois, le ${ordinal} ${label}`;
    }
    return "Tous les mois";
  }
  return "Événement récurrent";
}
