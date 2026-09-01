"use client";

import { useMemo, useState } from "react";
import { SearchIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, ErrorNotice, Skeleton } from "@/shared/ui/feedback";
import { formatRelative, initials } from "@/shared/lib/format";
import { useWorkspaceUsers } from "../hooks/use-settings";
import { SettingsPage, SettingsSection } from "./settings-page";

export function MembersPanel() {
  const { users, total, loading, error } = useWorkspaceUsers();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((user) =>
      [user.first_name, user.last_name, user.email, user.role_name]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [users, search]);

  return (
    <SettingsPage
      title="Membres"
      description="Les comptes qui ont accès à cet espace de travail."
    >
      <SettingsSection
        title="Comptes"
        description={
          loading ? undefined : `${total} compte${total > 1 ? "s" : ""}`
        }
        action={
          <div className="relative w-56">
            <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nom, e-mail, rôle…"
              className="pl-8"
            />
          </div>
        }
      >
        {error ? (
          <ErrorNotice message={error} />
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table className="[&_thead_th]:text-muted-foreground [&_thead_th]:h-8 [&_thead_th]:text-xs [&_thead_th]:font-medium">
              <TableHeader>
                <TableRow>
                  <TableHead>Membre</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Dernière connexion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }, (_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={4}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="p-0">
                      <EmptyState
                        title="Aucun membre ne correspond"
                        description="Élargissez la recherche."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((user) => {
                    const name =
                      [user.first_name, user.last_name].filter(Boolean).join(" ") ||
                      user.email;

                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span
                              aria-hidden
                              className="bg-muted text-foreground flex size-6 shrink-0 items-center justify-center rounded-[4px] text-[10px] font-semibold"
                            >
                              {initials(name)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{name}</p>
                              <p className="text-muted-foreground truncate text-xs">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-info-soft text-info rounded-[4px]">
                            {user.role_name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.is_active ? (
                            <Badge className="bg-success-soft text-success rounded-[4px]">
                              Actif
                            </Badge>
                          ) : (
                            <Badge className="bg-neutral-soft text-neutral rounded-[4px]">
                              Désactivé
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-right text-xs">
                          {user.last_login_at
                            ? formatRelative(user.last_login_at)
                            : "jamais"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </SettingsSection>
    </SettingsPage>
  );
}
