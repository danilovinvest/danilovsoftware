"use client";

import Link from "next/link";
import { useState } from "react";
import { ExternalLinkIcon, FileIcon, FolderIcon, FolderOpenIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ListSkeleton } from "@/shared/ui/loading";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { formatAgo, plural } from "@/shared/lib/format";
import { useListing } from "../hooks/use-drive";
import { weight } from "../lib/weight";
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
 * Les sous-dossiers ne sont pas descendus : « Photos · 312 éléments » et un
 * lien suffisent, on ne recopie pas trois cents vignettes pour dire qu'il y a
 * des photos.
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

function ProjectFolder({ project, now }: { project: DocumentedProject; now: number }) {
  const { listing, loading, error, notFound } = useListing(project.drive_path);
  const items = listing?.items ?? [];
  const folders = items.filter((item) => item.folder);
  // Le plus récent en tête : c'est ce qu'on vient vérifier.
  const files = items
    .filter((item) => !item.folder)
    .sort((a, b) => b.modified_at.localeCompare(a.modified_at));

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
          {folders.map((item) => (
            <SubfolderRow key={item.id} item={item} />
          ))}
          {files.map((item) => (
            <DocumentRow key={item.id} item={item} now={now} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function SubfolderRow({ item }: { item: DriveItem }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <FolderIcon className="text-info size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">{item.name}</div>
        <div className="text-muted-foreground/70 text-xs">{plural(item.child_count, "élément")}</div>
      </div>
      <OpenLink href={item.web_url} />
    </li>
  );
}

function DocumentRow({ item, now }: { item: DriveItem; now: number }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <FileIcon className="text-muted-foreground size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">{item.name}</div>
        <div className="text-muted-foreground/70 text-xs">
          {weight(item.size)} · modifié {formatAgo(item.modified_at, now)}
        </div>
      </div>
      <OpenLink href={item.web_url} />
    </li>
  );
}

/** Le contenu n'entre jamais dans le CRM : on ouvre chez Microsoft. */
function OpenLink({ href }: { href: string }) {
  if (!href) return null;
  return (
    <Button size="xs" variant="ghost" asChild>
      <Link href={href} target="_blank" rel="noreferrer">
        <ExternalLinkIcon />
        Ouvrir
      </Link>
    </Button>
  );
}
