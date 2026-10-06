import { deliveredAt, missionOf } from "@/modules/customers";
import type { Metier, Worksite } from "./types";

/**
 * Les délais des dossiers, pour l'agenda.
 *
 * `promised_at` engage l'entreprise, `internal_deadline_at` est la marge
 * qu'elle se donne (migration 50). Ils se saisissaient sur l'affaire et ne se
 * voyaient dans aucun planning : on découvrait une échéance en rouvrant la
 * fiche. L'agenda les montre désormais sur la période affichée, à côté des
 * rendez-vous, sans en faire de faux événements — un délai ne se déplace pas
 * d'un glissement, il se change sur l'affaire.
 *
 * Un dossier rendu ne dit plus son délai (la règle de `deadlineOf`) : une étude
 * dont la mission est livrée, un chantier marqué réalisé.
 *
 * Module **pur**.
 */

export interface DossierDeadline {
  worksiteId: string;
  customerId: string;
  customerName: string;
  label: string;
  reference: string;
  metier: Metier;
  /** AAAA-MM-JJ. */
  day: string;
  kind: "promis" | "interne";
  /** Le jour est passé et rien n'est rendu. */
  late: boolean;
}

/**
 * Le métier d'un dossier : la société choisie sur l'affaire, à défaut celle de
 * ses devis — un devis de GROUPE fait un chantier, même après une étude.
 */
export function worksiteMetier(w: Worksite): Metier {
  if (w.issuer === "ompt-structure") return "etudes";
  if (w.issuer === "ompt-groupe") return "travaux";
  if (w.quotes.some((q) => q.issuer === "ompt-groupe")) return "travaux";
  if (w.quotes.some((q) => q.issuer === "ompt-structure")) return "etudes";
  return "travaux";
}

function delivered(w: Worksite, metier: Metier): boolean {
  if (w.stage === "realise") return true;
  return metier === "etudes" && deliveredAt(w, missionOf(w, w.quotes)) !== null;
}

/**
 * Les délais compris entre `from` (inclus) et `to` (exclu), du plus proche au
 * plus lointain, les retards d'abord. `today` est AAAA-MM-JJ, dans le fuseau du
 * poste : un délai est un jour, pas un instant.
 *
 * Quand la période affichée contient aujourd'hui, un délai **dépassé avant
 * elle** y figure aussi : un retard ne disparaît pas parce qu'on a changé de
 * semaine, et c'est le premier à rattraper.
 */
export function deadlinesBetween(
  worksites: Worksite[],
  from: string,
  to: string,
  today: string,
): DossierDeadline[] {
  const out: DossierDeadline[] = [];
  for (const w of worksites) {
    if (w.outcome !== "") continue;
    const metier = worksiteMetier(w);
    if (delivered(w, metier)) continue;
    const days: Array<[string | null, DossierDeadline["kind"]]> = [
      [w.promised_at, "promis"],
      [w.internal_deadline_at, "interne"],
    ];
    for (const [raw, kind] of days) {
      const day = raw?.slice(0, 10) ?? null;
      if (day === null || day >= to) continue;
      const carriedLate = day < from && day < today && from <= today && today < to;
      if (day < from && !carriedLate) continue;
      out.push({
        worksiteId: w.id,
        customerId: w.customer_id,
        customerName: w.customer_name,
        label: w.label,
        reference: w.reference,
        metier,
        day,
        kind,
        late: day < today,
      });
    }
  }
  return out.sort(
    (a, b) => Number(b.late) - Number(a.late) || a.day.localeCompare(b.day) || a.kind.localeCompare(b.kind),
  );
}
