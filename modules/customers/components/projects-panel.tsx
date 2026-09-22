"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PlusIcon } from "lucide-react";
import { usePermission } from "@/modules/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import * as api from "../lib/api";
import { readCycle, type CyclePoint } from "../lib/cycle";
import { EMPTY_JALONS, EMPTY_MARKS, type Jalons, type StepMarks } from "../lib/jalons";
import { useAction } from "../hooks/use-customers";
import { ProjectBlock } from "./project-block";
import { ProjectCycle } from "./project-cycle";
import { ProjectDialog } from "./project-dialogs";
import { QuoteDialog } from "./quote-dialog";
import type { CustomerDetail, Interaction, Project, Quote } from "../lib/types";

type Patch = Partial<Jalons & StepMarks>;

/**
 * Un rappel dont l'identité ne change jamais, et qui appelle toujours la
 * dernière version de `fn`.
 *
 * Les affaires sont mémorisées : un rappel refabriqué à chaque rendu du
 * panneau les ferait toutes se rendre à nouveau, et la mémorisation ne
 * servirait à rien.
 */
function useStableCallback<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const latest = useRef(fn);
  useEffect(() => {
    latest.current = fn;
  });
  return useCallback((...args: A) => latest.current(...args), []);
}

/** Regroupe par affaire, une fois par liste reçue : chaque affaire garde son tableau. */
function groupByProject<T extends { project_id: string | null }>(items: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    if (!item.project_id) continue;
    const group = groups.get(item.project_id);
    if (group) group.push(item);
    else groups.set(item.project_id, [item]);
  }
  return groups;
}

/**
 * Regroupe par affaire en gardant les tableaux d'une affaire inchangée.
 *
 * Encaisser un acompte remplace un devis, donc la liste entière : regrouper à
 * neuf donnerait un tableau neuf à chaque affaire, et `ProjectBlock`, mémorisé
 * pour ne rendre que l'affaire touchée, les rendrait toutes.
 */
function useStableGroups<T extends { project_id: string | null }>(items: T[]): Map<string, T[]> {
  // État dérivé de la prop, recalculé pendant le rendu quand elle change : le
  // motif que React recommande pour comparer à la valeur précédente.
  const [memo, setMemo] = useState(() => ({ items, groups: groupByProject(items) }));
  if (memo.items === items) return memo.groups;
  const groups = groupByProject(items);
  for (const [id, group] of groups) {
    const before = memo.groups.get(id);
    if (before && before.length === group.length && before.every((item, i) => item === group[i])) {
      groups.set(id, before);
    }
  }
  setMemo({ items, groups });
  return groups;
}

const NONE: never[] = [];

/**
 * Onglet « Affaires ».
 *
 * Chaque affaire est un accordéon (`ProjectBlock`). Replié, il répond à « où en
 * est-on » sans qu'on l'ouvre ; déplié, il dit quoi faire, puis montre
 * l'histoire, les devis et l'après-signature.
 *
 * L'ancien écran posait une liste déroulante d'étape et un bouton « Signaler un
 * blocage ». Les deux demandaient à l'utilisateur de traduire lui-même son
 * métier en vocabulaire de base de données. Ici c'est l'inverse : l'écran lit
 * la base et propose le geste suivant.
 */
export function ProjectsPanel({
  focus = { affaire: null, onglet: null },
  onQuote,
  customer,
  projects,
  quotes,
  interactions,
  onChanged,
}: {
  /** Un devis que l'écriture vient de rendre : l'écran le pose sans attendre. */
  onQuote?: (quote: Quote) => void;
  /**
   * L'affaire désignée par l'adresse (`?affaire=&onglet=`) : elle s'ouvre, sur
   * son onglet, et vient à l'écran. Sans elle, la première s'ouvre.
   */
  focus?: { affaire: string | null; onglet: string | null };
  customer: CustomerDetail;
  projects: Project[];
  quotes: Quote[];
  interactions: Interaction[];
  onChanged: () => void;
}) {
  const canWrite = usePermission("customers:write");
  const canWriteQuotes = usePermission("quotes:write");

  const [creating, setCreating] = useState(false);
  /** L'affaire qu'on modifie. Le même formulaire que la création. */
  const [editing, setEditing] = useState<Project | null>(null);
  const [quoteFor, setQuoteFor] = useState<Project | null>(null);

  // L'instant est figé au montage : sinon « 12 jours sans réponse » se
  // recalculerait à chaque rendu, sur une horloge qui a bougé.
  const [now] = useState(() => Date.now());

  const quotesByProject = useStableGroups(quotes);
  const interactionsByProject = useStableGroups(interactions);

  /*
    Les jalons s'affichent tout de suite, puis s'enregistrent.

    Attendre l'aller-retour pour voir une case se cocher donne une interface
    qui semble ne pas répondre. Le geste est donc appliqué localement d'abord —
    `optimiste` — et le serveur confirme. En cas d'échec, la surcouche est
    retirée : la case revient où elle était, et l'erreur s'affiche. C'est le
    seul moment où l'écran ment brièvement, et il se dédit.
  */
  const [optimiste, setOptimiste] = useState<Record<string, Patch>>({});
  /*
    Les affaires dont une écriture est en vol : leurs crans se verrouillent.

    La route remplace la ligne entière : deux clics rapides sur deux crans
    envoient deux instantanés, et si le premier arrive en dernier il écrase le
    second sans un mot. Le verrou est **par affaire** : écrire sur l'une ne
    fige pas les autres, ni ne les fait se rendre.
  */
  const [enVol, setEnVol] = useState<Record<string, number>>({});

  const saveJalons = useAction(
    async (project: Project, patch: Patch) => {
      // La date de chantier est `started_at` de l'affaire, pas un jalon à
      // part : c'est la colonne que l'écran Chantiers lit déjà.
      if ("worksite_date" in patch) {
        const date = patch.worksite_date;
        // Seule la date part : le serveur garde le reste de l'affaire.
        await api.updateProject(project.id, { started_at: date ? date.slice(0, 10) : null });
        return true;
      }
      /*
        Seules les cases touchées partent : un autre écran — la fiche latérale
        d'un chantier, un second onglet — a pu cocher entre-temps.
      */
      const envoi: Record<string, unknown> = {};
      for (const cle of api.MILESTONE_KEYS) {
        if (cle in patch) envoi[cle] = patch[cle as keyof typeof patch];
      }
      await api.setMilestones(project.id, envoi as Partial<api.MilestonesPayload>);
      // `useAction` rend ce que l'action renvoie : sans ce `true`, l'écriture
      // réussissait et la fiche ne se rafraîchissait jamais.
      return true;
    },
    { inline: true },
  );

  /**
   * Applique le geste tout de suite, l'enregistre, et se dédit s'il échoue.
   *
   * Rend la réussite : un panneau de saisie ne doit se refermer que sur un
   * succès, sans quoi le brouillon disparaît au moment où l'on en a besoin.
   */
  const poserJalon = useStableCallback(async (project: Project, patch: Patch) => {
    const compter = (delta: number) =>
      setEnVol((current) => ({ ...current, [project.id]: (current[project.id] ?? 0) + delta }));
    setOptimiste((current) => ({
      ...current,
      [project.id]: { ...current[project.id], ...patch },
    }));
    compter(1);
    const ok = (await saveJalons.run(project, patch)) !== null;
    compter(-1);
    if (ok) {
      onChanged();
      return true;
    }
    setOptimiste((current) => {
      const propre = { ...current[project.id] };
      for (const cle of Object.keys(patch)) delete propre[cle as keyof Patch];
      return { ...current, [project.id]: propre };
    });
    return false;
  });
  const changed = useStableCallback(() => onChanged());
  const quoteWritten = useStableCallback((quote: Quote) => onQuote?.(quote));

  if (projects.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {canWrite && <NewProjectButton onClick={() => setCreating(true)} />}
        <Card className="gap-0 py-4">
          {/*
            Le cycle se montre même vide : la frise grise dit d'un coup d'œil
            ce qu'on va suivre. C'est la **même** frise que partout ailleurs,
            lue sur une affaire qui n'existe pas encore, et non un dessin refait
            pour l'occasion.
          */}
          <div className="px-4">
            <ProjectCycle points={cycleVide(now)} />
          </div>
          <EmptyState
            title="Aucune affaire"
            description="Créez une affaire pour y suivre ce cycle, du premier appel à la commande des matériaux."
          />
        </Card>
        {creating && (
          <ProjectDialog
            customerId={customer.id}
            open
            onOpenChange={setCreating}
            onSaved={onChanged}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {canWrite && (
        <div className="flex justify-end">
          <NewProjectButton onClick={() => setCreating(true)} />
        </div>
      )}

      {/*
        L'échec d'une écriture de jalon se lisait nulle part : la surcouche
        optimiste se défaisait, la case revenait où elle était, et rien ne
        disait pourquoi.
      */}
      {saveJalons.error && <ErrorNotice message={saveJalons.error} />}

      {projects.map((project, index) => (
        <ProjectBlock
          /*
            L'affaire désignée par l'adresse fait partie de la clé : une autre
            affaire de la même fiche, choisie depuis la recherche, remonte son
            bloc — ouvert, sur son onglet — au lieu de défiler jusqu'à un
            en-tête resté fermé.
          */
          key={project.id === focus.affaire ? `${project.id}@${focus.onglet ?? ""}` : project.id}
          customer={customer}
          project={project}
          quotes={quotesByProject.get(project.id) ?? NONE}
          interactions={interactionsByProject.get(project.id) ?? NONE}
          optimistic={optimiste[project.id]}
          saving={(enVol[project.id] ?? 0) > 0}
          now={now}
          canWrite={canWrite}
          canWriteQuotes={canWriteQuotes}
          // La première affaire s'ouvre : sur la majorité des fiches il n'y en
          // a qu'une, et la refermer d'office ferait un clic pour rien.
          defaultOpen={focus.affaire ? project.id === focus.affaire : index === 0}
          focused={project.id === focus.affaire}
          initialTab={project.id === focus.affaire ? focus.onglet : null}
          onOverride={poserJalon}
          onAddQuote={setQuoteFor}
          onEdit={setEditing}
          onChanged={changed}
          onQuote={onQuote ? quoteWritten : undefined}
        />
      ))}

      {/* Les boîtes ne sont montées qu'ouvertes : fermer repart d'un état neuf. */}
      {creating && (
        <ProjectDialog customerId={customer.id} open onOpenChange={setCreating} onSaved={onChanged} />
      )}
      {editing && (
        <ProjectDialog
          key={editing.id}
          customerId={customer.id}
          project={editing}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChanged();
          }}
        />
      )}
      {quoteFor && (
        <QuoteDialog
          key={quoteFor.id}
          project={quoteFor}
          onOpenChange={(open) => !open && setQuoteFor(null)}
          onSaved={onChanged}
        />
      )}
    </div>
  );
}

/**
 * La frise d'une affaire qui n'existe pas encore.
 *
 * Elle passe par `readCycle` comme toutes les autres : une affaire vide, aucun
 * devis, aucun échange, aucun jalon. Dessiner dix ronds gris à la main aurait
 * été plus court et faux au premier cran ajouté.
 */
function cycleVide(now: number): CyclePoint[] {
  return readCycle(
    {
      id: "",
      label: "",
      stage: "demande_recue",
      outcome: null,
      started_at: null,
      closed_at: null,
    } as Project,
    [],
    [],
    EMPTY_JALONS,
    now,
    undefined,
    EMPTY_MARKS,
  );
}

function NewProjectButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="sm" variant="outline" onClick={onClick} data-demo="project-new">
      <PlusIcon />
      Nouvelle affaire
    </Button>
  );
}
