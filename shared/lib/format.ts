const currency = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 2,
});

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const dateTimeFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * L'API transporte les montants en chaînes ("8050.00") pour ne rien perdre à la
 * traversée de JSON ; on ne les convertit en nombre qu'à l'affichage.
 */
export function formatAmount(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return value;
  return currency.format(parsed);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return dateFormat.format(parsed);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return dateTimeFormat.format(parsed);
}

/** Affiche "il y a 3 jours" pour les dates récentes, la date sinon. */
export function formatRelative(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  const diffDays = Math.round((parsed.getTime() - Date.now()) / 86_400_000);
  if (Math.abs(diffDays) > 30) return dateFormat.format(parsed);

  const relative = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });
  return relative.format(diffDays, "day");
}

/**
 * « il y a 40 s », « il y a 3 min », « il y a 2 h ».
 *
 * `formatRelative` s'arrête au jour, ce qui suffit à une date de création mais
 * pas à une synchronisation qui tourne toutes les cinq minutes : elle
 * afficherait « aujourd'hui » pendant vingt-quatre heures.
 *
 * L'instant de référence est passé en argument plutôt que lu de l'horloge :
 * une fonction appelée au rendu doit rendre la même chose pour les mêmes
 * entrées, et c'est l'appelant qui décide à quel rythme le « maintenant »
 * avance.
 */
export function formatAgo(value: string | null | undefined, now: number): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  const seconds = Math.max(0, Math.round((now - parsed.getTime()) / 1000));
  if (seconds < 10) return "à l'instant";
  if (seconds < 60) return `il y a ${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return formatRelative(value);
}

/** Durée d'une opération : « 1,2 s », « 340 ms », « 2 min 05 ». */
export function formatElapsed(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1).replace(".", ",")} s`;
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.round((ms % 60_000) / 1000);
  return `${minutes} min ${String(seconds).padStart(2, "0")}`;
}

/** Regroupe un numéro français par paires : 0662464867 → 06 62 46 48 67. */
export function formatPhone(value: string): string {
  const digits = value.replace(/[^\d+]/g, "");
  if (digits.length === 10 && digits.startsWith("0")) {
    return digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  }
  return value;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Échéance exprimée en temps restant, avec la tonalité qui va avec.
 *
 * « dans 3 jours » se lit plus vite que « 05/09/2026 » quand on trie une pile
 * de tâches. Le calcul se fait par jours calendaires, pas par heures écoulées :
 * une échéance ce soir doit dire « aujourd'hui », pas « dans 6 heures ».
 */
export type DueTone = "overdue" | "today" | "soon" | "later" | "none";

export type DueInfo = {
  label: string;
  tone: DueTone;
  /** Date complète, pour l'infobulle. */
  title: string;
};

const relative = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

export function describeDue(iso: string | null | undefined, done = false): DueInfo {
  if (!iso) return { label: "Sans échéance", tone: "none", title: "" };

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { label: "Sans échéance", tone: "none", title: "" };
  }

  const title = formatDateTime(iso);

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const days = Math.round(
    (startOfDay(date).getTime() - startOfDay(new Date()).getTime()) / 86_400_000,
  );

  // Une tâche close n'est plus « en retard » : elle porte sa date, sans alarme.
  if (done) return { label: formatDate(iso), tone: "none", title };

  if (days < 0) {
    const label = days === -1 ? "hier" : relative.format(days, "day");
    return { label: `En retard — ${label}`, tone: "overdue", title };
  }
  if (days === 0) return { label: "Aujourd'hui", tone: "today", title };
  if (days === 1) return { label: "Demain", tone: "soon", title };
  if (days <= 7) return { label: relative.format(days, "day"), tone: "soon", title };
  if (days <= 30) {
    return { label: relative.format(Math.round(days / 7), "week"), tone: "later", title };
  }
  return { label: formatDate(iso), tone: "later", title };
}

/**
 * Montants arrondis à l'euro.
 *
 * Le reste du CRM affiche les centimes — un devis se lit au centime près. Un
 * tableau de bord additionne des dizaines de lignes : « 148 350 € » se compare
 * d'un coup d'œil, « 148 350,00 € » se déchiffre.
 */
const euroFormat = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function euros(value: number): string {
  return euroFormat.format(value);
}

/** Forme courte pour les axes et les pastilles : 42 000 € → 42 k€. */
export function eurosShort(value: number): string {
  if (value === 0) return "—";
  if (Math.abs(value) < 1000) return `${Math.round(value)} €`;
  const thousands = value / 1000;
  const digits = Math.abs(thousands) < 10 ? 1 : 0;
  return `${thousands.toFixed(digits).replace(".", ",")} k€`;
}

/** Phrase complète : « hier » ne se préfixe pas de « il y a ». */
export function agoLabel(days: number | null): string {
  if (days === null) return "—";
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 31) return `il y a ${days} j`;
  return `il y a ${Math.round(days / 30)} mois`;
}

/** Forme courte pour les colonnes de tableau, sans « il y a ». */
export function sinceDays(days: number | null): string {
  if (days === null) return "—";
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 31) return `${days} j`;
  const months = Math.round(days / 30);
  return `${months} mois`;
}

/** Accord au pluriel — « 1 relances » saute aux yeux dans un tableau de bord. */
export function plural(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count > 1 ? plural : singular}`;
}

/**
 * Aujourd'hui, au format `AAAA-MM-JJ`, dans le fuseau du poste.
 *
 * `toISOString()` rend la date en UTC : passé 22 h à Nice l'été, il annonce
 * demain, et un chantier terminé le 3 serait daté du 4. Les trois champs
 * locaux disent le jour qu'affiche l'horloge de celui qui saisit.
 */
export function todayLocal(): string {
  const now = new Date();
  const mois = String(now.getMonth() + 1).padStart(2, "0");
  const jour = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${mois}-${jour}`;
}
