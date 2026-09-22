import type { ThreadMessage, ThreadSummary } from "./types";

/**
 * Les petites phrases de la messagerie. Module pur : l'instant est passé en
 * argument, rien n'y lit l'horloge.
 */

/**
 * La date d'une ligne, au plus court qui reste juste : l'heure pour
 * aujourd'hui (« 14h30 », à la française), le jour pour cette année
 * (« 12 sept. »), la date complète au-delà.
 */
export function listDate(iso: string, now: number): string {
  const date = new Date(iso);
  const today = new Date(now);
  if (date.toDateString() === today.toDateString()) {
    const minutes = date.getMinutes();
    return `${date.getHours()}h${minutes === 0 ? "" : String(minutes).padStart(2, "0")}`;
  }
  if (date.getFullYear() === today.getFullYear()) {
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  }
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

/** « Jean Dupont, Cabinet Arche +2 » — trois noms au plus, la ligne est étroite. */
export function correspondentsLabel(thread: Pick<ThreadSummary, "correspondents" | "last_outgoing">): string {
  const names = thread.correspondents;
  if (names.length === 0) return "(correspondant inconnu)";
  const shown = names.slice(0, 3).join(", ");
  const rest = names.length - 3;
  // Une conversation que nous avons seuls écrite nomme ses destinataires.
  return rest > 0 ? `${shown} +${rest}` : shown;
}

/** Qui a écrit ce message, tel qu'on le dit. Nos envois portent le nom de la boîte. */
export function authorLabel(message: Pick<ThreadMessage, "outgoing" | "from_name" | "from_email">): string {
  if (message.outgoing) return "Nous";
  return message.from_name || message.from_email || "(expéditeur inconnu)";
}

/**
 * Les destinataires d'un message : ses correspondants moins son expéditeur.
 * `participants` réunit À et Cc — la copie ne les distingue pas.
 */
export function recipientsOf(message: Pick<ThreadMessage, "participants" | "from_email">): string[] {
  const from = message.from_email.toLowerCase();
  return message.participants.filter((address) => address.toLowerCase() !== from);
}

/**
 * La personne à suivre pour « tout de ce contact » : l'expéditeur du dernier
 * message reçu, ou le premier destinataire quand nous avons seuls écrit.
 */
export function mainContact(messages: ThreadMessage[], mailbox: string): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message.outgoing && message.from_email) return message.from_email;
  }
  const last = messages[messages.length - 1];
  const others = last ? recipientsOf(last).filter((a) => a.toLowerCase() !== mailbox.toLowerCase()) : [];
  return others[0] ?? "";
}
