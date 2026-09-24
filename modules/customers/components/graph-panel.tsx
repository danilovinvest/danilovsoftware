"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePermission } from "@/modules/auth";
import { errorMessage } from "@/shared/api/errors";
import { HUE } from "@/shared/ui/hue";
import * as api from "../lib/api";
import type { GraphNode } from "../lib/graph";
import type { CustomerDetail, CustomerRelations } from "../lib/types";
import { ClassificationEditor } from "./classification-card";
import { CustomerPicker } from "./customer-picker";
import { TONE_CLASSES } from "./enum-badge";
import { FAMILY_HUE } from "./graph-card";

/**
 * Le panneau de droite : la fiche du nœud choisi, et ses voisins.
 *
 * Il ne répète pas un écran du CRM, il y mène (« Ouvrir »). Deux gestes s'y
 * font sur place parce que c'est là qu'on constate le manque : compléter la
 * fiche centrale (relation, SIRET, syndic) et dire qui a apporté une affaire.
 */
export function GraphPanel({
  node,
  neighbors,
  customer,
  relations,
  onSelect,
  onChanged,
}: {
  node: GraphNode;
  neighbors: GraphNode[];
  customer: CustomerDetail;
  relations: CustomerRelations | null;
  onSelect: (id: string) => void;
  onChanged: () => void;
}) {
  const missing = node.rows.filter((row) => row.value === null).length;
  const hue = HUE[FAMILY_HUE[node.family]];
  return (
    <aside
      className="bg-card flex flex-col gap-3 rounded-xl border p-4 lg:sticky lg:top-3"
      data-demo="graph-panel"
    >
      {/*
        L'annonce porte sur l'en-tête seul, et non sur le panneau.

        Il contient deux champs de recherche dont chaque frappe change la liste
        des résultats : sous `aria-live` global, un lecteur d'écran relisait
        tout le panneau à chaque lettre tapée, alors que l'intention était
        d'annoncer le changement de nœud sélectionné. Relevé en relecture.
      */}
      <div className="flex items-start gap-2.5" aria-live="polite">
        <span className={cn("mt-1.5 size-3 shrink-0 rounded-full", hue.solid)} aria-hidden />
        <div className="min-w-0">
          <h3 className="text-base leading-snug font-semibold">{node.label}</h3>
          <p className="text-muted-foreground text-xs">{node.kindLine}</p>
        </div>
      </div>

      {(node.tag || missing > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {node.tag && (
            <span className={cn("rounded-sm px-2 py-0.5 text-[11px]", TONE_CLASSES[node.tag.tone])}>
              {node.tag.text}
            </span>
          )}
          {missing > 0 && (
            <span className={cn("rounded-sm px-2 py-0.5 text-[11px]", TONE_CLASSES.warning)}>
              {missing} champ{missing > 1 ? "s" : ""} à renseigner
            </span>
          )}
        </div>
      )}

      {node.rows.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[13px]">
          {node.rows.map((row) => (
            <div key={row.label} className="contents">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className={cn("tabular-nums [overflow-wrap:anywhere]", row.value === null && "text-warning italic")}>
                {row.value ?? "à renseigner"}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {node.note && <p className="text-muted-foreground border-t pt-2.5 text-xs">{node.note}</p>}

      {node.root && (
        <Complete
          customer={customer}
          manager={
            relations
              ? relations.manager
                ? { id: relations.manager.id, name: relations.manager.display_name }
                : null
              : undefined
          }
          onSaved={onChanged}
          open={missing > 0}
        />
      )}
      {node.projectId && (
        <ProjectReferrer
          key={node.projectId}
          projectId={node.projectId}
          customerId={customer.id}
          current={relations?.project_referrers.find((r) => r.project_id === node.projectId) ?? null}
          onSaved={onChanged}
        />
      )}

      {node.href && !node.root && (
        <Button asChild variant="outline" size="sm" className="self-start">
          <Link href={node.href}>
            Ouvrir <ArrowUpRightIcon />
          </Link>
        </Button>
      )}

      {neighbors.length > 0 && (
        <div className="flex flex-col gap-1 border-t pt-2.5 text-[13px]">
          <span className="text-muted-foreground font-mono text-[11px] tracking-wider uppercase">Relié à</span>
          {neighbors.map((neighbor) => (
            <button
              key={neighbor.id}
              type="button"
              onClick={() => onSelect(neighbor.id)}
              className="text-brand-text truncate text-left hover:underline"
            >
              {neighbor.label}
              <span className="text-muted-foreground"> · {neighbor.sub}</span>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}

/** Compléter la fiche : replié quand rien ne manque, ouvert sinon. */
function Complete({
  customer,
  manager,
  onSaved,
  open: initiallyOpen,
}: {
  customer: CustomerDetail;
  /** Le syndic enregistré, déjà chargé ici : undefined tant qu'il est en route. */
  manager?: { id: string; name: string } | null;
  onSaved: () => void;
  open: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  if (!open) {
    return (
      <Button variant="outline" size="sm" className="self-start" onClick={() => setOpen(true)}>
        Relation, SIRET, syndic…
      </Button>
    );
  }
  return (
    <div className="border-t pt-3">
      <ClassificationEditor
        key={`${customer.relation}:${customer.siret}`}
        customer={customer}
        manager={manager}
        onSaved={onSaved}
      />
    </div>
  );
}

/**
 * Qui a apporté l'affaire. S'écrit au choix, comme le parrain d'une fiche :
 * choisir ou retirer enregistre.
 */
function ProjectReferrer({
  projectId,
  customerId,
  current,
  onSaved,
}: {
  projectId: string;
  customerId: string;
  current: CustomerRelations["project_referrers"][number] | null;
  onSaved: () => void;
}) {
  const canWrite = usePermission("customers:write");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (!canWrite && !current) return null;

  async function change(id: string | null) {
    setError(null);
    if (id === customerId) {
      setError("Une affaire n'est pas apportée par sa propre fiche.");
      return;
    }
    setPending(true);
    try {
      await api.setProjectReferrer(projectId, id);
      onSaved();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1 border-t pt-3" data-demo="graph-apporteur">
      <CustomerPicker
        label="Apporté par"
        value={current?.customer_id ?? null}
        valueName={current?.customer_name}
        onChange={(id) => void change(id)}
        placeholder="Chercher le syndic, l'architecte…"
        disabled={!canWrite || pending}
      />
      {error && <p className="text-danger text-xs">{error}</p>}
    </div>
  );
}
