"use client";

import * as api from "../lib/api";
import { describeBatch } from "../lib/proofs";
import { useAction } from "./use-customers";
import type { CycleStep } from "../lib/cycle";
import type { ProofBatch, StepProofInput } from "../lib/types";

/**
 * Joindre une preuve à un cran de la frise, ou la retirer.
 *
 * Trois chemins pour une preuve, une seule réponse : un fichier part dans
 * OneDrive, un courriel y copie ses pièces jointes, une note ou un lien reste
 * en base. L'écran lit la même forme dans les trois cas.
 *
 * Les deux gestes rendent la réussite : le formulaire du cran ne se ferme que
 * sur un succès.
 */
export function useStepProofActions(projectId: string, onChanged: () => void) {
  const ajouter = useAction(
    async (step: CycleStep, input: StepProofInput, file: File | null): Promise<ProofBatch> => {
      if (file) return api.uploadStepProof(projectId, step, input, file);
      if (input.mail_message_id) return api.createMailStepProof(projectId, { step, ...input });
      const proof = await api.createStepProof(projectId, { step, ...input });
      return { proofs: [proof], folder_path: "", folder_url: "", folder_created: false, skipped: [], warning: "" };
    },
    { inline: true },
  );
  const retirer = useAction((id: string) => api.deleteStepProof(id), { inline: true });

  return {
    add: async (step: CycleStep, input: StepProofInput, file: File | null) => {
      const batch = await ajouter.run(step, input, file);
      if (batch === null) return { ok: false, message: "" };
      onChanged();
      return { ok: true, message: describeBatch(batch) };
    },
    remove: async (id: string) => {
      // 204 sans corps rend `undefined` : seul `null` dit l'échec.
      const ok = (await retirer.run(id)) !== null;
      if (ok) onChanged();
      return ok;
    },
    error: ajouter.error ?? retirer.error,
  };
}
