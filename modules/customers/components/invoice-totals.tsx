"use client";

import { InfoIcon } from "lucide-react";
import { formatAmount } from "@/shared/lib/format";
import type { Project } from "../lib/types";

/**
 * Ce qu'une affaire a facturé, encaissé, et ce qui reste.
 *
 * Le bloc n'apparaît **que si elle a facturé quelque chose** : un « 0 € »
 * sous une affaire qui n'a que des devis se lirait comme une facturation
 * oubliée, alors qu'il n'y a simplement rien à facturer encore. C'est la même
 * règle que la colonne « Signé TTC », qui affiche un tiret plutôt qu'un zéro.
 *
 * **Le reste à payer se tait quand il serait faux.** Mesuré le 24/09 : 154
 * acomptes sont marqués reçus et cinq portent un montant. Annoncer un reste
 * égal à la totalité du marché sur les autres ferait douter de tout l'écran —
 * c'est la leçon des chantiers simulés, dont les totaux à zéro sous trente-sept
 * lignes avaient fait perdre confiance dans la page entière. Le serveur compte
 * donc les règlements encaissés dont le montant manque, et le bloc le dit.
 */
export function InvoiceTotals({ project }: { project: Project }) {
  const facture = Number(project.invoiced_amount_ttc);
  if (!Number.isFinite(facture) || facture === 0) return null;

  const encaisse = Number(project.collected_amount_ttc);
  const inconnus = project.settlements_without_amount;
  const reste = facture - encaisse;

  return (
    <div className="rounded-lg border p-3" data-demo="invoice-totals">
      <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
        Facturation
      </p>
      <dl className="grid grid-cols-3 gap-3">
        <Chiffre libelle="Facturé" valeur={formatAmount(project.invoiced_amount_ttc)} fort />
        <Chiffre libelle="Encaissé" valeur={formatAmount(project.collected_amount_ttc)} />
        <Chiffre
          libelle="Reste à payer"
          valeur={inconnus > 0 ? "à vérifier" : formatAmount(String(reste))}
          fort={inconnus === 0 && reste > 0}
        />
      </dl>
      {inconnus > 0 && (
        <p className="text-muted-foreground mt-2 flex gap-2 text-xs">
          <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
          <span>
            {inconnus === 1
              ? "Un règlement est marqué encaissé sans que son montant soit saisi"
              : `${inconnus} règlements sont marqués encaissés sans que leur montant soit saisi`}{" "}
            : le reste à payer ne peut pas être calculé tant qu&apos;il manque.
          </span>
        </p>
      )}
    </div>
  );
}

function Chiffre({
  libelle,
  valeur,
  fort = false,
}: {
  libelle: string;
  valeur: string;
  fort?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{libelle}</dt>
      <dd className={`truncate text-sm ${fort ? "font-semibold" : ""}`}>{valeur}</dd>
    </div>
  );
}
