"use client";

import Link from "next/link";
import {
  BanknoteIcon,
  CalendarPlusIcon,
  FileTextIcon,
  HourglassIcon,
  type LucideIcon,
} from "lucide-react";
import { ErrorNotice } from "@/shared/ui/feedback";
import { ListSkeleton } from "@/shared/ui/loading";
import { Panel, RowShell } from "@/shared/ui/panel";
import type { Tone } from "@/modules/customers";
import { formatAmount, plural } from "@/shared/lib/format";
import { alertTotal, type Alert } from "@/modules/worksites";
import type { AlertLists, Live } from "../hooks/use-live";
import { PanelMore } from "./parts";

/*
  Les quatre attentes d'après-signature, lues sur la base.

  Elles étaient tirées d'une empreinte de la référence du devis, « pondérées
  pour ressembler à une entreprise qui tourne » : le tableau de bord pouvait
  réclamer un acompte déjà payé. Elles viennent désormais de `/v1/worksites`,
  par les mêmes règles que les listes de travail de l'écran Chantiers — deux
  écrans, une seule vérité.
*/
type Liste = { key: keyof AlertLists; title: string; empty: string; icon: LucideIcon; tone: Tone };

const TRAVAUX: Liste[] = [
  { key: "noDeposit", title: "Acompte non encaissé", empty: "Tous les acomptes sont rentrés.", icon: BanknoteIcon, tone: "danger" },
  { key: "unplanned", title: "Sans date de chantier", empty: "Tous les chantiers ont leur date.", icon: CalendarPlusIcon, tone: "danger" },
  { key: "toInvoice", title: "Réalisé, non facturé", empty: "Tout ce qui est fini est facturé.", icon: FileTextIcon, tone: "warning" },
  { key: "running", title: "Chantier qui s'éternise", empty: "Aucun chantier ne traîne.", icon: HourglassIcon, tone: "warning" },
];

const ETUDES: Liste[] = [
  { key: "unplanned", title: "Acompte non encaissé", empty: "Toutes les études ont leur acompte.", icon: BanknoteIcon, tone: "danger" },
  { key: "running", title: "Production en retard", empty: "Aucune étude en retard.", icon: HourglassIcon, tone: "danger" },
  { key: "toInvoice", title: "Rendue, solde attendu", empty: "Tous les soldes sont rentrés.", icon: FileTextIcon, tone: "warning" },
  { key: "noDeposit", title: "Avis à demander", empty: "Aucun avis à demander.", icon: CalendarPlusIcon, tone: "warning" },
];

const MAX_ROWS = 5;

export function BlockedPanels({ live, etudes }: { live: Live<AlertLists>; etudes: boolean }) {
  const listes = etudes ? ETUDES : TRAVAUX;
  const base = etudes ? "/etudes" : "/chantiers";

  return (
    <div className="flex flex-col gap-3" data-demo="dashboard-blocked">
      {live.error && <ErrorNotice message={live.error} onRetry={live.reload} />}
      {/* Une erreur sans réponse en cache n'a rien à montrer : quatre panneaux
          vides diraient « rien en attente », une fausse bonne nouvelle. */}
      {(live.loading || live.data) && (
        <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {listes.map((liste) => (
            <AlertPanel
              key={liste.key}
              liste={liste}
              rows={live.data?.[liste.key] ?? null}
              base={base}
              more={etudes ? "voir les études" : "voir les chantiers"}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AlertPanel({
  liste,
  rows,
  base,
  more,
}: {
  liste: Liste;
  /** Nul tant que la lecture n'est pas revenue. */
  rows: Alert[] | null;
  base: string;
  more: string;
}) {
  const n = rows?.length ?? 0;
  const total = rows ? alertTotal(rows) : null;
  return (
    <Panel
      title={liste.title}
      description={
        rows === null
          ? "Lecture en cours…"
          : n === 0
            ? liste.empty
            : `${plural(n, "affaire")}${total !== null ? ` · ${formatAmount(String(total))} HT` : ""}`
      }
      icon={liste.icon}
      tone={n > 0 ? liste.tone : "neutral"}
      tinted={n > 0}
      action={n > 0 ? <span className="text-xl leading-none font-bold tabular-nums">{n}</span> : undefined}
      bodyClassName="flex flex-col"
    >
      {rows === null ? (
        <ListSkeleton rows={3} hue="violet" />
      ) : n === 0 ? (
        <p className="text-muted-foreground/60 px-3 py-6 text-center text-xs">Rien en attente.</p>
      ) : (
        <>
          {rows.slice(0, MAX_ROWS).map((row) => (
            <RowShell key={row.worksite_id}>
              <div className="min-w-0 flex-1">
                <Link
                  href={`${base}?affaire=${row.worksite_id}`}
                  className="block truncate text-sm hover:underline"
                >
                  {row.customer_name}
                </Link>
                <p className="text-muted-foreground truncate text-xs">{row.reason}</p>
              </div>
              {row.amount !== null && (
                <span className="shrink-0 text-sm font-medium tabular-nums">
                  {formatAmount(String(row.amount))}
                </span>
              )}
            </RowShell>
          ))}
          {n > MAX_ROWS && (
            <PanelMore href={base}>
              et {plural(n - MAX_ROWS, "autre")} — {more}
            </PanelMore>
          )}
        </>
      )}
    </Panel>
  );
}
