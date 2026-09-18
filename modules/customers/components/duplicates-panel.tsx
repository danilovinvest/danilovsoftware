"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, CheckIcon, MergeIcon } from "lucide-react";
import { usePermission } from "@/modules/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorNotice, Spinner } from "@/shared/ui/feedback";
import { Bar } from "@/shared/ui/loading";
import { errorMessage } from "@/shared/api/errors";
import { plural } from "@/shared/lib/format";
import { cn } from "@/lib/utils";
import * as api from "../lib/api";
import { CUSTOMER_STATUS } from "../lib/labels";
import { EnumBadge } from "./enum-badge";
import type { DuplicatePair, DuplicateSide } from "../lib/types";
import { customerHref } from "@/shared/lib/routes";

/**
 * Les fiches en double, et de quoi les fondre.
 *
 * Trois sources ont peuplé le CRM sans se connaître — le classeur Excel,
 * l'arborescence OneDrive de GROUPE, celle de STRUCTURE — et le même client y
 * figure parfois trois fois sous trois orthographes. Le rapprochement par
 * adresse ne les voit pas : ces fiches-là n'ont souvent pas d'adresse.
 *
 * **La machine propose, elle ne fusionne jamais seule.** Deux fiches très
 * ressemblantes peuvent être deux clients distincts — « AXIOLIS - 15 rue du
 * Près » et « AXIOLIS - 17 rue du Près » sont deux immeubles voisins, et seul
 * un humain le sait. C'est pour cela que chaque paire demande un clic, et que
 * le bouton dit **dans quel sens** la fusion se fait.
 *
 * Les compteurs sont là pour ça : on garde la fiche qui porte les affaires, pas
 * celle dont le nom est le mieux orthographié.
 */
export function DuplicatesPanel() {
  const canMerge = usePermission("customers:delete");
  const [pairs, setPairs] = useState<DuplicatePair[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, string>>({});

  const charger = useCallback(() => {
    api
      .listDuplicates()
      .then((page) => setPairs(page.items))
      .catch((cause) => {
        setError(errorMessage(cause));
        setPairs([]);
      });
  }, []);

  useEffect(charger, [charger]);

  async function fusionner(keep: DuplicateSide, drop: DuplicateSide) {
    const cle = keep.id + drop.id;
    setPending(cle);
    setError(null);
    try {
      await api.mergeCustomers(keep.id, drop.id);
      // La paire fusionnée reste à l'écran, barrée : la faire disparaître
      // ferait sauter la liste sous le curseur au moment précis où l'on
      // enchaîne les décisions.
      setDone((current) => ({ ...current, [cle]: keep.name }));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(null);
    }
  }

  if (pairs === null) {
    return (
      <Card className="flex flex-col gap-2 p-5">
        <Bar hue="indigo" className="h-5 w-1/3" />
        <Bar hue="indigo" className="h-12 w-full" />
        <Bar hue="indigo" className="h-12 w-full" />
      </Card>
    );
  }

  const restantes = pairs.filter(
    (pair) => !done[pair.left.id + pair.right.id] && !done[pair.right.id + pair.left.id],
  );

  return (
    <div className="flex flex-col gap-3">
      {error && <ErrorNotice message={error} />}

      {pairs.length === 0 ? (
        <Card className="py-0">
          <EmptyState
            title="Aucun doublon"
            description="Aucune paire de fiches ne se ressemble assez pour mériter un regard."
          />
        </Card>
      ) : (
        <>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {plural(restantes.length, "paire")} à trancher. Fusionner déplace
            affaires, devis, échanges, courriels, événements et tâches vers la
            fiche gardée, complète ses champs vides avec ce que l&apos;autre
            savait — <strong>sans jamais écraser</strong> — et archive
            l&apos;absorbée. Deux noms proches ne sont pas toujours le même
            client : deux immeubles voisins se ressemblent beaucoup.
          </p>

          {pairs.map((pair) => {
            const cle = pair.left.id + pair.right.id;
            const fusionnee = done[cle];
            return (
              <Card
                key={cle}
                className={cn("gap-0 p-3", fusionnee && "opacity-60")}
              >
                <div className="flex items-center justify-between gap-2 pb-2">
                  <span className="text-muted-foreground text-[11px]">
                    {Math.round(pair.score * 100)} % de ressemblance
                  </span>
                  {fusionnee && (
                    <span className="text-success flex items-center gap-1 text-[11px] font-medium">
                      <CheckIcon className="size-3" />
                      Fusionnées dans « {fusionnee} »
                    </span>
                  )}
                </div>

                <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
                  <Fiche side={pair.left} />
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    {canMerge && !fusionnee ? (
                      <>
                        <Bouton
                          titre={`Garder « ${pair.left.name} »`}
                          sens="gauche"
                          pending={pending === cle}
                          onClick={() => fusionner(pair.left, pair.right)}
                        />
                        <Bouton
                          titre={`Garder « ${pair.right.name} »`}
                          sens="droite"
                          pending={pending === cle}
                          onClick={() => fusionner(pair.right, pair.left)}
                        />
                      </>
                    ) : (
                      <MergeIcon className="text-muted-foreground/40 size-4" />
                    )}
                  </div>
                  <Fiche side={pair.right} />
                </div>
              </Card>
            );
          })}
        </>
      )}
    </div>
  );
}

/**
 * Le bouton dit **ce qui reste**, pas « fusionner ».
 *
 * « Fusionner » ne dit pas dans quel sens, et c'est la seule chose qui compte
 * ici : l'une des deux fiches disparaît. La flèche montre où va le contenu.
 */
function Bouton({
  titre,
  sens,
  pending,
  onClick,
}: {
  titre: string;
  sens: "gauche" | "droite";
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 w-full justify-center gap-1.5 text-[11px] whitespace-nowrap"
      disabled={pending}
      onClick={onClick}
      title={titre}
    >
      {pending ? (
        <Spinner className="size-3" />
      ) : (
        <ArrowRightIcon
          className={cn("size-3.5 shrink-0", sens === "gauche" && "rotate-180")}
        />
      )}
      Garder {sens === "gauche" ? "à gauche" : "à droite"}
    </Button>
  );
}

function Fiche({ side }: { side: DuplicateSide }) {
  const details = [side.email, side.phone, side.city].filter(Boolean);
  return (
    <div className="bg-muted/30 flex min-w-0 flex-col gap-1 rounded-lg border p-2.5">
      <span className="flex flex-wrap items-center gap-2">
        <Link
          href={customerHref(side.id)}
          className="hover:text-primary truncate text-sm font-medium"
        >
          {side.name}
        </Link>
        <EnumBadge value={side.status} entries={CUSTOMER_STATUS} />
      </span>
      {details.length > 0 && (
        <span className="text-muted-foreground/80 truncate text-[11px]">
          {details.join(" · ")}
        </span>
      )}
      {/* Les compteurs décident : on garde la fiche qui porte les affaires, pas
          celle dont le nom est le mieux orthographié. */}
      <span className="text-muted-foreground flex flex-wrap gap-x-3 text-[11px] tabular-nums">
        <span>{plural(side.projects, "affaire")}</span>
        <span>{plural(side.quotes, "devis", "devis")}</span>
        <span>{plural(side.mail, "courriel")}</span>
      </span>
    </div>
  );
}
