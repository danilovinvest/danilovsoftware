"use client";

import { useState } from "react";
import { CheckIcon, InfoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DateField } from "@/shared/ui/date-time-field";
import { formatDate } from "@/shared/lib/format";
import { cn } from "@/lib/utils";
import { jalonOrder, type Jalons } from "../lib/jalons";
import {
  DepositTag,
  SettlementButton,
  type DepositTotal,
  type SettlementTransfers,
} from "./deposit-field";
import { MaterialsEditor, MaterialsTags } from "./materials-field";
import type { Metier } from "../lib/cycle";
import type { ProjectMission } from "../lib/types";

/**
 * L'après-signature : ce qui sépare un devis signé d'un chantier qui démarre.
 *
 * Six jalons, dans l'ordre où ils arrivent. Deux sont réels — l'acompte facturé
 * et l'acompte encaissé se lisent sur le devis. Les quatre autres n'ont pas
 * encore de colonne en base et le disent, plutôt que de faire croire qu'ils
 * sont suivis.
 *
 * **Deux lignes ne se cochent pas, elles se saisissent.** « Date de chantier »
 * se choisit au calendrier : cocher poserait la date du jour, alors qu'on
 * réserve un chantier pour dans six semaines — et c'est le seul jalon qui
 * alerte quand il manque, parce que c'est là que tout attend. « Matériaux
 * commandés » se liste : une date seule ne dit pas ce qu'on attend à la
 * livraison, et c'était la demande du dirigeant.
 */
export function ProjectJalons({
  metier,
  mission,
  jalons,
  onToggle,
  onMaterials,
  depositTotal = null,
  onDeposit,
  onDepositRemove,
  depositPaidAt = null,
  depositTransfers,
  disabled,
  className,
}: {
  /** Le métier de l'affaire : il décide de la liste des jalons. */
  metier: Metier;
  /** La mission d'une étude : elle décide des étapes de production. */
  mission?: ProjectMission;
  jalons: Jalons;
  onToggle: (key: keyof Jalons, value: string | null) => void;
  /**
   * La commande de matériaux, listée. `null` retire la liste et sa date.
   *
   * Elle ne passe pas par `onToggle` : les autres jalons sont des instants, et
   * élargir leur signature à une liste aurait obligé chaque appelant à traiter
   * un cas qui ne concerne qu'une ligne sur quinze.
   */
  onMaterials: (list: string[] | null) => boolean | Promise<boolean>;
  /** Le montant du devis, auquel l'acompte se compare. */
  depositTotal?: DepositTotal | null;
  /**
   * Encaisse l'acompte avec son montant et son jour, ou les corrige.
   *
   * Obligatoire : l'acompte encaissé s'ouvrait en simple case « Marquer fait »
   * quand un écran oubliait de le passer, et posait alors la date du jour. Il
   * n'a plus qu'une saisie, l'éditeur des règlements.
   */
  onDeposit: (amount: string | null, paidAt?: string) => boolean | Promise<boolean>;
  /** Retire l'encaissement, et rend la réussite de l'écriture. */
  onDepositRemove: () => boolean | Promise<boolean>;
  /** Le vrai jour d'encaissement, jamais le repli sur l'émission du devis. */
  depositPaidAt?: string | null;
  /** Les virements de l'acompte, quand l'écran les connaît. */
  depositTransfers?: SettlementTransfers;
  disabled?: boolean;
  className?: string;
}) {
  const ordre = jalonOrder(metier, mission);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <ol className="flex flex-col">
        {ordre.map((jalon, index) => {
          const at = jalons[jalon.key];
          const done = at !== null;
          const last = index === ordre.length - 1;
          // Le premier jalon non atteint est celui qui bloque la suite : lui
          // seul se met en avant, sans quoi six lignes réclameraient à la fois.
          // Une étape facultative — des corrections — ne bloque ni ne réclame.
          const blocking =
            !done &&
            !jalon.optional &&
            ordre.slice(0, index).every((prev) => prev.optional || jalons[prev.key] !== null);

          return (
            <li key={jalon.key} data-demo={`jalon-${jalon.key}`} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                    done
                      ? "bg-success border-success"
                      : blocking
                        ? "border-warning bg-warning/10"
                        : "border-border",
                  )}
                >
                  {done && <CheckIcon className="text-background size-3" strokeWidth={4} />}
                </span>
                {!last && (
                  <span className={cn("w-0.5 flex-1", done ? "bg-success" : "bg-border")} />
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 pb-4">
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      "flex items-center gap-1.5 text-sm",
                      done ? "text-foreground" : blocking ? "text-warning font-medium" : "text-muted-foreground",
                    )}
                  >
                    {jalon.label}
                  </div>
                  <div className="text-muted-foreground/70 text-xs">
                    {done ? formatDate(at) : jalon.hint}
                    {/* Combien, à côté de quand : c'est ce qu'on vérifie sur le relevé. */}
                    {done && jalon.picks === "deposit" && jalons.deposit_amount && (
                      <>
                        {" · "}
                        <DepositTag amount={jalons.deposit_amount} />
                      </>
                    )}
                  </div>
                  {/*
                    La commande se lit sous sa date : « commandés le 12 sept. »
                    sans dire quoi ne permet pas de vérifier la livraison.
                  */}
                  {jalon.picks === "materials" && (
                    <MaterialsTags items={jalons.materials} className="mt-1" />
                  )}
                </div>

                {jalon.picks === "date" ? (
                  <DatePickerButton
                    value={at}
                    disabled={disabled}
                    onPick={(value) => onToggle(jalon.key, value)}
                  />
                ) : jalon.picks === "materials" ? (
                  <MaterialsButton
                    marked={at}
                    materials={jalons.materials}
                    disabled={disabled}
                    onSave={onMaterials}
                  />
                ) : jalon.picks === "deposit" ? (
                  <SettlementButton
                    kind="acompte"
                    paid={done}
                    amount={jalons.deposit_amount}
                    paidAt={depositPaidAt}
                    total={depositTotal}
                    transfers={depositTransfers}
                    disabled={disabled}
                    onSave={onDeposit}
                    onRemove={onDepositRemove}
                  />
                ) : (
                  <Button
                    size="xs"
                    variant={done ? "ghost" : "outline"}
                    disabled={disabled}
                    onClick={() => onToggle(jalon.key, done ? null : new Date().toISOString())}
                  >
                    {done ? "Annuler" : "Marquer fait"}
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/*
        Chaque jalon vit là où il appartient, et l'écran le dit : l'acompte est
        une propriété du devis, la date de chantier est celle de l'affaire —
        la même que lit l'écran Chantiers.
      */}
      <p className="text-muted-foreground/70 flex items-start gap-1.5 text-xs">
        <InfoIcon className="mt-0.5 size-3 shrink-0" />
        <span>
          L&apos;acompte suit le devis ; la date de chantier est celle de
          l&apos;affaire, partagée avec l&apos;écran Chantiers.
        </span>
      </p>
    </div>
  );
}

/**
 * La commande de matériaux, saisie depuis la ligne du jalon.
 *
 * Le même éditeur que le cran de la frise, et c'est voulu : deux saisies pour
 * une même colonne auraient divergé au premier ajustement, et la liste cochée
 * ici doit être exactement celle qu'on retrouve là.
 */
function MaterialsButton({
  marked,
  materials,
  disabled,
  onSave,
}: {
  marked: string | null;
  materials: string[];
  disabled?: boolean;
  onSave: (list: string[] | null) => boolean | Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="xs" variant={marked ? "ghost" : "outline"} disabled={disabled}>
          {marked ? "Modifier" : "Commander"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <MaterialsEditor
          key={`${marked ?? "vide"}·${materials.join("|")}`}
          value={materials}
          marked={marked}
          pending={disabled}
          note="Écrit la commande et sa date dans les jalons de l'affaire."
          onSave={(list) => onSave(list)}
          onRemove={() => onSave(null)}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}

function DatePickerButton({
  value,
  disabled,
  onPick,
}: {
  value: string | null;
  disabled?: boolean;
  onPick: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => value?.slice(0, 10) ?? nextMonday());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="xs" variant={value ? "ghost" : "default"} disabled={disabled}>
          {value ? "Changer" : "Réserver une date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="flex flex-col gap-3">
          <DateField label="Date de démarrage" value={draft} onChange={setDraft} />
          <div className="flex justify-between gap-2">
            {value && (
              <Button
                size="xs"
                variant="ghost"
                onClick={() => {
                  onPick(null);
                  setOpen(false);
                }}
              >
                Retirer
              </Button>
            )}
            <Button
              size="xs"
              className="ml-auto"
              onClick={() => {
                onPick(new Date(`${draft}T08:00:00`).toISOString());
                setOpen(false);
              }}
            >
              Réserver
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Un chantier démarre un lundi. C'est le défaut le moins surprenant. */
function nextMonday(): string {
  const at = new Date();
  at.setDate(at.getDate() + ((8 - at.getDay()) % 7 || 7));
  return at.toISOString().slice(0, 10);
}
