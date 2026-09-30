"use client";

import { useState } from "react";
import Link from "next/link";
import { UserRoundXIcon } from "lucide-react";
import { useAuth, usePermission } from "@/modules/auth";
import { PROJECT_STAGE, setProjectManager } from "@/modules/customers";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/shared/api/errors";
import { formatDate } from "@/shared/lib/format";
import { ErrorNotice } from "@/shared/ui/feedback";
import { Panel, RowShell } from "@/shared/ui/panel";
import { customerHref } from "@/shared/lib/routes";
import { useRefreshMyProjects, useUnassigned } from "../hooks/use-live";
import { PanelEmpty, PanelState } from "./parts";

/**
 * « À attribuer » : les dossiers actifs que personne ne porte.
 *
 * Le cahier des charges ne veut aucun dossier actif sans responsable ni
 * prochaine action. Il y en avait 192 sur 192 le jour où le CRM a su le dire :
 * les signaler un par un en rouge aurait fait 192 bandeaux, et une alerte
 * partout n'alerte plus. Le bloc les compte, montre d'abord ceux qui pressent —
 * les affaires signées, les deadlines proches — et permet de s'en attribuer un
 * d'un clic. On résorbe, on ne s'affole pas.
 */
export function UnassignedPanel() {
  const { account } = useAuth();
  const canWrite = usePermission("customers:write");
  const live = useUnassigned(8);
  const refreshMyProjects = useRefreshMyProjects();
  const [pending, setPending] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);
  const page = live.data;

  async function attribuer(projectId: string) {
    if (!account) return;
    setPending(projectId);
    setWriteError(null);
    try {
      await setProjectManager(projectId, account.id);
      // Attendues : le bouton reste éteint tant que la ligne n'a pas quitté la
      // liste, sans quoi un second clic réécrirait la même attribution.
      await Promise.all([live.reload(), refreshMyProjects()]);
    } catch (cause) {
      setWriteError(errorMessage(cause));
    } finally {
      setPending(null);
    }
  }

  return (
    <div data-demo="unassigned-panel">
      <Panel
        title="À attribuer"
        description={
          page
            ? `${page.without_manager} sans responsable · ${page.without_task} sans prochaine action`
            : "Les dossiers actifs que personne ne porte"
        }
        icon={UserRoundXIcon}
        tone="warning"
        action={page ? <span className="text-xl leading-none font-bold tabular-nums">{page.total}</span> : undefined}
        bodyClassName="divide-y"
      >
        {writeError && (
          <div className="p-3">
            <ErrorNotice message={writeError} />
          </div>
        )}
        <PanelState live={live}>
          {(data) =>
            data.items.length === 0 ? (
              <PanelEmpty>Chaque dossier actif a son responsable et sa prochaine action.</PanelEmpty>
            ) : (
              /* Deux colonnes dès qu'il y a la place : huit lignes pleine
                 largeur repoussaient tout le reste sous le pli. */
              <div className="-mb-px grid lg:grid-cols-2">
                {data.items.map((item) => (
                  <RowShell key={item.id} className="border-b">
                    <Link href={customerHref(item.customer_id)} className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold">{item.customer_name}</span>
                      <span className="text-muted-foreground block truncate text-[11px]">
                        {item.reference && <span className="font-mono">{item.reference} · </span>}
                        {item.label} · {PROJECT_STAGE[item.stage]?.label ?? item.stage}
                      </span>
                      <span className="text-muted-foreground/70 block truncate text-[11px]">
                        {item.manager_name ? `Suivi par ${item.manager_name}` : "Sans responsable"}
                        {" · "}
                        {item.next_task ? item.next_task.title : "aucune prochaine action"}
                        {item.internal_deadline_at && ` · deadline ${formatDate(item.internal_deadline_at)}`}
                      </span>
                    </Link>
                    {canWrite && !item.manager_id && account && (
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={pending === item.id}
                        onClick={() => void attribuer(item.id)}
                      >
                        M&apos;attribuer
                      </Button>
                    )}
                  </RowShell>
                ))}
              </div>
            )
          }
        </PanelState>
      </Panel>
    </div>
  );
}
