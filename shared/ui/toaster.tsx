"use client";

import type { CSSProperties } from "react";
import { Toaster as Sonner, toast } from "sonner";

/*
  Les couleurs viennent du thème du CRM, jamais de celles de sonner.

  sonner choisit ses teintes d'après son propre `theme`, qui ne connaît ni nos
  palettes ni la classe `.dark` posée par les préférences. Ses variables sont
  donc rebranchées sur la couche sémantique : un toast suit le thème comme le
  reste de l'écran, sans qu'on lui dise lequel.
*/
const THEME = {
  "--normal-bg": "var(--popover)",
  "--normal-text": "var(--popover-foreground)",
  "--normal-border": "var(--border)",
  "--success-bg": "var(--success-soft)",
  "--success-text": "var(--success)",
  "--success-border": "var(--border)",
  "--error-bg": "var(--danger-soft)",
  "--error-text": "var(--danger)",
  "--error-border": "var(--border)",
} as CSSProperties;

/** Le point d'affichage des toasts. Monté une fois, à la racine. */
export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      richColors
      closeButton
      style={THEME}
      toastOptions={{ className: "text-sm" }}
    />
  );
}

/**
 * Une écriture a échoué.
 *
 * Le message reste plus longtemps qu'un succès : on le lit, on ne fait pas que
 * le voir passer. `retry` ajoute « Réessayer », qui rejoue le même geste.
 */
export function notifyError(message: string, retry?: () => void) {
  toast.error(message, {
    duration: 8000,
    action: retry ? { label: "Réessayer", onClick: () => retry() } : undefined,
  });
}

/**
 * Une écriture a réussi, et rien d'autre à l'écran ne le dit.
 *
 * `action` propose la suite logique du geste — « Créer l'événement » après une
 * date de chantier — et laisse le toast plus longtemps, le temps de la lire.
 */
export function notifySuccess(message: string, action?: { label: string; onClick: () => void }) {
  toast.success(message, {
    duration: action ? 8000 : 3000,
    action: action ? { label: action.label, onClick: () => action.onClick() } : undefined,
  });
}
