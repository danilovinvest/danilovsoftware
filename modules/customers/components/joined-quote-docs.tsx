"use client";

import { PaperclipIcon } from "lucide-react";
import { PreviewLink } from "@/modules/files";
import { formatDate } from "@/shared/lib/format";
import { CYCLE_LABEL, type CycleStep } from "../lib/cycle";
import type { StepProof } from "../lib/types";

/*
  Les crans dont un document joint est un devis : celui qu'on a envoyé, celui
  qu'on renégocie, celui que le client a signé.
*/
const CRANS_DEVIS: CycleStep[] = ["devis", "negociation", "signe"];

/**
 * Les devis joints à la frise, rappelés sous la liste des devis.
 *
 * « Quand on joint un devis, je veux le voir dans l'onglet des devis » : un
 * fichier déposé sur le cran « Devis » partait dans le sous-dossier Devis de
 * l'affaire et devenait une **preuve** du cran, visible seulement en rouvrant
 * le cran. Il n'est pas un devis du CRM — ni référence, ni montant, ni statut —
 * et l'écran ne prétend pas le contraire : il le montre ici, à côté des devis,
 * avec le cran d'où il vient, et il s'ouvre du même clic.
 */
export function JoinedQuoteDocs({ proofs }: { proofs: StepProof[] }) {
  const documents = proofs.filter(
    (proof) => proof.drive_url !== "" && CRANS_DEVIS.includes(proof.step as CycleStep),
  );
  if (documents.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5" data-demo="joined-quote-docs">
      <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        Joints à la frise
      </span>
      <ul className="flex flex-col gap-1">
        {documents.map((proof) => (
          <li key={proof.id}>
            <PreviewLink
              url={proof.drive_url}
              name={proof.drive_name || "Document"}
              className="text-muted-foreground hover:border-primary/40 flex w-full min-w-0 items-center gap-1.5 rounded-md border border-dashed px-2 py-1.5 text-xs transition-colors"
            >
              <PaperclipIcon className="size-3.5 shrink-0" />
              <span className="text-foreground truncate">{proof.drive_name || "Document"}</span>
              <span className="ml-auto shrink-0">
                {CYCLE_LABEL[proof.step as CycleStep].label}
                {proof.occurred_at && ` · ${formatDate(proof.occurred_at)}`}
              </span>
            </PreviewLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
