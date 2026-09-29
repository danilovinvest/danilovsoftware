"use client";

import { askConfirm } from "@/shared/ui/confirm";
import * as api from "../lib/api";
import type { Project } from "../lib/types";
import { useAction } from "./use-customers";

/**
 * Archiver l'affaire (issue 115) : elle sort de Chantiers, d'Études, du
 * marketing et des dossiers à attribuer, et reste sur la fiche, repliée sous
 * « Affaires archivées ». Rien d'autre ne bouge, d'où une seule confirmation —
 * la suppression, elle, en demande deux.
 */
export function useArchiveProject(
  project: Project,
  onChanged: () => void,
): { archiver: () => Promise<void>; error: string | null } {
  const archive = useAction(() => api.setProjectArchived(project.id, true), { inline: true });

  async function archiver() {
    const ok = await askConfirm({
      title: `Archiver l'affaire « ${project.label} »`,
      description:
        "Elle sort des chantiers, des études, du marketing et des dossiers à attribuer. " +
        "Ses devis, factures et preuves restent, et elle se désarchive d'un clic depuis « Affaires archivées ».",
      confirmLabel: "Archiver",
      destructive: false,
    });
    if (!ok) return;
    if ((await archive.run()) !== null) onChanged();
  }

  return { archiver, error: archive.error };
}
