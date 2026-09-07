"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  CornerDownLeftIcon,
  FileTextIcon,
  HardHatIcon,
  MailIcon,
  PlusIcon,
  ReceiptEuroIcon,
  SearchIcon,
  UploadIcon,
  type LucideIcon,
} from "lucide-react";
import { usePermission } from "@/modules/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS } from "../lib/navigation";
import { search, type Hit, type SearchResult } from "../lib/search";

/** En deçà, on ne dérange pas le serveur : la palette montre la navigation. */
const MIN_QUERY = 2;

type Entry = Hit & { icon: LucideIcon };
type Group = { key: string; label: string; entries: Entry[] };

const VIDE: SearchResult = {
  customers: null, projects: null, quotes: null, tasks: null, messages: null,
};

/**
 * La palette de commandes — ⌘K, ou le champ de la barre du haut.
 *
 * **Elle cherche partout.** Fiches, affaires, devis, tâches, courriels : cinq
 * sources en un appel, et le serveur n'interroge que celles auxquelles le rôle
 * courant a droit. Chercher « DE2026-0092 » trouve le devis ; « mur porteur »
 * trouve les affaires *et* les demandes reçues par courriel.
 *
 * **À vide, elle ne montre pas le vide.** La navigation complète du CRM y est
 * toujours, filtrée en local : la palette sert autant à aller quelque part
 * qu'à trouver quelque chose, et une palette qui ne répond rien tant qu'on n'a
 * pas tapé deux lettres apprend à ne pas s'ouvrir.
 *
 * Comme `useCustomers`, elle ne garde qu'une réponse *avec la question qui l'a
 * produite* : « en cours » et « résultats affichés » s'en déduisent, aucun état
 * à resynchroniser — et une réponse lente ne peut pas se coller sous une frappe
 * plus récente.
 */
export function CommandSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [resolved, setResolved] = useState<{ key: string; data: SearchResult }>({
    key: "", data: VIDE,
  });

  const canCreate = usePermission("customers:write");
  const canImport = usePermission("imports:run");

  const trimmed = query.trim();
  const key = trimmed.length < MIN_QUERY ? "" : trimmed;
  const loading = key !== "" && resolved.key !== key;
  const data = resolved.key === key ? resolved.data : VIDE;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) {
        return;
      }
      event.preventDefault();
      setOpen((current) => !current);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (key === "") return;

    const controller = new AbortController();
    // Deux cents millisecondes : le temps d'une frappe rapide. En deçà on
    // interroge le serveur pour des mots qui n'existeront plus à la lettre
    // suivante.
    const timer = setTimeout(() => {
      search(key, controller.signal)
        .then((data) => setResolved({ key, data }))
        .catch(() => {
          if (controller.signal.aborted) return;
          setResolved({ key, data: VIDE });
        });
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key]);

  const groups = buildGroups({ key, data, canCreate, canImport });
  const flat = groups.flatMap((group) => group.entries);

  /*
   * Le curseur est rangé avec la liste qu'il désigne. Une liste renouvelée
   * (autre requête, autre réponse) rend l'index caduc et le ramène en tête,
   * sans effet de resynchronisation.
   */
  const listKey = `${key}#${resolved.key}#${flat.length}`;
  const [pointer, setPointer] = useState({ listKey: "", index: 0 });
  const cursor =
    pointer.listKey === listKey
      ? Math.min(pointer.index, Math.max(flat.length - 1, 0))
      : 0;

  function moveCursor(index: number) {
    setPointer({ listKey, index: Math.min(Math.max(index, 0), flat.length - 1) });
  }

  function go(entry: Entry | undefined) {
    if (!entry) return;
    setOpen(false);
    setQuery("");
    router.push(entry.href);
  }

  return (
    <>
      {/*
        Le déclencheur a l'air d'un champ et n'en est pas un : la saisie se fait
        dans la boîte de dialogue, où vivent le curseur et le clavier. Deux
        champs à tenir synchronisés perdraient une frappe sur deux à
        l'ouverture.
      */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring flex h-7 w-full max-w-80 items-center gap-2 rounded-md border px-2 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <SearchIcon className="size-3.5 shrink-0" />
        <span className="truncate">Rechercher</span>
        <kbd className="border-border bg-background ml-auto hidden rounded-md border px-1 py-px font-sans text-[10px] leading-4 sm:inline-block">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-[12%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0"
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              moveCursor(cursor + 1);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              moveCursor(cursor - 1);
            } else if (event.key === "Enter") {
              event.preventDefault();
              go(flat[cursor]);
            }
          }}
        >
          <DialogTitle className="sr-only">Recherche</DialogTitle>
          <DialogDescription className="sr-only">
            Chercher une fiche, une affaire, un devis, une tâche ou un courriel,
            ou aller directement à un écran.
          </DialogDescription>

          <div className="flex h-12 items-center gap-2 border-b px-3">
            <SearchIcon className="text-muted-foreground size-4 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Client, affaire, devis, tâche, courriel…"
              className="placeholder:text-muted-foreground h-full w-full bg-transparent text-sm outline-none"
            />
            {loading && (
              <span className="text-muted-foreground/60 shrink-0 text-[11px]">
                recherche…
              </span>
            )}
          </div>

          <div className="max-h-[26rem] overflow-y-auto p-1.5">
            {flat.length === 0 ? (
              <p className="text-muted-foreground px-2 py-8 text-center text-sm">
                {loading ? "Recherche…" : `Rien pour « ${trimmed} »`}
              </p>
            ) : (
              groups.map((group) => (
                <div key={group.key} className="mb-1 last:mb-0">
                  <p className="text-muted-foreground/70 px-2 py-1.5 text-[11px] font-medium">
                    {group.label}
                  </p>
                  {group.entries.map((entry) => {
                    const index = flat.indexOf(entry);
                    const Icon = entry.icon;
                    return (
                      <button
                        key={`${group.key}:${entry.id}`}
                        type="button"
                        onMouseEnter={() => moveCursor(index)}
                        onClick={() => go(entry)}
                        className={cn(
                          "flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-left text-sm",
                          index === cursor && "bg-accent text-accent-foreground",
                        )}
                      >
                        <Icon className="text-muted-foreground size-4 shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{entry.title}</span>
                          {entry.hint && (
                            <span className="text-muted-foreground/70 block truncate text-[11px]">
                              {entry.hint}
                            </span>
                          )}
                        </span>
                        {entry.badge && (
                          <span className="text-muted-foreground/60 shrink-0 text-[11px]">
                            {entry.badge}
                          </span>
                        )}
                        {index === cursor && (
                          <CornerDownLeftIcon className="text-muted-foreground/50 size-3 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * L'ordre des sections est celui de l'intention.
 *
 * Ce qu'on a cherché vient avant où l'on peut aller : quand on tape un nom de
 * client, on veut la fiche, pas l'écran des fiches. La navigation ferme la
 * marche, toujours présente, jamais en travers.
 */
function buildGroups({
  key,
  data,
  canCreate,
  canImport,
}: {
  key: string;
  data: SearchResult;
  canCreate: boolean;
  canImport: boolean;
}): Group[] {
  const groups: Group[] = [];

  const sections: Array<[string, string, Hit[] | null, LucideIcon]> = [
    ["customers", "Fiches client", data.customers, FileTextIcon],
    ["projects", "Affaires", data.projects, HardHatIcon],
    ["quotes", "Devis et factures", data.quotes, ReceiptEuroIcon],
    ["tasks", "Tâches", data.tasks, ArrowRightIcon],
    ["messages", "Courriels", data.messages, MailIcon],
  ];

  for (const [k, label, hits, icon] of sections) {
    if (!hits || hits.length === 0) continue;
    groups.push({ key: k, label, entries: hits.map((hit) => ({ ...hit, icon })) });
  }

  // La navigation, filtrée en local : elle tient en dix entrées, l'envoyer au
  // serveur pour la filtrer serait un aller-retour pour rien.
  const besoin = key.toLowerCase();
  const ecrans: Entry[] = NAV_SECTIONS.flatMap((section) =>
    section.items.map((item) => ({
      id: item.href,
      title: item.label,
      hint: section.label,
      href: item.href,
      badge: "",
      icon: item.icon,
    })),
  ).filter((entry) => besoin === "" || entry.title.toLowerCase().includes(besoin));

  if (ecrans.length > 0) {
    groups.push({ key: "nav", label: "Aller à", entries: ecrans });
  }

  const actions: Entry[] = [
    ...(canCreate
      ? [{
          id: "new", title: "Nouvelle fiche", hint: "", badge: "",
          href: "/customers/nouveau", icon: PlusIcon,
        }]
      : []),
    ...(canImport
      ? [{
          id: "import", title: "Synchronisation Excel", hint: "", badge: "",
          href: "/customers/import", icon: UploadIcon,
        }]
      : []),
  ].filter((entry) => besoin === "" || entry.title.toLowerCase().includes(besoin));

  if (actions.length > 0) {
    groups.push({ key: "actions", label: "Actions", entries: actions });
  }

  return groups;
}
