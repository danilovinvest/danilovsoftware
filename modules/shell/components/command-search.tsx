"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileTextIcon,
  PlusIcon,
  SearchIcon,
  UploadIcon,
  type LucideIcon,
} from "lucide-react";
import { usePermission } from "@/modules/auth";
import { listCustomers, type CustomerListItem } from "@/modules/customers";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type Entry = {
  key: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  href: string;
};

/**
 * Recherche globale au ⌘K, reprise du menu de commandes de Twenty.
 *
 * Le déclencheur vit dans la barre latérale, juste sous l'espace de travail, et
 * la boîte de dialogue se téléporte au niveau du body : les deux tiennent dans
 * un seul composant pour que le raccourci clavier et le bouton ne puissent pas
 * diverger.
 *
 * À vide, le menu propose les actions du module ; dès deux caractères il
 * interroge les fiches. La requête précédente est annulée à chaque frappe —
 * même précaution que `useCustomers`, une réponse lente ne doit pas écraser la
 * plus récente.
 */
export function CommandSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const canCreate = usePermission("customers:write");
  const canImport = usePermission("imports:run");

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

  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const timer = setTimeout(() => {
      listCustomers(
        { search: trimmed, sort: "recent", page: 1, per_page: 7 },
        controller.signal,
      )
        .then((page) => {
          setResults(page.items);
          setLoading(false);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setResults([]);
          setLoading(false);
        });
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  const actions: Entry[] = [
    ...(canCreate
      ? [
          {
            key: "new",
            label: "Nouvelle fiche",
            icon: PlusIcon,
            href: "/customers/nouveau",
          },
        ]
      : []),
    {
      key: "all",
      label: "Toutes les fiches",
      icon: FileTextIcon,
      href: "/customers",
    },
    ...(canImport
      ? [
          {
            key: "import",
            label: "Synchronisation Excel",
            icon: UploadIcon,
            href: "/customers/import",
          },
        ]
      : []),
  ];

  const entries: Entry[] =
    trimmed.length < 2
      ? actions
      : results.map((customer) => ({
          key: customer.id,
          label: customer.display_name,
          hint: [customer.reference, customer.city].filter(Boolean).join(" · "),
          icon: FileTextIcon,
          href: `/customers/${customer.id}`,
        }));

  // Le curseur revient en tête dès que la liste change : garder l'index d'une
  // liste plus longue sélectionnerait le vide.
  useEffect(() => setCursor(0), [trimmed, results]);

  function go(entry: Entry | undefined) {
    if (!entry) return;
    setOpen(false);
    setQuery("");
    router.push(entry.href);
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            className="h-8 gap-2 px-1.5"
            tooltip="Rechercher"
            onClick={() => setOpen(true)}
          >
            <SearchIcon className="text-muted-foreground" />
            <span>Rechercher</span>
            <kbd className="text-muted-foreground border-sidebar-border bg-background ml-auto hidden rounded-[4px] border px-1 py-px font-sans text-[10px] leading-4 group-data-[collapsible=icon]:hidden md:inline-block">
              ⌘K
            </kbd>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-[20%] max-w-lg translate-y-0 gap-0 overflow-hidden p-0"
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setCursor((index) => Math.min(index + 1, entries.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setCursor((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              go(entries[cursor]);
            }
          }}
        >
          <DialogTitle className="sr-only">Recherche</DialogTitle>
          <DialogDescription className="sr-only">
            Rechercher une fiche client ou lancer une action.
          </DialogDescription>

          <div className="flex h-11 items-center gap-2 border-b px-3">
            <SearchIcon className="text-muted-foreground size-4 shrink-0" />
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher une fiche…"
              className="placeholder:text-muted-foreground h-full w-full bg-transparent text-sm outline-none"
            />
          </div>

          <div className="max-h-80 overflow-y-auto p-1.5">
            <p className="text-muted-foreground px-2 py-1.5 text-[11px] font-medium">
              {trimmed.length < 2 ? "Actions" : "Fiches client"}
            </p>

            {entries.length === 0 ? (
              <p className="text-muted-foreground px-2 py-6 text-center text-sm">
                {loading ? "Recherche…" : "Aucun résultat"}
              </p>
            ) : (
              entries.map((entry, index) => {
                const Icon = entry.icon;
                return (
                  <button
                    key={entry.key}
                    type="button"
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => go(entry)}
                    className={cn(
                      "flex h-8 w-full items-center gap-2 rounded-[4px] px-2 text-left text-sm",
                      index === cursor && "bg-accent text-accent-foreground",
                    )}
                  >
                    <Icon className="text-muted-foreground size-4 shrink-0" />
                    <span className="truncate">{entry.label}</span>
                    {entry.hint && (
                      <span className="text-muted-foreground ml-auto truncate text-xs">
                        {entry.hint}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
