import { InfoIcon } from "lucide-react";
import { euros, plural } from "@/shared/lib/format";

/**
 * Le reste dû qui n'est probablement pas un impayé.
 *
 * Mesuré le 01/10 : 1,21 M€ des 1,30 M€ de reste dû de GROUPE portent sur des
 * factures dont l'acompte ou le solde est **marqué reçu** — la copie OneDrive
 * le pose — sans qu'aucun virement ait été saisi. Le reste dû suit la règle du
 * recouvrement, qui ne lit que les virements : l'écran le dit au lieu de
 * présenter ces montants comme des créances.
 */
export function UnrecordedNotice({ amount, count }: { amount: number; count: number }) {
  if (count === 0) return null;
  return (
    <div
      data-demo="billing-unrecorded"
      className="bg-info-soft text-muted-foreground flex items-start gap-2 rounded-xl px-3 py-2 text-xs"
    >
      <InfoIcon className="text-info mt-0.5 size-3.5 shrink-0" />
      <p>
        <span className="text-foreground font-medium">
          Dont {euros(amount)} sur {plural(count, "facture")} marquée{count > 1 ? "s" : ""} reçue
          {count > 1 ? "s" : ""} sans virement saisi.
        </span>{" "}
        Le reste dû ne compte que les virements enregistrés : ces montants sont plus souvent un
        règlement jamais saisi qu&apos;un impayé. Les saisir (ou rapprocher le relevé) les fait sortir.
      </p>
    </div>
  );
}
