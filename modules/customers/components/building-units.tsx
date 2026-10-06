"use client";

import { useState } from "react";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { askConfirm } from "@/shared/ui/confirm";
import { formatPhone } from "@/shared/lib/format";
import { useAction } from "../hooks/use-customers";
import { deleteUnit } from "../lib/building-api";
import { OCCUPANT_ROLE, UNIT_KIND, UNIT_PROJECT_ROLE } from "../lib/building-labels";
import type { Building, BuildingUnit } from "../lib/building-types";
import type { Project } from "../lib/types";
import { RowMenu } from "./row-menu";
import { UnitDialog } from "./unit-dialog";
import { appHref } from "@/shared/lib/routes";

/**
 * Les lots d'un immeuble et leurs occupants (migration 110).
 *
 * Mme Saadaoui occupe le logement où l'on intervient, M. Cousin celui du
 * dessus ; le Jardin Secret tient le commerce, et son exploitant signe le PV
 * sans être le payeur. Chaque lot dit qui l'occupe, comment le joindre, et ce
 * qu'il a à voir avec chaque affaire.
 */
export function BuildingUnits({
  customerId,
  units,
  projects,
  canWrite,
  onChanged,
}: {
  customerId: string;
  units: BuildingUnit[];
  /** Les affaires vivantes de la fiche : celles qu'un lot peut concerner. */
  projects: Project[];
  canWrite: boolean;
  onChanged: (next: Building) => void;
}) {
  const [editing, setEditing] = useState<BuildingUnit | "new" | null>(null);
  const remove = useAction(deleteUnit);

  async function retirer(unit: BuildingUnit) {
    const sure = await askConfirm({
      title: `Retirer le lot « ${unit.label} » ?`,
      description: "Le lot, son occupant et ses liens aux affaires quittent la fiche. Les affaires restent.",
      confirmLabel: "Retirer",
      destructive: true,
    });
    if (!sure) return;
    const next = await remove.run(customerId, unit.id);
    if (next) onChanged(next);
  }

  return (
    <section className="flex flex-col gap-2" data-demo="building-units">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Lots et occupants</h2>
        {canWrite && (
          <Button size="sm" variant="outline" onClick={() => setEditing("new")}>
            <PlusIcon />
            Ajouter un lot
          </Button>
        )}
      </div>
      {units.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Aucun lot. Ajoutez celui où l&apos;on intervient, ses voisins touchés, le commerce du
          rez-de-chaussée.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {units.map((unit) => (
            <li key={unit.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 px-3 py-2 text-sm">
              <div className="min-w-44">
                <div className="font-medium break-words">{unit.label}</div>
                <div className="text-muted-foreground text-xs">
                  {[UNIT_KIND[unit.kind], unit.floor].filter(Boolean).join(" · ")}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                {unit.occupant_name || unit.occupant_customer_id ? (
                  <div className="break-words">
                    {unit.occupant_customer_id ? (
                      <Link href={appHref(`/customers/${unit.occupant_customer_id}`)} className="font-medium hover:underline">
                        {unit.occupant_name || unit.occupant_customer_name}
                      </Link>
                    ) : (
                      <span className="font-medium">{unit.occupant_name}</span>
                    )}
                    {unit.occupant_role && (
                      <span className="text-muted-foreground"> · {OCCUPANT_ROLE[unit.occupant_role]}</span>
                    )}
                  </div>
                ) : (
                  <div className="text-muted-foreground">Occupant inconnu</div>
                )}
                <div className="text-muted-foreground flex flex-wrap gap-x-3 text-xs">
                  {unit.occupant_phone && (
                    <a href={`tel:${unit.occupant_phone}`} className="hover:text-primary">
                      {formatPhone(unit.occupant_phone)}
                    </a>
                  )}
                  {unit.occupant_email && (
                    <a href={`mailto:${unit.occupant_email}`} className="hover:text-primary break-all">
                      {unit.occupant_email}
                    </a>
                  )}
                </div>
                {unit.projects.map((link) => (
                  <div key={link.project_id} className="text-xs">
                    <span className="font-medium">{UNIT_PROJECT_ROLE[link.role].label}</span>
                    <span className="text-muted-foreground"> · </span>
                    <Link href={appHref(`/customers/${customerId}?affaire=${link.project_id}`)} className="hover:underline">
                      {link.label}
                    </Link>
                  </div>
                ))}
                {unit.note && <p className="text-muted-foreground text-xs break-words">{unit.note}</p>}
              </div>
              <RowMenu
                label={`Actions sur le lot ${unit.label}`}
                disabled={remove.pending}
                onEdit={canWrite ? () => setEditing(unit) : undefined}
                editLabel="Modifier le lot…"
                onDelete={canWrite ? () => void retirer(unit) : undefined}
                deleteLabel="Retirer le lot…"
              />
            </li>
          ))}
        </ul>
      )}
      {editing && (
        <UnitDialog
          customerId={customerId}
          unit={editing === "new" ? null : editing}
          projects={projects}
          onClose={() => setEditing(null)}
          onSaved={onChanged}
        />
      )}
    </section>
  );
}
