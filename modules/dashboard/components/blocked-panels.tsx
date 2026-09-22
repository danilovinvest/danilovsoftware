"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BanknoteIcon,
  CalendarPlusIcon,
  FileTextIcon,
  HourglassIcon,
  type LucideIcon,
} from "lucide-react";
import { errorMessage } from "@/shared/api/errors";
import { ErrorNotice } from "@/shared/ui/feedback";
import { Panel, RowShell } from "@/shared/ui/panel";
import type { Tone } from "@/modules/customers";
import { formatAmount } from "@/shared/lib/format";
import { scopeParam, useScope } from "@/modules/group";
import {
  alertTotal,
  alerts,
  listWorksites,
  read,
  studyAlerts,
  type Alert,
} from "@/modules/worksites";

/*
  Les quatre attentes d'après-signature, lues sur la base.

  Elles étaient tirées d'une empreinte de la référence du devis, « pondérées
  pour ressembler à une entreprise qui tourne » : le tableau de bord pouvait
  réclamer un acompte déjà payé. Elles viennent désormais de `/v1/worksites`,
  par les mêmes règles que les listes de travail de l'écran Chantiers — deux
  écrans, une seule vérité.
*/
type Liste = { title: string; empty: string; icon: LucideIcon; tone: Tone; rows: Alert[] };

export function BlockedPanels() {
  const scope = useScope();
  const issuer = scopeParam(scope) ?? "";
  const etudes = scope === "ompt-structure";
  const [resolved, setResolved] = useState<{
    key: string;
    lists: Liste[] | null;
    error: string | null;
  }>({ key: "", lists: null, error: null });
  const key = issuer;

  useEffect(() => {
    const controller = new AbortController();
    listWorksites("", issuer, controller.signal)
      .then((result) => {
        const now = Date.parse(result.generated_at);
        const reads = result.items.map((w) => read(w, now));
        setResolved({ key, lists: etudes ? listesEtudes(reads) : listesTravaux(reads), error: null });
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setResolved({ key, lists: null, error: errorMessage(cause) });
      });
    return () => controller.abort();
  }, [key, issuer, etudes]);

  const ready = resolved.key === key ? resolved : null;
  if (ready?.error) return <ErrorNotice message={ready.error} />;

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2 xl:grid-cols-4" data-demo="dashboard-blocked">
      {(ready?.lists ?? SQUELETTE).map((liste) => (
        <AlertPanel
          key={liste.title}
          liste={liste}
          loading={!ready}
          base={etudes ? "/etudes" : "/chantiers"}
        />
      ))}
    </div>
  );
}

function listesTravaux(reads: ReturnType<typeof read>[]): Liste[] {
  const a = alerts(reads);
  return [
    { title: "Acompte non encaissé", empty: "Tous les acomptes sont rentrés.", icon: BanknoteIcon, tone: "danger", rows: a.noDeposit },
    { title: "Sans date de chantier", empty: "Tous les chantiers ont leur date.", icon: CalendarPlusIcon, tone: "danger", rows: a.unplanned },
    { title: "Réalisé, non facturé", empty: "Tout ce qui est fini est facturé.", icon: FileTextIcon, tone: "warning", rows: a.toInvoice },
    { title: "Chantier qui s'éternise", empty: "Aucun chantier ne traîne.", icon: HourglassIcon, tone: "warning", rows: a.running },
  ];
}

function listesEtudes(reads: ReturnType<typeof read>[]): Liste[] {
  const a = studyAlerts(reads);
  return [
    { title: "Acompte non encaissé", empty: "Toutes les études ont leur acompte.", icon: BanknoteIcon, tone: "danger", rows: a.unplanned },
    { title: "Production en retard", empty: "Aucune étude en retard.", icon: HourglassIcon, tone: "danger", rows: a.running },
    { title: "Rendue, solde attendu", empty: "Tous les soldes sont rentrés.", icon: FileTextIcon, tone: "warning", rows: a.toInvoice },
    { title: "Avis à demander", empty: "Aucun avis à demander.", icon: CalendarPlusIcon, tone: "warning", rows: a.noDeposit },
  ];
}

const SQUELETTE: Liste[] = ["Acompte non encaissé", "Sans date de chantier", "Réalisé, non facturé", "Chantier qui s'éternise"].map(
  (title) => ({ title, empty: "", icon: FileTextIcon, tone: "neutral" as Tone, rows: [] }),
);

function AlertPanel({ liste, loading, base }: { liste: Liste; loading: boolean; base: string }) {
  const total = alertTotal(liste.rows);
  const n = liste.rows.length;
  return (
    <Panel
      title={liste.title}
      description={
        loading
          ? "Lecture des chantiers…"
          : n === 0
            ? liste.empty
            : `${n} affaire${n > 1 ? "s" : ""}${total !== null ? ` · ${formatAmount(String(total))} HT` : ""}`
      }
      icon={liste.icon}
      tone={n > 0 ? liste.tone : "neutral"}
      bodyClassName="flex flex-col"
    >
      {n === 0 ? (
        <p className="text-muted-foreground/60 px-3 py-6 text-center text-xs">
          {loading ? "…" : "Rien en attente."}
        </p>
      ) : (
        <>
          {liste.rows.slice(0, 5).map((row) => (
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
          {n > 5 && (
            <Link
              href={base}
              className="text-muted-foreground hover:text-foreground px-3 py-2 text-xs"
            >
              et {n - 5} autre{n - 5 > 1 ? "s" : ""} — voir les chantiers
            </Link>
          )}
        </>
      )}
    </Panel>
  );
}
