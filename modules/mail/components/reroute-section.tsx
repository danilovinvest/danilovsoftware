"use client";

import { useState } from "react";
import { SplitIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/modules/auth";
import { SettingsSection } from "@/modules/settings";
import { errorMessage } from "@/shared/api/errors";
import { plural } from "@/shared/lib/format";
import { askConfirm } from "@/shared/ui/confirm";
import { ErrorNotice, Spinner } from "@/shared/ui/feedback";
import { rerouteMail } from "../lib/api";
import type { RerouteReport } from "../lib/types";

/**
 * Le re-routage des courriels (29/09), réservé à l'administration.
 *
 * Avant le routage par indices, une adresse partagée rangeait tout sur une
 * fiche — les courriels du 1 rue Chabaud sur la SDC du Marot. Le geste
 * repasse les indices sur ces rattachements-là, et eux seuls : jamais un
 * rattachement à la main, jamais par le fil. **Il se simule d'abord** — le
 * serveur ne touche à rien tant qu'on n'a pas vu ce qu'il ferait.
 */
export function RerouteSection() {
  const allowed = usePermission("system:admin");
  const [report, setReport] = useState<RerouteReport | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!allowed) return null;

  const run = async (apply: boolean) => {
    if (apply) {
      const ok = await askConfirm({
        title: "Re-router les courriels",
        description:
          "Les courriels désignés par un indice changent de fiche, les ambigus partent dans « À classer ». Les rattachements à la main ne bougent pas.",
        confirmLabel: "Re-router",
      });
      if (!ok) return;
    }
    setPending(true);
    setError(null);
    try {
      setReport(await rerouteMail(apply));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  };

  return (
    <SettingsSection
      title="Adresses partagées"
      description="Repasser les indices sur ce qu'une adresse partagée a rangé seule, avant le 29/09."
    >
      <div className="flex flex-col gap-3 rounded-lg border p-3" data-demo="mail-reroute">
        <p className="text-muted-foreground text-xs leading-relaxed">
          Une gestionnaire ou un ingénieur écrit pour plusieurs dossiers : son adresse ne dit pas
          lequel. Les courriels qu&apos;elle a rangés sont relus — l&apos;adresse du chantier, une
          référence DE ou FA de la société qui reçoit, le nom dans l&apos;objet. Désignés, ils
          changent de fiche ; ambigus, ils vont dans{" "}
          <Link href="/mail?vue=a_classer" className="underline">
            À classer
          </Link>
          .
        </p>
        {error && <ErrorNotice message={error} />}
        {report && <RerouteSummary report={report} />}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void run(false)} disabled={pending}>
            {pending ? <Spinner /> : <SplitIcon className="size-3.5" />}
            Simuler
          </Button>
          <Button size="sm" onClick={() => void run(true)} disabled={pending || !report || report.applied}>
            Re-router
          </Button>
        </div>
      </div>
    </SettingsSection>
  );
}

function RerouteSummary({ report }: { report: RerouteReport }) {
  return (
    <div className="flex flex-col gap-2 text-xs">
      <p>
        {report.applied ? "Fait : " : "Simulation : "}
        {plural(report.examined, "courriel")} examiné{report.examined > 1 ? "s" : ""} ·{" "}
        <span className="text-success">{report.moved} déplacés</span> ·{" "}
        <span className="text-warning">{report.queued} à classer</span> · {report.kept} gardés
      </p>
      {report.fiches.length > 0 && (
        <ul className="divide-y rounded-md border">
          {report.fiches.slice(0, 15).map((line) => (
            <li key={line.customer_id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-2.5 py-1.5">
              <span className="min-w-0 flex-1 truncate font-medium">{line.name}</span>
              <span className="text-muted-foreground tabular-nums">
                {line.examined} · {line.moved} déplacés · {line.queued} à classer · {line.kept} gardés
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
