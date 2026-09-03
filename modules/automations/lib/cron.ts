/**
 * Lecture et écriture d'expressions cron, pour l'éditeur de rythme.
 *
 * Cinq champs : minute, heure, jour du mois, mois, jour de la semaine. L'écran
 * n'en propose que trois formes — chaque jour, certains jours, chaque mois —
 * parce que ce sont celles qu'on veut vraiment ; tout le reste se saisit à la
 * main, et l'aperçu du serveur dit si c'est juste.
 *
 * **Rien ici ne valide.** La validation appartient au serveur, qui utilise le
 * même analyseur que la boucle de déclenchement. Une seconde implémentation en
 * TypeScript divergerait au premier cas tordu, et l'écran annoncerait une heure
 * que le serveur ne tiendrait pas.
 */

export type Rhythm = "quotidien" | "jours" | "mensuel" | "expression";

export type Schedule = {
  rhythm: Rhythm;
  /** « 18:00 », comme un champ d'heure. */
  time: string;
  /** Jours retenus, 0 = dimanche, pour le rythme « certains jours ». */
  weekdays: number[];
  /** Jour du mois, pour le rythme « chaque mois ». */
  monthday: number;
};

export const WEEKDAY_LABELS = ["D", "L", "M", "M", "J", "V", "S"];
export const WEEKDAY_NAMES = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
];

/** Ordre français : la semaine commence le lundi, dimanche ferme. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const DEFAULT: Schedule = {
  rhythm: "quotidien",
  time: "18:00",
  weekdays: [1, 2, 3, 4, 5],
  monthday: 1,
};

/**
 * Reconnaît une expression, quand elle correspond à l'une des trois formes.
 *
 * Tout le reste rend le rythme « expression » : l'éditeur visuel ne prétend pas
 * savoir représenter « toutes les quinze minutes en semaine », et l'afficher
 * approximativement serait mentir sur ce qui est enregistré.
 */
export function readCron(expression: string): Schedule {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return { ...DEFAULT, rhythm: "expression" };

  const [minute, hour, dom, month, dow] = parts;
  const simple = /^\d{1,2}$/;
  if (!simple.test(minute) || !simple.test(hour) || month !== "*") {
    return { ...DEFAULT, rhythm: "expression" };
  }

  const time = `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;

  if (dom === "*" && dow === "*") {
    return { ...DEFAULT, rhythm: "quotidien", time };
  }
  if (dom === "*") {
    const days = readWeekdays(dow);
    return days ? { ...DEFAULT, rhythm: "jours", time, weekdays: days } : { ...DEFAULT, rhythm: "expression" };
  }
  if (dow === "*" && simple.test(dom)) {
    return { ...DEFAULT, rhythm: "mensuel", time, monthday: Number(dom) };
  }
  return { ...DEFAULT, rhythm: "expression" };
}

/** « 1-5 », « 1,3,5 » ou « 2 » — les formes que l'éditeur sait rendre. */
function readWeekdays(field: string): number[] | null {
  const days = new Set<number>();
  for (const chunk of field.split(",")) {
    const range = /^(\d)-(\d)$/.exec(chunk);
    if (range) {
      const [from, to] = [Number(range[1]), Number(range[2])];
      if (from > to) return null;
      for (let day = from; day <= to; day += 1) days.add(day);
      continue;
    }
    if (!/^\d$/.test(chunk)) return null;
    days.add(Number(chunk));
  }
  return days.size > 0 ? [...days].sort() : null;
}

export function writeCron(schedule: Schedule, previous: string): string {
  if (schedule.rhythm === "expression") return previous;

  const [hour, minute] = schedule.time.split(":").map((part) => Number(part));
  const head = `${minute} ${hour}`;

  if (schedule.rhythm === "quotidien") return `${head} * * *`;
  if (schedule.rhythm === "mensuel") return `${head} ${schedule.monthday} * *`;

  // Sans jour coché l'expression ne vaudrait rien : on retombe sur tous les
  // jours plutôt que d'écrire un champ vide que le serveur refuserait.
  const days = schedule.weekdays.length > 0 ? [...schedule.weekdays].sort().join(",") : "*";
  return `${head} * * ${days}`;
}

/**
 * Traduit une expression en français, quand elle s'y prête.
 *
 * Partiel par choix : il couvre ce que l'éditeur produit et les variantes
 * proches, et rend l'expression telle quelle au-delà. Une traduction
 * approximative serait pire que pas de traduction du tout — c'est précisément
 * sur les expressions tordues qu'on a besoin de faire confiance à l'aperçu.
 */
export function describeCron(expression: string): string {
  const schedule = readCron(expression);
  if (schedule.rhythm === "expression") return expression;

  const [hour, minute] = schedule.time.split(":");
  const time = minute === "00" ? `${Number(hour)}h` : `${Number(hour)}h${minute}`;

  if (schedule.rhythm === "quotidien") return `tous les jours à ${time}`;
  if (schedule.rhythm === "mensuel") {
    const day = schedule.monthday === 1 ? "1er" : `${schedule.monthday}`;
    return `le ${day} de chaque mois à ${time}`;
  }

  const days = schedule.weekdays;
  if (days.length === 7) return `tous les jours à ${time}`;
  if (isRange(days, [1, 2, 3, 4, 5])) return `du lundi au vendredi à ${time}`;
  if (isRange(days, [0, 6])) return `le week-end à ${time}`;
  if (days.length === 1) return `le ${WEEKDAY_NAMES[days[0]]} à ${time}`;

  const names = WEEK_ORDER.filter((day) => days.includes(day)).map((day) => WEEKDAY_NAMES[day]);
  const last = names.pop();
  return `${names.join(", ")} et ${last} à ${time}`;
}

function isRange(days: number[], expected: number[]): boolean {
  return days.length === expected.length && expected.every((day) => days.includes(day));
}
