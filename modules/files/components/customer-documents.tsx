"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ChevronRightIcon,
  ExternalLinkIcon,
  FileIcon,
  FolderIcon,
  FolderOpenIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ListSkeleton } from "@/shared/ui/loading";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { formatAgo, plural } from "@/shared/lib/format";
import { useListing } from "../hooks/use-drive";
import { weight } from "../lib/weight";
import { PreviewButton } from "./document-preview";
import type { DriveItem } from "../lib/types";

/**
 * Les documents d'une fiche : le dossier OneDrive de chaque affaire, lu en
 * direct.
 *
 * La copie relie une affaire à son dossier et en tire les devis toutes les
 * cinq minutes — et la fiche n'en montrait rien. Le dirigeant déposait un PDF,
 * ouvrait la fiche, ne le voyait nulle part, et en concluait que rien ne se
 * synchronisait.
 *
 * **En direct, sans table.** Le dossier est interrogé à l'ouverture de
 * l'onglet, jamais avant : le fichier déposé à l'instant est en première ligne
 * sans attendre le tour de copie, et une liste qui vient de Microsoft ne peut
 * pas être en retard sur Microsoft. Une table de fichiers aurait été fausse
 * par construction — le delta n'est pas exhaustif, un renommage y laisserait
 * un doublon — pour un contenu que personne ne cherche dans le CRM.
 *
 * Les sous-dossiers se déplient **un niveau à la fois**, et ne sont lus qu'au
 * clic (issue 59). Ils n'étaient pas descendus du tout — « Photos · 312
 * éléments » et un lien vers OneDrive —, si bien qu'un plan rangé dans
 * `Plans/` restait invisible depuis la fiche. Tout lire d'avance coûterait un
 * appel Graph par dossier pour des contenus que personne n'ouvre ; chaque
 * dossier déplié passe par le même cache que la liste du dessus, et son
 * contenu est décalé sous lui, pour qu'on sache toujours où l'on est.
 */
export type DocumentedProject = {
  id: string;
  label: string;
  drive_path: string;
};

export function CustomerDocuments({ projects }: { projects: DocumentedProject[] }) {
  // Figée au montage : « il y a 4 min » se lit à l'ouverture de l'onglet,
  // et l'onglet se remonte à chaque ouverture.
  const [now] = useState(() => Date.now());
  const linked = projects.filter((project) => project.drive_path !== "");

  if (linked.length === 0) {
    return (
      <Card>
        <EmptyState
          title="Aucun dossier OneDrive relié"
          description="La copie relie une affaire à son dossier quand elle le rencontre dans l'arborescence de l'entreprise. Cette fiche n'en a pas encore."
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {projects.map((project) =>
        project.drive_path ? (
          <ProjectFolder key={project.id} project={project} now={now} />
        ) : (
          <p key={project.id} className="text-muted-foreground px-1 text-xs">
            {project.label} — pas de dossier OneDrive relié.
          </p>
        ),
      )}
    </div>
  );
}

/** Les dossiers d'abord, puis les fichiers, le plus récent en tête : c'est ce qu'on vient vérifier. */
function sortEntries(items: DriveItem[]) {
  return {
    folders: items.filter((item) => item.folder),
    files: items
      .filter((item) => !item.folder)
      .sort((a, b) => b.modified_at.localeCompare(a.modified_at)),
  };
}

function ProjectFolder({ project, now }: { project: DocumentedProject; now: number }) {
  const { listing, loading, error, notFound } = useListing(project.drive_path);
  const items = listing?.items ?? [];
  const { folders, files } = sortEntries(items);

  const resume = loading
    ? "Lecture du dossier…"
    : notFound || error
      ? project.drive_path
      : [
          plural(files.length, "fichier"),
          folders.length > 0 ? plural(folders.length, "sous-dossier") : "",
          "lu à l'instant dans OneDrive",
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{project.label}</p>
          <p className="text-muted-foreground truncate text-xs">{resume}</p>
        </div>
        {listing?.folder?.web_url && (
          <Button size="xs" variant="outline" asChild>
            <Link href={listing.folder.web_url} target="_blank" rel="noreferrer">
              <FolderOpenIcon />
              Ouvrir le dossier
            </Link>
          </Button>
        )}
      </div>

      {loading ? (
        <div className="border-t">
          <ListSkeleton rows={3} hue="indigo" />
        </div>
      ) : notFound ? (
        <p className="text-muted-foreground border-t px-4 py-3 text-xs">
          Dossier introuvable — il a peut-être été renommé ou déplacé dans
          l&apos;Explorateur. La copie le reliera de nouveau à son prochain passage.
        </p>
      ) : error ? (
        <div className="border-t p-3">
          <ErrorNotice message={error} />
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground border-t px-4 py-3 text-xs">Dossier vide.</p>
      ) : (
        <ul className="divide-y border-t">
          <Entries parentPath={project.drive_path} items={items} depth={0} now={now} />
        </ul>
      )}
    </Card>
  );
}

/** Le décalage d'une ligne selon sa profondeur : le contenu d'un dossier se lit sous lui. */
function indent(depth: number) {
  return { paddingLeft: `${16 + depth * 20}px` };
}

/**
 * Les lignes d'un dossier.
 *
 * Le chemin d'un enfant se reconstruit depuis celui qu'on vient de lire, et non
 * depuis `item.path` : un dossier partagé rend le chemin du disque de son
 * propriétaire, que `/v1/files/browse` ne saurait pas relire.
 */
function Entries({
  parentPath,
  items,
  depth,
  now,
}: {
  parentPath: string;
  items: DriveItem[];
  depth: number;
  now: number;
}) {
  const { folders, files } = sortEntries(items);
  return (
    <>
      {folders.map((item, index) => (
        <SubfolderRow
          key={item.id}
          item={item}
          demo={depth === 0 && index === 0}
          path={`${parentPath}/${item.name}`}
          depth={depth}
          now={now}
        />
      ))}
      {files.map((item) => (
        <DocumentRow key={item.id} item={item} depth={depth} now={now} />
      ))}
    </>
  );
}

function SubfolderRow({
  item,
  demo,
  path,
  depth,
  now,
}: {
  item: DriveItem;
  /** Le premier sous-dossier de l'affaire porte la zone de la démo. */
  demo: boolean;
  path: string;
  depth: number;
  now: number;
}) {
  const [open, setOpen] = useState(false);
  const empty = item.child_count === 0;
  return (
    <>
      <li
        data-demo={demo ? "documents-subfolder" : undefined}
        className="flex items-center gap-3 py-2.5 pr-4"
        style={indent(depth)}
      >
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          disabled={empty}
          aria-expanded={open}
          title={empty ? "Dossier vide" : open ? `Replier ${item.name}` : `Déplier ${item.name}`}
          className="hover:text-primary flex min-w-0 flex-1 items-center gap-2 text-left disabled:cursor-default disabled:hover:text-current"
        >
          <ChevronRightIcon
            className={cn(
              "text-muted-foreground size-3.5 shrink-0 transition-transform",
              open && "rotate-90",
              empty && "opacity-0",
            )}
          />
          {open ? (
            <FolderOpenIcon className="text-info size-4 shrink-0" />
          ) : (
            <FolderIcon className="text-info size-4 shrink-0" />
          )}
          <span className="min-w-0">
            <span className="block truncate text-sm">{item.name}</span>
            <span className="text-muted-foreground/70 block text-xs">
              {plural(item.child_count, "élément")}
            </span>
          </span>
        </button>
        <OpenLink href={item.web_url} />
      </li>
      {open && <SubfolderContents path={path} depth={depth + 1} now={now} />}
    </>
  );
}

/** Le contenu d'un sous-dossier, lu au premier dépliage et gardé dans le cache partagé. */
function SubfolderContents({ path, depth, now }: { path: string; depth: number; now: number }) {
  const { listing, loading, error, notFound } = useListing(path);
  const message = loading
    ? "Lecture du dossier…"
    : notFound
      ? "Dossier introuvable — il a peut-être été renommé ou déplacé."
      : error
        ? error
        : listing && listing.items.length === 0
          ? "Dossier vide."
          : null;

  if (message || !listing) {
    return (
      <li
        className={cn("py-2 pr-4 text-xs", error && !notFound ? "text-danger" : "text-muted-foreground")}
        style={indent(depth)}
      >
        {message}
      </li>
    );
  }
  return <Entries parentPath={path} items={listing.items} depth={depth} now={now} />;
}

function DocumentRow({ item, depth, now }: { item: DriveItem; depth: number; now: number }) {
  return (
    <li className="flex items-center gap-3 py-2.5 pr-4" style={indent(depth)}>
      {/* L'emplacement du chevron d'un dossier : les noms restent alignés. */}
      <span className="size-3.5 shrink-0" />
      <FileIcon className="text-muted-foreground size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">{item.name}</div>
        <div className="text-muted-foreground/70 text-xs">
          {weight(item.size)} · modifié {formatAgo(item.modified_at, now)}
        </div>
      </div>
      <PreviewButton url={item.web_url} name={item.name} />
      <OpenLink href={item.web_url} />
    </li>
  );
}

/** Le contenu n'entre jamais dans le CRM : on ouvre chez Microsoft. */
function OpenLink({ href }: { href: string }) {
  if (!href) return null;
  return (
    <Button size="xs" variant="ghost" asChild>
      <Link href={href} target="_blank" rel="noreferrer" title="Ouvrir dans OneDrive">
        <ExternalLinkIcon />
        Ouvrir
      </Link>
    </Button>
  );
}
