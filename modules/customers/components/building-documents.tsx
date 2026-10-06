"use client";

import { useState } from "react";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { askConfirm } from "@/shared/ui/confirm";
import { formatDate } from "@/shared/lib/format";
import { useAction } from "../hooks/use-customers";
import { deleteBuildingDocument } from "../lib/building-api";
import { DOCUMENT_KIND, orderInForce } from "../lib/building-labels";
import type { Building, BuildingDocument } from "../lib/building-types";
import type { Project } from "../lib/types";
import { BuildingDocumentDialog } from "./building-document-dialog";
import { RowMenu } from "./row-menu";

/**
 * Le dossier réglementaire d'un immeuble (migration 110) : arrêtés de péril et
 * de mise en sécurité, rapports de bureau d'études, contrôles.
 *
 * Ils tiennent à l'immeuble et lui restent quand l'affaire est close. Un arrêté
 * encore en vigueur se lit en premier, en alerte : c'est ce qu'on doit savoir
 * avant d'y envoyer une équipe. Du document on garde le lien, jamais le
 * fichier.
 */
export function BuildingDocuments({
  customerId,
  documents,
  projects,
  canWrite,
  onChanged,
}: {
  customerId: string;
  documents: BuildingDocument[];
  projects: Project[];
  canWrite: boolean;
  onChanged: (next: Building) => void;
}) {
  const [editing, setEditing] = useState<BuildingDocument | "new" | null>(null);
  const remove = useAction(deleteBuildingDocument);

  async function retirer(document: BuildingDocument) {
    const sure = await askConfirm({
      title: `Retirer « ${document.title} » du dossier ?`,
      description: "La pièce quitte le dossier de l'immeuble. Le document lui-même reste où il est.",
      confirmLabel: "Retirer",
      destructive: true,
    });
    if (!sure) return;
    const next = await remove.run(customerId, document.id);
    if (next) onChanged(next);
  }

  return (
    <section className="flex flex-col gap-2" data-demo="building-documents">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Dossier réglementaire</h2>
        {canWrite && (
          <Button size="sm" variant="outline" onClick={() => setEditing("new")}>
            <PlusIcon />
            Ajouter une pièce
          </Button>
        )}
      </div>
      {documents.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Aucune pièce. Un arrêté, un rapport de bureau d&apos;études, un contrôle : ils restent à
          l&apos;immeuble, affaire close ou non.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {documents.map((document) => {
            const inForce = orderInForce(document);
            return (
              <li key={document.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium break-words">{document.title}</span>
                    {inForce && <span className="text-danger text-xs font-medium">en vigueur</span>}
                    {document.lifted_at && (
                      <span className="text-success text-xs">levé le {formatDate(document.lifted_at)}</span>
                    )}
                  </div>
                  <div className="text-muted-foreground text-xs break-words">
                    {[
                      DOCUMENT_KIND[document.kind],
                      document.issued_at && formatDate(document.issued_at),
                      document.authority,
                      document.reference && `n° ${document.reference}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                  {document.project_id && (
                    <Link
                      href={`/customers/${customerId}?affaire=${document.project_id}`}
                      className="text-xs hover:underline"
                    >
                      Affaire : {document.project_label}
                    </Link>
                  )}
                  {document.note && <p className="text-muted-foreground text-xs break-words">{document.note}</p>}
                </div>
                {document.document_url && (
                  <a
                    href={document.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium hover:underline"
                  >
                    Ouvrir
                  </a>
                )}
                <RowMenu
                  label={`Actions sur ${document.title}`}
                  disabled={remove.pending}
                  onEdit={canWrite ? () => setEditing(document) : undefined}
                  editLabel="Modifier la pièce…"
                  onDelete={canWrite ? () => void retirer(document) : undefined}
                  deleteLabel="Retirer du dossier…"
                />
              </li>
            );
          })}
        </ul>
      )}
      {editing && (
        <BuildingDocumentDialog
          customerId={customerId}
          document={editing === "new" ? null : editing}
          projects={projects}
          onClose={() => setEditing(null)}
          onSaved={onChanged}
        />
      )}
    </section>
  );
}
