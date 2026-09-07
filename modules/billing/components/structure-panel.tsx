import { ExternalLinkIcon, NetworkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { euros, formatDate } from "@/shared/lib/format";
import { Panel, TONE_SOFT } from "@/shared/ui/panel";
import { DORMANT_ENTITIES, ENTITIES, type Entity } from "@/modules/group";
import { ENTITY_ROLE, formatSiren, formatVat } from "../lib/labels";

/**
 * La structure juridique du groupe.
 *
 * Contrairement au reste de l'écran, **ce panneau ne contient rien
 * d'inventé** : chaque ligne vient du registre national des entreprises. C'est
 * précisément pour cela qu'il porte un lien vers la fiche officielle de chaque
 * société — le lecteur doit pouvoir vérifier, et distinguer d'un coup d'œil ce
 * qui est établi de ce qui est simulé.
 *
 * Seule la ligne de détention est une hypothèse, et elle le dit.
 */
function EntityCard({ entity }: { entity: Entity }) {
  const role = ENTITY_ROLE[entity.role];
  const Icon = role.icon;

  return (
    <div className="bg-card flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{entity.name}</p>
          {entity.trade_name && (
            <p className="text-muted-foreground text-[11px]">
              Enseigne {entity.trade_name}
            </p>
          )}
        </div>
        <span
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px]",
            TONE_SOFT[role.tone],
          )}
        >
          <Icon className="size-3" />
          {role.label}
        </span>
      </div>

      <p className="text-muted-foreground text-xs">{entity.activity}</p>

      <dl className="text-muted-foreground grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11px]">
        <dt>SIREN</dt>
        <dd className="text-foreground font-mono">{formatSiren(entity.siren)}</dd>
        <dt>Forme</dt>
        <dd className="text-foreground">
          {entity.legal_form}
          {entity.capital !== null && ` · capital ${euros(entity.capital)}`}
        </dd>
        <dt>TVA</dt>
        <dd className="text-foreground font-mono">{formatVat(entity.vat)}</dd>
        <dt>NAF</dt>
        <dd className="text-foreground">
          {entity.naf} — {entity.naf_label}
        </dd>
        <dt>Immatriculée</dt>
        <dd className="text-foreground">{formatDate(entity.created_at)}</dd>
      </dl>

      {entity.parent_id !== null && (
        <p className="text-muted-foreground/80 text-[11px]">
          {entity.ownership !== null
            ? `Détenue à ${entity.ownership} % par la holding (hypothèse)`
            : "DANILOV INVEST figure parmi les associés au registre"}
        </p>
      )}

      <a
        href={entity.source}
        target="_blank"
        rel="noreferrer"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[11px]"
      >
        Fiche officielle
        <ExternalLinkIcon className="size-3" />
      </a>
    </div>
  );
}

export function StructurePanel() {
  const holding = ENTITIES.find((entity) => entity.role === "holding");
  const children = ENTITIES.filter((entity) => entity.parent_id !== null);

  return (
    <Panel
      title="Structure du groupe"
      description="Données du registre national des entreprises, au 1er septembre 2026"
      icon={NetworkIcon}
      tone="neutral"
      bodyClassName="flex flex-col gap-3 p-4"
    >
      {holding && (
        <>
          <div className="mx-auto w-full max-w-md">
            <EntityCard entity={holding} />
          </div>
          {/* Un simple trait vertical suffit à dire « au-dessus » : un vrai
              organigramme tracé demanderait un SVG pour une information que la
              disposition donne déjà. */}
          <div className="bg-border mx-auto h-4 w-px" />
        </>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {children.map((entity) => (
          <EntityCard key={entity.id} entity={entity} />
        ))}
      </div>

      <p className="text-muted-foreground/80 text-[11px]">
        Hors périmètre :{" "}
        {DORMANT_ENTITIES.map((entity) => `${entity.name} (${entity.state.toLowerCase()})`).join(
          ", ",
        )}
        . OMPT STRUCTURE exploite un second établissement à Nice depuis juillet 2026.
      </p>
    </Panel>
  );
}
