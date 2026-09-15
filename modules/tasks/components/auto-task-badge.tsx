import { ZapIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * L'étape qui a fait naître une tâche automatique.
 *
 * Une tâche que personne n'a saisie doit le dire : sans cette marque, on
 * chercherait qui l'a créée, et on hésiterait à la supprimer. Le libellé nomme
 * le moment de l'affaire, pas le mécanisme.
 */
const RULE_LABEL: Record<string, string> = {
  facture_acompte: "devis signé",
  facture_commande: "commande signée",
  calcul: "acompte encaissé",
  dessin: "calcul terminé",
  validation: "plans rendus",
  envoi_dossier: "dossier définitif",
  redaction: "commande payée",
  envoi_rapport: "rapport rédigé",
  sondage: "acompte encaissé",
  rapport_sondage: "sondage réalisé",
  satisfaction: "dossier livré",
};

export function AutoTaskBadge({ rule, className }: { rule: string; className?: string }) {
  const moment = RULE_LABEL[rule];
  return (
    <span
      data-demo="task-auto"
      title={
        moment
          ? `Créée automatiquement : ${moment}. Elle se ferme d'elle-même quand l'étape suivante est cochée.`
          : "Créée automatiquement par une étape de l'affaire."
      }
      className={cn(
        "bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 align-middle text-[10px] font-medium",
        className,
      )}
    >
      <ZapIcon className="size-2.5" />
      Auto{moment ? ` · ${moment}` : ""}
    </span>
  );
}
