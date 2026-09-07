"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckSquareIcon,
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
  CUSTOMER_STATUS,
  PROJECT_STAGE,
  QUOTE_STATUS,
  type Tone,
} from "@/modules/customers";
import { TASK_STATUS } from "@/modules/tasks";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { HUE } from "@/shared/ui/hue";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS, type Hue } from "../lib/navigation";
import { search, type Hit, type SearchResult } from "../lib/search";

/** En deçà, on ne dérange pas le serveur : la palette montre la navigation. */
const MIN_QUERY = 2;

type Entry = Hit & { icon: LucideIcon; hue: Hue; badgeTone?: Tone };
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
 * **Chaque section porte la teinte de son module**, la même que dans la barre
 * latérale : une liste de vingt résultats gris demande de lire chaque ligne
 * pour savoir de quoi elle parle.
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

  // La liste dépasse la fenêtre dès qu'on cherche : sans cela, la flèche bas
  // déplace un curseur qu'on ne voit plus.
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${cursor}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [cursor, listKey]);

  function moveCursor(index: number) {
    // La liste boucle : arrivé en bas, la flèche revient en tête plutôt que de
    // ne rien faire.
    const total = flat.length;
    if (total === 0) return;
    setPointer({ listKey, index: (index + total) % total });
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
        className="bg-background text-muted-foreground hover:border-brand-text/40 hover:text-foreground focus-visible:ring-ring flex h-7 w-full max-w-72 items-center gap-2 rounded-lg border px-2.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <SearchIcon className="size-3.5 shrink-0" />
        <span className="truncate">Rechercher</span>
        <kbd className="border-border bg-muted text-muted-foreground ml-auto hidden rounded-sm border px-1 py-px font-sans text-[10px] leading-4 sm:inline-block">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-[12%] max-w-xl translate-y-0 gap-0 overflow-hidden rounded-xl p-0"
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

          <div className="flex h-12 items-center gap-2.5 border-b px-3.5">
            <SearchIcon className="text-brand-text size-4 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Client, affaire, devis, tâche, courriel…"
              className="placeholder:text-muted-foreground/70 h-full w-full bg-transparent text-sm outline-none"
            />
            {loading && (
              <span className="border-brand-text/30 border-t-brand-text size-3.5 shrink-0 animate-spin rounded-full border-2" />
            )}
          </div>

          <div ref={listRef} className="max-h-[24rem] overflow-y-auto p-2">
            {flat.length === 0 ? (
              <p className="text-muted-foreground px-2 py-10 text-center text-sm">
                {loading
                  ? "Recherche…"
                  : `Rien ne correspond à « ${trimmed} »`}
              </p>
            ) : (
              groups.map((group) => (
                <div key={group.key} className="mb-2 last:mb-0">
                  <p className="text-muted-foreground/70 flex items-center gap-1.5 px-1.5 pb-1 text-[11px] font-medium">
                    {group.label}
                    <span className="tabular-nums opacity-60">
                      {group.entries.length}
                    </span>
                  </p>
                  {group.entries.map((entry) => {
                    const index = flat.indexOf(entry);
                    const Icon = entry.icon;
                    const teinte = HUE[entry.hue];
                    const actif = index === cursor;
                    return (
                      <button
                        key={`${group.key}:${entry.id}`}
                        type="button"
                        data-index={index}
                        onMouseEnter={() => moveCursor(index)}
                        onClick={() => go(entry)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors",
                          actif && "bg-accent",
                        )}
                      >
                        {/* La pastille reprend la teinte du module : on sait de
                            quoi parle la ligne avant de l'avoir lue. */}
                        <span
                          className={cn(
                            "flex size-7 shrink-0 items-center justify-center rounded-md",
                            teinte.soft,
                            teinte.text,
                          )}
                        >
                          <Icon className="size-3.5" />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{entry.title}</span>
                          {entry.hint && (
                            <span className="text-muted-foreground/70 block truncate text-[11px]">
                              {entry.hint}
                            </span>
                          )}
                        </span>

                        {entry.badge && (
                          <span
                            className={cn(
                              "shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-medium",
                              entry.badgeTone
                                ? TONE_CLASS[entry.badgeTone]
                                : "text-muted-foreground/70",
                            )}
                          >
                            {entry.badge}
                          </span>
                        )}
                        <CornerDownLeftIcon
                          className={cn(
                            "text-muted-foreground/50 size-3 shrink-0",
                            !actif && "invisible",
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Le pied dit ce que fait le clavier. Sans lui, la palette se
              parcourt à la souris — et une palette qu'on parcourt à la souris
              ne vaut pas mieux qu'un menu. */}
          <div className="text-muted-foreground/70 bg-muted/40 flex items-center gap-4 border-t px-3.5 py-2 text-[11px]">
            <Touche signe="↑↓">naviguer</Touche>
            <Touche signe="⏎">ouvrir</Touche>
            <Touche signe="esc">fermer</Touche>
            {flat.length > 0 && (
              <span className="ml-auto tabular-nums">
                {flat.length} résultat{flat.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Touche({ signe, children }: { signe: string; children: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <kbd className="border-border bg-background rounded-sm border px-1 py-px font-sans leading-4">
        {signe}
      </kbd>
      {children}
    </span>
  );
}

const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-neutral-soft text-neutral",
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

/** Traduit un identifiant d'énumération, ou le rend tel quel s'il est inconnu. */
function libelle(
  table: Record<string, { label: string; tone: Tone }>,
  value: string,
): { badge: string; badgeTone?: Tone } {
  const entry = table[value];
  return entry ? { badge: entry.label, badgeTone: entry.tone } : { badge: value };
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

  /*
    Chaque section reprend la teinte et l'icône de son module, et traduit son
    étiquette : le serveur transporte des identifiants ASCII stables
    (« devis_envoye »), le français vit dans les dictionnaires du module. Sans
    cette traduction la palette affichait le slug brut.
  */
  const sections: Array<{
    key: string;
    label: string;
    hits: Hit[] | null;
    icon: LucideIcon;
    hue: Hue;
    badge?: (value: string) => { badge: string; badgeTone?: Tone };
  }> = [
    {
      key: "customers", label: "Fiches client", hits: data.customers,
      icon: FileTextIcon, hue: "indigo",
      badge: (v) => libelle(CUSTOMER_STATUS, v),
    },
    {
      key: "projects", label: "Affaires", hits: data.projects,
      icon: HardHatIcon, hue: "amber",
      badge: (v) => libelle(PROJECT_STAGE, v),
    },
    {
      key: "quotes", label: "Devis et factures", hits: data.quotes,
      icon: ReceiptEuroIcon, hue: "jade",
      badge: (v) => libelle(QUOTE_STATUS, v),
    },
    {
      key: "tasks", label: "Tâches", hits: data.tasks,
      icon: CheckSquareIcon, hue: "grass",
      badge: (v) => libelle(TASK_STATUS, v),
    },
    {
      // Le courriel porte une date, pas une énumération : elle reste telle
      // quelle, sans tonalité.
      key: "messages", label: "Courriels", hits: data.messages,
      icon: MailIcon, hue: "cyan",
    },
  ];

  for (const section of sections) {
    if (!section.hits || section.hits.length === 0) continue;
    groups.push({
      key: section.key,
      label: section.label,
      entries: section.hits.map((hit) => ({
        ...hit,
        ...(section.badge && hit.badge ? section.badge(hit.badge) : {}),
        icon: section.icon,
        hue: section.hue,
      })),
    });
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
      hue: item.hue,
    })),
  ).filter((entry) => besoin === "" || entry.title.toLowerCase().includes(besoin));

  if (ecrans.length > 0) {
    groups.push({ key: "nav", label: "Aller à", entries: ecrans });
  }

  const actions: Entry[] = [
    ...(canCreate
      ? [{
          id: "new", title: "Nouvelle fiche", hint: "", badge: "",
          href: "/customers/nouveau", icon: PlusIcon, hue: "indigo" as Hue,
        }]
      : []),
    ...(canImport
      ? [{
          id: "import", title: "Synchronisation Excel", hint: "", badge: "",
          href: "/customers/import", icon: UploadIcon, hue: "indigo" as Hue,
        }]
      : []),
  ].filter((entry) => besoin === "" || entry.title.toLowerCase().includes(besoin));

  if (actions.length > 0) {
    groups.push({ key: "actions", label: "Actions", entries: actions });
  }

  return groups;
}
