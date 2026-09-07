"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ChevronRightIcon,
  ExternalLinkIcon,
  FileIcon,
  FolderIcon,
  HomeIcon,
  SearchIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorNotice } from "@/shared/ui/feedback";
import { formatDate, plural } from "@/shared/lib/format";
import { useListing } from "../hooks/use-drive";
import { looksLikeDeal, parseFolder } from "../lib/parse";
import type { DriveItem } from "../lib/types";

/**
 * L'arborescence OneDrive, telle qu'elle est.
 *
 * C'est l'outil de reprise : l'entreprise range ses affaires
 * `PARTAGE / 3. OMPT GROUPE / {année} / {MM-JJ-AAAA}_{client}`, et cette
 * arborescence est une meilleure liste de clients que les trente fiches issues
 * du classeur Excel — vingt-sept affaires pour la seule année 2026, dont une
 * seule correspond à une fiche existante.
 *
 * L'écran lit donc chaque nom de dossier et en extrait la date et le client,
 * pour préparer le rapprochement. Il ne crée rien : c'est de la matière à
 * regarder avant de décider.
 */
const START = "PARTAGE/3. OMPT GROUPE";

export function DriveExplorer() {
  const [path, setPath] = useState(START);
  const [filter, setFilter] = useState("");
  const { listing, loading, error } = useListing(path);

  const segments = path.split("/").filter(Boolean);
  const items = (listing?.items ?? []).filter((item) =>
    filter ? item.name.toLowerCase().includes(filter.toLowerCase()) : true,
  );
  const folders = items.filter((item) => item.folder);
  const files = items.filter((item) => !item.folder);

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex flex-col gap-3 border-b p-3">
        <nav className="flex flex-wrap items-center gap-1 text-xs" aria-label="Chemin">
          <Button size="xs" variant="ghost" onClick={() => setPath("")}>
            <HomeIcon className="size-3.5" />
            Racine
          </Button>
          {segments.map((segment, index) => (
            <span key={index} className="flex items-center gap-1">
              <ChevronRightIcon className="text-muted-foreground/50 size-3" />
              <Button
                size="xs"
                variant="ghost"
                className="font-normal"
                onClick={() => setPath(segments.slice(0, index + 1).join("/"))}
              >
                {segment}
              </Button>
            </span>
          ))}
          {path !== START && (
            <Button
              size="xs"
              variant="outline"
              className="ml-auto"
              onClick={() => setPath(START)}
            >
              Revenir à OMPT GROUPE
            </Button>
          )}
        </nav>

        <div className="relative">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            className="h-8 pl-8"
            placeholder="Filtrer ce dossier…"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        </div>
      </div>

      {error ? (
        <div className="p-3">
          <ErrorNotice message={error} />
        </div>
      ) : loading ? (
        <div className="flex flex-col gap-2 p-3">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="Dossier vide"
          description={
            filter
              ? "Aucune entrée ne correspond au filtre."
              : "Ce dossier ne contient rien, ou le compte raccordé n'y a pas accès."
          }
        />
      ) : (
        <>
          <div className="text-muted-foreground border-b px-3 py-2 text-xs">
            {plural(folders.length, "dossier")}
            {files.length > 0 && ` · ${plural(files.length, "fichier")}`}
          </div>

          <ul className="divide-y">
            {folders.map((item) => (
              <FolderRow key={item.id} item={item} onOpen={() => setPath(item.path.slice(1))} />
            ))}
            {files.map((item) => (
              <FileRow key={item.id} item={item} />
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

/**
 * Un dossier, avec ce que son nom dit.
 *
 * La date et le client sont extraits à l'affichage plutôt qu'enregistrés :
 * tant que le rapprochement n'est pas décidé, ce n'est qu'une lecture. Un
 * dossier qui ne suit pas la convention garde son nom brut, sans être écarté —
 * « 3 rue Danté » et « ARAM » sont de vraies affaires.
 */
function FolderRow({ item, onOpen }: { item: DriveItem; onOpen: () => void }) {
  const parsed = parseFolder(item.name);
  const deal = looksLikeDeal(item.name) && (parsed.date !== "" || parsed.client !== item.name);

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="hover:bg-muted/50 flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors"
      >
        <FolderIcon className="text-info size-4 shrink-0" />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="truncate text-sm font-medium">
              {deal ? parsed.client : item.name}
            </span>
            {parsed.aside && (
              <span className="text-muted-foreground bg-muted rounded-sm px-1.5 py-0.5 text-[0.65rem]">
                {parsed.aside}
              </span>
            )}
          </div>
          {deal && parsed.date && (
            <span className="text-muted-foreground/70 text-xs">
              {formatDate(parsed.date)} · {item.name}
            </span>
          )}
        </div>

        <span className="text-muted-foreground/70 shrink-0 text-xs tabular-nums">
          {item.child_count > 0 ? item.child_count : ""}
        </span>
        <ChevronRightIcon className="text-muted-foreground/50 size-4 shrink-0" />
      </button>
    </li>
  );
}

function FileRow({ item }: { item: DriveItem }) {
  return (
    <li className="flex items-center gap-3 px-3 py-2.5">
      <FileIcon className="text-muted-foreground size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">{item.name}</div>
        <div className="text-muted-foreground/70 text-xs">
          {weight(item.size)} · modifié le {formatDate(item.modified_at)}
        </div>
      </div>
      {/* Le contenu n'entre jamais dans le CRM : on ouvre chez Microsoft. */}
      <Button size="xs" variant="ghost" asChild>
        <Link href={item.web_url} target="_blank" rel="noreferrer">
          <ExternalLinkIcon />
          Ouvrir
        </Link>
      </Button>
    </li>
  );
}

/** « 214 ko », « 1,3 Mo » — la taille telle qu'on la dit. */
function weight(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} ko`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;
}
