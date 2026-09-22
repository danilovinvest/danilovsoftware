"use client";

import { useEffect, useRef } from "react";

/**
 * Les raccourcis de la messagerie : une touche, un geste.
 *
 * Trier trente courriels à la souris, c'est trente allers-retours entre la
 * liste et un bouton ; au clavier, c'est `e`, `e`, `e`. Les touches sont celles
 * de Gmail et de Superhuman — `j`/`k`, `e`, `u`, `/`, `?` — parce que c'est là
 * que la main les connaît déjà.
 *
 * **Jamais pendant une saisie.** Une touche tapée dans la recherche, dans un
 * champ de tâche ou dans une boîte de dialogue appartient au texte : la
 * détourner ferait archiver une conversation en écrivant « e ». Les
 * combinaisons (⌘, Ctrl, Alt) restent aussi au navigateur et à ⌘K.
 */
export type MailKeyHandlers = Partial<Record<string, () => void>>;

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

// Une boîte de dialogue ouverte garde le clavier pour elle.
function dialogOpen(): boolean {
  return document.querySelector('[role="dialog"], [role="alertdialog"]') !== null;
}

export function useMailKeyboard(handlers: MailKeyHandlers) {
  // Lus au moment de la frappe : un littéral d'objet change à chaque rendu.
  const current = useRef(handlers);
  useEffect(() => {
    current.current = handlers;
  });

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTyping(event.target) || dialogOpen()) return;
      // Entrée sur un bouton ou un lien lui appartient : c'est ainsi qu'on
      // l'active au clavier, et l'intercepter ouvrirait autre chose.
      if (event.key === "Enter" && event.target instanceof Element && event.target.closest("button, a")) {
        return;
      }
      const handler = current.current[event.key];
      if (!handler) return;
      event.preventDefault();
      handler();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
}

/** La liste affichée par l'aide (`?`), dans l'ordre où on s'en sert. */
export const MAIL_SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ["j", "k"], label: "Conversation suivante, précédente" },
  { keys: ["Entrée", "o"], label: "Ouvrir la conversation" },
  { keys: ["e"], label: "Marquer traitée — ou rouvrir" },
  { keys: ["u"], label: "Revenir à la liste" },
  { keys: ["r"], label: "Répondre dans Gmail" },
  { keys: ["t"], label: "Créer une tâche" },
  { keys: ["/"], label: "Chercher" },
  { keys: ["?"], label: "Afficher cette aide" },
];
