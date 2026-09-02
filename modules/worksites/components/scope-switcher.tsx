"use client";

import { BuildingIcon, LayersIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACTIVITIES, ENTITIES } from "@/modules/group";

/**
 * Le sélecteur de périmètre, sur deux niveaux.
 *
 * La société et le métier ne sont pas la même chose : « CLIM / EPDM » nomme une
 * activité, pas une raison sociale, et l'onglet finances du classeur lui donne
 * pourtant son propre expert-comptable. Un seul niveau obligerait à choisir, et
 * chaque choix perdrait quelque chose — le chiffre par métier, ou la TVA par
 * société.
 */
export function ScopeSwitcher({
  entityId,
  activityId,
  onChange,
}: {
  entityId: string | null;
  activityId: string | null;
  onChange: (entity: string | null, activity: string | null) => void;
}) {
  // Seules les sociétés qui exécutent quelque chose ont leur place ici : la
  // holding et la société civile ne tiennent pas de chantier.
  const entities = ENTITIES.filter((entity) =>
    ACTIVITIES.some(
      (activity) =>
        activity.entity_id === entity.id && activity.kind !== "immobilier",
    ),
  );
  const activities = ACTIVITIES.filter(
    (activity) => activity.entity_id === entityId && activity.kind !== "immobilier",
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        <Chip
          active={entityId === null}
          icon={<LayersIcon className="size-3.5" />}
          onClick={() => onChange(null, null)}
        >
          Tout le groupe
        </Chip>
        {entities.map((entity) => (
          <Chip
            key={entity.id}
            active={entityId === entity.id}
            icon={<BuildingIcon className="size-3.5" />}
            title={`${entity.legal_form} · SIREN ${entity.siren}`}
            onClick={() => onChange(entity.id, null)}
          >
            {entity.name}
          </Chip>
        ))}
      </div>

      {activities.length > 1 && (
        <div className="flex flex-wrap gap-1.5 pl-1">
          <Chip active={activityId === null} onClick={() => onChange(entityId, null)}>
            Tous les métiers
          </Chip>
          {activities.map((activity) => (
            <Chip
              key={activity.id}
              active={activityId === activity.id}
              title={activity.caveat ?? activity.description}
              onClick={() => onChange(entityId, activity.id)}
            >
              {activity.name}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({
  active,
  icon,
  title,
  onClick,
  children,
}: {
  active: boolean;
  icon?: React.ReactNode;
  title?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={cn(
        "flex items-center gap-1.5 rounded-[4px] border px-2.5 py-1.5 text-xs transition-colors",
        active
          ? "border-foreground/20 bg-selected text-foreground font-medium"
          : "text-muted-foreground hover:bg-accent border-transparent",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
