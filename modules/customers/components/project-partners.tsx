"use client";

import { useState } from "react";
import { HandshakeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LIVE, revalidatePrefixes, useCached } from "@/shared/api/cache";
import { formatAmount } from "@/shared/lib/format";
import { ErrorNotice } from "@/shared/ui/feedback";
import { listProjectPartners, partnerSummary, type ProjectPartner } from "../lib/partners";
import { ProjectPartnersDialog } from "./project-partners-dialog";

/**
 * Les partenaires d'une affaire, en une ligne en tête de ses devis
 * (migration 113) : qui l'a prescrite, qui intervient, qui on a recommandé, et
 * ce que le client a réglé directement au bureau d'études.
 *
 * La ligne se tait quand il n'y a rien à lire ni à écrire. Une écriture relit
 * l'espace des partenaires concernés, qui résume ces affaires.
 */
export function ProjectPartners({
  projectId,
  ownerId,
  canWrite,
}: {
  projectId: string;
  ownerId: string;
  canWrite: boolean;
}) {
  const { data, error, mutate } = useCached(`customers:partners:${projectId}`, () => listProjectPartners(projectId), LIVE);
  const [editing, setEditing] = useState(false);
  if (error && !data) return <ErrorNotice message="Partenaires illisibles." onRetry={() => void mutate()} />;
  if (!data) return null;
  if (data.length === 0 && !canWrite) return null;

  function adopt(next: ProjectPartner[]) {
    void mutate(next, { revalidate: false });
    revalidatePrefixes("customers:partner-space:", "customers:partner-ranking:");
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs" data-demo="project-partners">
      <HandshakeIcon className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
      <span className="font-medium">Partenaires</span>
      <span className="text-muted-foreground min-w-0 flex-1 break-words">
        {data.length === 0 ? "aucun" : partnerSummary(data, formatAmount)}
      </span>
      {canWrite && (
        <Button size="xs" variant="outline" onClick={() => setEditing(true)}>
          Partenaires…
        </Button>
      )}
      {editing && (
        <ProjectPartnersDialog
          projectId={projectId}
          ownerId={ownerId}
          partners={data}
          onClose={() => setEditing(false)}
          onSaved={adopt}
        />
      )}
    </div>
  );
}
