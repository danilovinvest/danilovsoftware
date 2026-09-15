"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserRoundXIcon } from "lucide-react";
import { useAuth, usePermission } from "@/modules/auth";
import {
  listUnassigned,
  PROJECT_STAGE,
  setProjectManager,
  type UnassignedPage,
} from "@/modules/customers";
import { scopeParam, useScope } from "@/modules/group";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/shared/api/errors";
import { formatDate } from "@/shared/lib/format";
import { ErrorNotice } from "@/shared/ui/feedback";
import { Panel, RowShell } from "@/shared/ui/panel";

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
  const scope = useScope();
  const { account } = useAuth();
  const canWrite = usePermission("customers:write");
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{ key: string; page: UnassignedPage | null; error: string | null } | null>(
    null,
  );
  const [pending, setPending] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<string | null>(null);
  const key = `${scope}·${version}`;

  useEffect(() => {
    const controller = new AbortController();
    listUnassigned({ limit: 8, issuer: scopeParam(scope) }, controller.signal)
      .then((page) => setResult({ key: `${scope}·${version}`, page, error: null }))
      .catch((cause) => {
        if (!controller.signal.aborted) setResult({ key: `${scope}·${version}`, page: null, error: errorMessage(cause) });
      });
    return () => controller.abort();
  }, [scope, version]);

  const current = result?.key === key ? result : null;
  const page = current?.page ?? null;

  async function attribuer(projectId: string) {
    if (!account) return;
    setPending(projectId);
    setWriteError(null);
    try {
      await setProjectManager(projectId, account.id);
      setVersion((value) => value + 1);
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
        action={<span className="text-xl font-bold tabular-nums">{page ? page.total : "…"}</span>}
        bodyClassName="divide-y"
      >
        {current?.error && (
          <div className="p-3">
            <ErrorNotice message={current.error} />
          </div>
        )}
        {writeError && (
          <div className="p-3">
            <ErrorNotice message={writeError} />
          </div>
        )}
        {page && page.items.length === 0 && (
          <p className="text-muted-foreground px-4 py-5 text-center text-xs">
            Chaque dossier actif a son responsable et sa prochaine action.
          </p>
        )}
        {page?.items.map((item) => (
          <RowShell key={item.id}>
            <Link href={`/customers/${item.customer_id}`} className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold">{item.customer_name}</span>
              <span className="text-muted-foreground block truncate text-[11px]">
                {item.reference && <span className="font-mono">{item.reference} · </span>}
                {item.label} · {PROJECT_STAGE[item.stage]?.label ?? item.stage}
              </span>
              <span className="text-muted-foreground/70 block text-[11px]">
                {item.manager_name ? `Suivi par ${item.manager_name}` : "Sans responsable"}
                {" · "}
                {item.next_task ? `${item.next_task.title}` : "aucune prochaine action"}
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
      </Panel>
    </div>
  );
}
