"use client";

import { useRouter } from "next/navigation";
import * as api from "../lib/api";
import { stepWrite, type ActionKey, type CycleStep } from "../lib/cycle";
import type { Jalons, StepMarks } from "../lib/jalons";
import {
  DIALOG_ACTIONS,
  STAMP_ACTIONS,
  isDialogAction,
  isStampAction,
  type BlockDialog,
} from "../lib/project-actions";
import type { Project } from "../lib/types";
import { useAction } from "./use-customers";

type Patch = Partial<Jalons & StepMarks>;

/**
 * Les gestes d'une affaire : cocher un cran, commander, et les boutons de
 * « à faire maintenant ».
 *
 * Ils vivaient dans le composant de l'affaire, qui dépassait quatre cents
 * lignes. Ils n'y rendent rien : ils disent **où** chaque geste écrit, et
 * `ProjectBlock` n'a plus qu'à les brancher.
 */
export function useProjectGestures({
  project,
  jalons,
  onOverride,
  onAddQuote,
  openDialog,
  revealAfterSignature,
  invoiceDeposit,
  onChanged,
}: {
  project: Project;
  jalons: Jalons;
  onOverride: (patch: Patch) => Promise<boolean>;
  onAddQuote: () => void;
  openDialog: (dialog: BlockDialog) => void;
  /** Déplie l'affaire et amène l'après-signature à l'écran. */
  revealAfterSignature: () => void;
  /** Date la facture d'acompte sur le devis porteur. */
  invoiceDeposit: () => Promise<boolean>;
  onChanged: () => void;
}) {
  const router = useRouter();
  const reopen = useAction(() =>
    api.setProjectStage(project.id, { stage: project.stage, outcome: null, outcome_note: "" }),
  );

  /*
    Dater un cran de la frise.

    Chaque cran écrit là où le fait vit déjà — l'affaire ou les jalons — et
    `stepWrite` est le seul endroit qui le dit. Un cran n'attend jamais celui
    d'avant. L'acompte et le solde n'arrivent pas ici : le cran ouvre la boîte
    des règlements, qui écrit sur le devis.
  */
  function marquerCran(step: CycleStep, at: string | null): void {
    const write = stepWrite(step);
    switch (write.target) {
      case "mark":
      case "jalon":
      case "materials":
        // `poserJalon` peint avant d'écrire : le panneau peut se fermer sur un
        // cran déjà vert.
        void onOverride({ [write.field]: at } as Patch);
        return;
      case "worksite_date":
        void onOverride({ worksite_date: at });
        return;
      case "quote":
        openDialog({ kind: "settlement", reglement: write.field === "deposit" ? "acompte" : "solde" });
        return;
    }
  }

  /**
   * La commande de matériaux : ce qui a été commandé, et quand. `null` retire
   * les deux. La date déjà posée est **conservée** : compléter la liste trois
   * jours plus tard ne doit pas faire croire qu'on a commandé aujourd'hui.
   */
  function commanderMateriaux(list: string[] | null): Promise<boolean> {
    if (list === null) return onOverride({ materials: [], materials_ordered_at: null });
    return onOverride({
      materials: list,
      materials_ordered_at: jalons.materials_ordered_at ?? new Date().toISOString(),
    });
  }

  async function act(key: ActionKey): Promise<void> {
    if (isStampAction(key)) {
      void onOverride({ [STAMP_ACTIONS[key]]: new Date().toISOString() });
      return;
    }
    if (isDialogAction(key)) {
      openDialog(DIALOG_ACTIONS[key]);
      return;
    }
    switch (key) {
      case "open_calendar":
        router.push("/calendar");
        return;
      case "new_quote":
        onAddQuote();
        return;
      case "reopen":
      case "resume":
        if (await reopen.run()) onChanged();
        return;
      case "deposit_invoiced":
        await invoiceDeposit();
        return;
      case "book_date":
        // Réserver une date demande de choisir : on ouvre la section où le
        // sélecteur se trouve, et on l'amène à l'écran.
        revealAfterSignature();
        return;
      case "open_worksite":
        // Le chantier **est** cette affaire : on emmène son identifiant.
        router.push(`/chantiers?affaire=${project.id}`);
        return;
      default: {
        // Une action ajoutée à `ActionKey` sans table ni branche ferait un
        // bouton muet : le typage refuse de compiler plutôt.
        const unhandled: never = key;
        return unhandled;
      }
    }
  }

  return { marquerCran, commanderMateriaux, act, reopenPending: reopen.pending };
}
