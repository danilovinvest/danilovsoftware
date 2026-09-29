"use client";

import { useState, type ReactNode } from "react";
import { PaperclipIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { settlementTriggerLabel, type ReglementKind } from "./deposit-field";
import { MaterialsEditor } from "./materials-field";
import { StepDateEditor } from "./step-date-editor";
import { StepProofs } from "./step-proofs";
import type { AutoProof } from "../lib/proofs";
import type { StepProof, StepProofInput } from "../lib/types";
import { CYCLE_LABEL, stepWrite, type CyclePoint, type CycleStep } from "../lib/cycle";

/*
  Le panneau d'un cran de la frise : ce qu'il écrit, et l'éditeur qui l'écrit.

  Il vivait dans `project-cycle.tsx`, qui dessine la frise ; il n'en partage
  que le cran qu'il ouvre, reçu en enfant. La frise se lit dans quatre écrans
  et ne se coche que dans un : ce qui la rend cochable vit donc à part.
*/

/**
 * De quoi rendre un cran cliquable.
 *
 * Un seul accessoire plutôt que cinq : la frise se lit dans quatre écrans et
 * n'est modifiable que dans un — la fiche, où l'affaire est ouverte. Ailleurs,
 * `edit` est absent et la frise reste ce qu'elle était.
 */
export type CycleEdit = {
  /** La date que le clic retirerait, ou rien — voir `stepMarkedAt`. */
  markedAt: (step: CycleStep) => string | null;
  /**
   * Écrit ou retire la date de ce cran. `null` retire.
   *
   * Seulement pour ce qui se date — une marque, un jalon, la date de chantier :
   * l'écriture peint avant de partir, et le panneau se ferme tout de suite.
   * L'acompte et le solde passent par `onSettle`.
   */
  onMark: (step: CycleStep, at: string | null) => void;
  /** L'affaire porte-t-elle un devis ? L'acompte et le solde y vivent. */
  hasQuote: boolean;
  /** Ouvre la création d'un devis, quand il en manque un. */
  onAddQuote: () => void;
  /**
   * Ce qui a déjà été commandé, pour le cran des matériaux.
   *
   * Il porte une liste et pas seulement une date : c'est le seul cran dont le
   * panneau fait saisir autre chose qu'un instant.
   */
  materials: string[];
  /**
   * Enregistre la commande et sa date. `null` retire les deux.
   *
   * Rend la réussite de l'écriture : le panneau ne se ferme que sur un succès,
   * faute de quoi un brouillon de plusieurs lignes disparaîtrait sans un mot.
   */
  onMaterials: (list: string[] | null) => boolean | Promise<boolean>;
  /**
   * Ouvre la boîte des règlements de l'affaire — acompte ou solde.
   *
   * Le cran ne saisit plus le règlement dans son panneau : il ouvre la même
   * boîte que « à faire maintenant », la ligne du devis et l'après-signature,
   * sous le même titre. Montant, jour et virements s'y disent une fois.
   */
  onSettle: (kind: ReglementKind) => void;
  /**
   * Ce qui se passe pendant la négociation, et le moyen de l'écrire.
   *
   * Le seul cran qui porte autre chose qu'une date, et c'est voulu : c'est le
   * seul où l'on attende, et où « pourquoi ça bloque » décide de la relance.
   */
  negotiationNote: string;
  onNote: (note: string) => boolean | Promise<boolean>;
  /**
   * Les preuves d'un cran : celles qu'on a jointes, et celles que l'affaire
   * porte déjà (le PDF d'un devis, une facture, un rendez-vous consigné).
   */
  proofs: (step: CycleStep) => StepProof[];
  autoProofs: (step: CycleStep) => AutoProof[];
  customerId: string;
  /** Le dossier OneDrive de l'affaire, vide quand aucun n'est relié. */
  drivePath: string;
  /** Rendent la réussite : le formulaire ne se ferme que sur un succès. */
  onAddProof: (
    step: CycleStep,
    input: StepProofInput,
    file: File | null,
  ) => Promise<{ ok: boolean; message: string }>;
  onRemoveProof: (id: string) => Promise<boolean>;
  pending?: boolean;
};

/**
 * Un cran qu'on peut cocher, et le panneau qui dit ce que ça écrit.
 *
 * Le panneau annonce trois choses avant tout clic : où en est le cran, **où va
 * l'écriture**, et ce qui le franchirait tout seul. C'est ce qui empêche la
 * frise de devenir une seconde vérité : cocher « Date de chantier » ici et
 * ouvrir l'écran Chantiers montre la même date, parce que c'est la même
 * colonne.
 *
 * Il porte le nom entier du cran (`CYCLE_LABEL.label`), celui de la ligne de
 * l'après-signature qui écrit le même fait, et ouvre **les mêmes éditeurs** :
 * la date (`StepDateEditor`), les matériaux (`MaterialsEditor`), la boîte des
 * règlements. Les preuves et la note de négociation n'appartiennent qu'à lui.
 */
export function StepDot({
  point,
  edit,
  children,
}: {
  point: CyclePoint;
  edit: CycleEdit;
  /** Le cran tel que la frise le dessine : point, libellé, date. */
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const nbPreuves = edit.proofs(point.step).length + edit.autoProofs(point.step).length;
  const entry = CYCLE_LABEL[point.step];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          /*
            Le cran entier, libellé compris.

            `select-none` parce qu'un clic sur un mot sélectionnait le mot au
            lieu d'ouvrir le panneau — c'est ce qu'on a vu à l'écran, et c'est
            ce qui donnait l'impression qu'on ne pouvait pas sauter d'étape.
          */
          className="group/cran focus-visible:ring-ring flex min-w-0 cursor-pointer flex-col items-start rounded-md text-left select-none focus-visible:ring-2 focus-visible:outline-none"
          aria-label={`${entry.label} — ${point.detail}`}
          data-demo={`cran-${point.step}`}
        >
          {children}
          {nbPreuves > 0 && (
            <span className="text-muted-foreground mt-0.5 inline-flex items-center gap-0.5 text-[10px]">
              <PaperclipIcon className="size-2.5" />
              {nbPreuves}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="max-h-[80vh] w-80 overflow-y-auto sm:w-96" align="start">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-medium">{entry.label}</p>
            <p className="text-muted-foreground text-xs">{entry.hint}</p>
          </div>

          <p className="text-xs">{point.detail}</p>

          <StepWriter point={point} edit={edit} onClose={() => setOpen(false)} />

          {point.step === "negociation" && (
            <NoteNegociation
              // Le brouillon repart de ce que porte l'affaire à chaque
              // ouverture, comme les autres saisies du panneau.
              key={edit.negotiationNote}
              value={edit.negotiationNote}
              pending={edit.pending}
              onSave={edit.onNote}
            />
          )}

          <StepProofs
            automatic={edit.autoProofs(point.step)}
            proofs={edit.proofs(point.step)}
            customerId={edit.customerId}
            drivePath={edit.drivePath}
            canWrite
            pending={edit.pending}
            onAdd={(input, file) => edit.onAddProof(point.step, input, file)}
            onRemove={edit.onRemoveProof}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Ce que le cran écrit, et l'éditeur qui l'écrit.
 *
 * **Un cran qui sait écrire sait retirer** : sa marque, son jalon, sa liste de
 * matériaux, la date de chantier de l'affaire — même franchi par un fait pour
 * les cinq crans à marque, dont la date affichée suit la marque (`readCycle`).
 *
 * L'acompte et le solde vivent sur le devis : leur saisie est la boîte des
 * règlements, la même que partout, qui porte son propre « Retirer
 * l'encaissement ». Franchis par une pièce qu'on ne tient pas ici, ils le
 * disent au lieu d'offrir un bouton qui ne retirerait rien ; sans devis, il
 * n'y a pas où écrire.
 */
function StepWriter({
  point,
  edit,
  onClose,
}: {
  point: CyclePoint;
  edit: CycleEdit;
  onClose: () => void;
}) {
  const write = stepWrite(point.step);
  const marked = edit.markedAt(point.step);

  if (write.target === "quote") {
    return (
      <SettleWriter
        kind={write.field === "deposit" ? "acompte" : "solde"}
        note={write.note}
        byFact={point.state === "done" && (point.byFact || marked === null)}
        paid={marked !== null}
        edit={edit}
        onClose={onClose}
      />
    );
  }

  if (write.target === "materials") {
    return (
      <MaterialsEditor
        // La resynchronisation du brouillon est explicite, et ne tient pas au
        // démontage du contenu par Radix, qui n'est pas une promesse de son API.
        key={`${marked ?? "vide"}·${edit.materials.join("|")}`}
        value={edit.materials}
        marked={marked}
        pending={edit.pending}
        note={write.note}
        onSave={(list) => edit.onMaterials(list)}
        onRemove={() => edit.onMaterials(null)}
        onClose={onClose}
      />
    );
  }

  return (
    <StepDateEditor
      key={marked ?? "vide"}
      value={marked}
      mode={write.target === "worksite_date" ? "booking" : "past"}
      note={write.note}
      pending={edit.pending}
      onPick={(at) => edit.onMark(point.step, at)}
      onClose={onClose}
    />
  );
}

/** L'acompte ou le solde : le panneau se ferme, la boîte des règlements s'ouvre. */
function SettleWriter({
  kind,
  note,
  byFact,
  paid,
  edit,
  onClose,
}: {
  kind: ReglementKind;
  note: string;
  byFact: boolean;
  paid: boolean;
  edit: CycleEdit;
  onClose: () => void;
}) {
  if (byFact) {
    return (
      <p className="text-muted-foreground/70 text-[11px]">
        Déjà franchi par ce que porte l&apos;affaire — une facture, un devis. Rien à
        retirer ici.
      </p>
    );
  }
  const sansDevis = !edit.hasQuote;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-muted-foreground/70 text-[11px]">
        {sansDevis ? `${note} Cette affaire n'en porte aucun.` : note}
      </p>
      <Button
        size="xs"
        variant={paid ? "outline" : "default"}
        className="self-end"
        data-demo={sansDevis ? undefined : "cran-reglement"}
        disabled={edit.pending}
        onClick={() => {
          // Une surface à la fois : le panneau se ferme avant que la boîte s'ouvre.
          onClose();
          if (sansDevis) edit.onAddQuote();
          else edit.onSettle(kind);
        }}
      >
        {sansDevis ? "Nouveau devis…" : settlementTriggerLabel(paid)}
      </Button>
    </div>
  );
}

/**
 * Pourquoi la négociation traîne, écrit sur le cran.
 *
 * Le cran ne portait qu'une date : on lisait « en attente depuis 23 j » sans
 * jamais savoir sur quoi ça bloque — le prix, un délai, un confrère, un tiers
 * qu'on attend. C'est pourtant la seule chose qui permette de décider de la
 * relance, et la relance a justement un champ de motif qui ne remonte nulle
 * part sur la frise.
 *
 * Il s'enregistre à part de la date : on note souvent avant de savoir si le
 * cran est franchi, et exiger les deux ensemble obligerait à cocher pour
 * pouvoir écrire.
 */
function NoteNegociation({
  value,
  pending,
  onSave,
}: {
  value: string;
  pending?: boolean;
  onSave: (note: string) => boolean | Promise<boolean>;
}) {
  const [draft, setDraft] = useState(value);
  const modifie = draft.trim() !== value.trim();

  return (
    <div className="flex flex-col gap-1" data-demo="negociation-note">
      <label className="text-muted-foreground text-[11px]">Ce qui bloque</label>
      <Textarea
        rows={2}
        placeholder="Le prix, un délai, un confrère, un tiers qu'on attend…"
        className="min-h-14 text-xs"
        value={draft}
        disabled={pending}
        onChange={(event) => setDraft(event.target.value)}
      />
      {modifie && (
        <div className="flex items-center justify-end gap-2">
          <Button
            size="xs"
            variant="ghost"
            disabled={pending}
            onClick={() => setDraft(value)}
          >
            Annuler
          </Button>
          <Button size="xs" disabled={pending} onClick={() => void onSave(draft.trim())}>
            Enregistrer
          </Button>
        </div>
      )}
    </div>
  );
}
