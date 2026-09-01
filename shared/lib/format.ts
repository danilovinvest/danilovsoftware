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
