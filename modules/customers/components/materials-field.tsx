"use client";

import { useId, useRef, useState } from "react";
import { CheckIcon, PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  MATERIALS_MAX,
  MATERIAL_FAMILIES,
  MATERIAL_LENGTH_MAX,
  joinMaterial,
  withMaterial,
  withoutMaterial,
} from "../lib/materiaux";

/**
 * Ce qui a été commandé, et pas seulement qu'on a commandé.
 *
 * Le cran « Matériaux commandés » ne portait qu'une date : d'un clic on
 * affirmait avoir commandé, sans jamais dire quoi. Rien ne permettait donc de
 * vérifier ce qui arrive sur le chantier, ni de répondre au maçon qui demande
 * si les profilés sont partis. « Je veux pouvoir sélectionner c'est quoi les
 * matériaux » : c'est la demande, et elle tient en une liste.
 *
 * **Cocher et taper mènent au même endroit.** Six familles mesurées sur les
 * intitulés réels de l'entreprise font les raccourcis ; la saisie libre porte
 * ce qui compte vraiment à la livraison — la section et la quantité, « 3 IPE
 * 200 · 4,20 m ». Une famille cochée n'est qu'une ligne écrite d'avance, et
 * rien en base ne les distingue : une liste fermée aurait obligé à choisir
 * entre le raccourci et la précision.
 */

/** La liste, en lecture : ce que montre une ligne de jalon ou une frise. */
export function MaterialsTags({
  items,
  className,
}: {
  items: string[];
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {items.map((item) => (
        <span
          key={item}
          // `max-w-full break-words` parce qu'une référence collée sans espace
          // n'offre aucun point de coupure et déborderait du panneau.
          className="bg-muted text-muted-foreground max-w-full rounded-md px-1.5 py-0.5 text-[0.65rem] break-words"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

/**
 * La liste, en écriture.
 *
 * Le brouillon est local et ne part qu'à l'enregistrement : cocher quatre
 * familles ne doit pas faire quatre allers-retours sur une route qui remplace
 * la ligne entière. L'appelant remonte le brouillon au démontage du panneau
 * en changeant sa `key`, comme le fait le cran de date.
 */
export function MaterialsEditor({
  value,
  marked,
  pending,
  onSave,
  onRemove,
  onClose,
  note,
}: {
  value: string[];
  /** La date déjà posée, s'il y en a une. Elle décide des libellés. */
  marked: string | null;
  pending?: boolean;
  /*
    Les deux gestes rendent la réussite de l'écriture, et non rien.

    Le panneau ne doit se fermer que sur un succès : en cas d'échec, un
    brouillon de six lignes cochées et tapées disparaîtrait sans un mot, sur un
    cran qui redevient gris.
  */
  onSave: (list: string[]) => boolean | Promise<boolean>;
  onRemove: () => boolean | Promise<boolean>;
  /** Referme le panneau. Appelé sur un succès, et sur lui seul. */
  onClose: () => void;
  /** Ce que l'enregistrement va écrire, dit avant le clic. */
  note: string;
}) {
  const [draft, setDraft] = useState<string[]>(value);
  const [qte, setQte] = useState("");
  const [libre, setLibre] = useState("");
  const plein = draft.length >= MATERIALS_MAX;
  const champQte = useRef<HTMLInputElement>(null);
  const id = useId();
  /*
    Ce qui reste de place pour la désignation, la quantité et son « × » étant
    déjà comptés. L'API refuse un matériau de plus de 120 caractères et refuse
    alors **toute** l'écriture : mieux vaut ne pas laisser taper au-delà que de
    faire rejeter une commande entière.
  */
  const placeDesignation = MATERIAL_LENGTH_MAX - (qte.trim() === "" ? 0 : qte.trim().length + 3);

  /*
    La règle vit ici, une fois, et non chez les deux appelants : le panneau ne
    se referme que si l'écriture a réussi. Les deux écrans qui portent cet
    éditeur auraient sinon tenu deux copies de la même règle, qui auraient
    divergé au premier ajustement.
  */
  async function envoyer(action: () => boolean | Promise<boolean>) {
    if (await action()) onClose();
  }

  function ajouter() {
    setDraft((current) => withMaterial(current, joinMaterial(qte, libre)));
    setQte("");
    setLibre("");
    champQte.current?.focus();
  }

  return (
    <div className="flex flex-col gap-3">
      {/*
        Les familles **remplissent la désignation**, elles ne s'ajoutent plus
        d'un clic.

        Elles le faisaient, et il n'y avait alors aucun endroit où dire combien
        — c'est ce qui a été rapporté. Un raccourci qui pose l'article et rend
        la main sur la quantité décrit le geste réel : « du béton… combien ? ».
      */}
      <div className="flex flex-wrap gap-1">
        {MATERIAL_FAMILIES.map((famille) => (
          <button
            key={famille}
            type="button"
            disabled={pending || plein}
            onClick={() => {
              setLibre(famille);
              champQte.current?.focus();
            }}
            className={cn(
              "flex cursor-pointer items-center gap-1 rounded-md border px-1.5 py-0.5 text-[0.7rem] transition-colors disabled:cursor-default disabled:opacity-50",
              libre === famille
                ? "border-success/40 bg-success-soft text-success"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30",
            )}
          >
            {libre === famille && <CheckIcon className="size-3 shrink-0" strokeWidth={3} />}
            {famille}
          </button>
        ))}
      </div>

      {/*
        Deux champs et non un.

        Le champ unique portait tout — « 3 IPE 200 · 4,20 m » — et son exemple
        en gris se lisait comme une valeur déjà saisie : on ne voyait pas où
        mettre une quantité, et c'est exactement ce qui a été rapporté. Deux
        libellés au-dessus des champs disent où l'on tape, et lequel compte.

        « Entrée » ajoute depuis l'un comme depuis l'autre : c'est ce qu'on fait
        sans y penser après avoir tapé une ligne, et viser un bouton pour
        chacune des huit lignes d'une commande serait huit gestes de trop.
      */}
      <div className="flex items-end gap-1.5">
        <div className="w-16 shrink-0">
          <label htmlFor={`${id}-qte`} className="text-muted-foreground mb-1 block text-[11px]">
            Quantité
          </label>
          <Input
            id={`${id}-qte`}
            ref={champQte}
            value={qte}
            disabled={pending || plein}
            placeholder="3"
            maxLength={16}
            className="h-8 text-xs"
            onChange={(event) => setQte(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              ajouter();
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <label htmlFor={`${id}-quoi`} className="text-muted-foreground mb-1 block text-[11px]">
            Matériau
          </label>
          <Input
            id={`${id}-quoi`}
            value={libre}
            disabled={pending || plein}
            placeholder="IPE 200 · 4,20 m"
            maxLength={placeDesignation}
            className="h-8 text-xs"
            onChange={(event) => setLibre(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              ajouter();
            }}
          />
        </div>
        <Button
          size="xs"
          variant="outline"
          className="h-8"
          disabled={pending || plein || libre.trim() === ""}
          onClick={ajouter}
        >
          <PlusIcon />
        </Button>
      </div>

      {draft.length > 0 && (
        <ul className="flex flex-col gap-1">
          {draft.map((item) => (
            <li
              key={item}
              className="bg-muted/50 flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs"
            >
              <span className="min-w-0 flex-1 break-words">{item}</span>
              <button
                type="button"
                disabled={pending}
                aria-label={`Retirer ${item}`}
                className="text-muted-foreground hover:text-destructive shrink-0 cursor-pointer"
                onClick={() => setDraft((current) => withoutMaterial(current, item))}
              >
                <XIcon className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-muted-foreground/70 text-[11px]">
        {plein
          ? `Pas plus de ${MATERIALS_MAX} matériaux sur une affaire.`
          : draft.length === 0
            ? /*
                Dit avant le clic, parce que c'est précisément ce qui était
                reproché : franchir le cran sans dire quoi. Le geste reste
                permis — un chef de chantier peut n'avoir que la date, et le
                CRM a vécu ainsi jusqu'ici — mais il ne se prend plus par
                mégarde. Les deux cas ne se disent pas pareil : marquer une
                commande vide n'est pas vider une commande déjà datée.
              */
              marked === null
              ? "Aucun matériau listé : le cran sera franchi sans dire quoi."
              : "La commande restera datée, sans détail. « Retirer » enlève les deux."
            : note}
      </p>

      <div className="flex items-center justify-end gap-2">
        {marked !== null && (
          <Button
            size="xs"
            variant="ghost"
            disabled={pending}
            onClick={() => void envoyer(onRemove)}
          >
            Retirer
          </Button>
        )}
        <Button size="xs" disabled={pending} onClick={() => void envoyer(() => onSave(draft))}>
          {marked === null ? "Marquer commandés" : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}

/**
 * La saisie appelée depuis « à faire maintenant ».
 *
 * Le bouton « Matériaux commandés » n'ouvrait rien : il basculait l'onglet
 * « Après-signature », qui vit tout en bas de l'affaire dépliée. À l'écran,
 * cliquer ne faisait donc **rien** — il fallait deviner qu'il fallait
 * descendre. Une boîte de dialogue arrive là où l'œil est déjà, et c'est le
 * seul endroit du cycle où ce bouton mène désormais.
 *
 * Le même éditeur que les deux panneaux, pour la même raison qu'eux : trois
 * saisies pour une seule colonne auraient divergé au premier ajustement.
 */
export function MaterialsDialog({
  open,
  onOpenChange,
  materials,
  marked,
  pending,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materials: string[];
  marked: string | null;
  pending?: boolean;
  onSave: (list: string[] | null) => boolean | Promise<boolean>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Matériaux commandés</DialogTitle>
          <DialogDescription>
            Une famille remplit le matériau, la quantité reste à vous. Les deux
            se tapent aussi à la main, et la quantité est facultative — on ne
            sait pas toujours combien.
          </DialogDescription>
        </DialogHeader>

        <MaterialsEditor
          // Le brouillon se resynchronise sur ce que porte l'affaire à
          // l'ouverture, comme dans les deux panneaux.
          key={`${open}·${marked ?? "vide"}·${materials.join("|")}`}
          value={materials}
          marked={marked}
          pending={pending}
          note="Écrit la commande et sa date dans les jalons de l'affaire."
          onSave={(list) => onSave(list)}
          onRemove={() => onSave(null)}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
