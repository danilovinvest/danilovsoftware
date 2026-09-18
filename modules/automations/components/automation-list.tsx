"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusIcon, Trash2Icon, TriangleAlertIcon, ZapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/modules/auth";
import { errorMessage } from "@/shared/api/errors";
import { formatDateTime, formatRelative, plural } from "@/shared/lib/format";
import { EmptyState, ErrorNotice, Skeleton, Spinner } from "@/shared/ui/feedback";
import { cn } from "@/lib/utils";
import { useAutomations } from "../hooks/use-automations";
import * as api from "../lib/api";
import { describeCron } from "../lib/cron";
import { automationHref } from "@/shared/lib/routes";

/**
 * La liste des automatisations.
 *
 * Une automatisation neuve arrive avec ses trois cartes déjà posées et reliées :
 * déclencheur, récapitulatif, envoi. Une toile vide serait honnête et
 * décourageante — on saurait qu'il faut ajouter des cartes sans savoir
 * lesquelles ni dans quel ordre.
 */
export function AutomationList() {
  const { automations, telegramReady, loading, error, reload } = useAutomations();
  const canWrite = usePermission("automations:write");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  /*
   * La confirmation nomme ce qu'on supprime, et dit ce qui part avec.
   *
   * Une automatisation emporte son journal — les exécutions passées, ce qui a
   * été envoyé et à qui. C'est la seule trace de ce que le CRM a écrit aux
   * gens, et « Supprimer ? » tout court ne le laisserait pas deviner.
   */
  async function remove(id: string, name: string, runs: number) {
    const trace =
      runs > 0
        ? `\n\nSon journal part avec elle : ${plural(runs, "exécution")} consignée${runs > 1 ? "s" : ""}.`
        : "";
    if (!confirm(`Supprimer l'automatisation « ${name} » ?${trace}`)) return;

    setRemoving(id);
    setFailure(null);
    try {
      await api.deleteAutomation(id);
      reload();
    } catch (cause) {
      setFailure(errorMessage(cause));
    } finally {
      setRemoving(null);
    }
  }

  async function create() {
    setPending(true);
    setFailure(null);
    try {
      const created = await api.createAutomation({
        name: "Récapitulatif du soir",
        description: "Le programme du lendemain, envoyé sur Telegram",
        cron: "0 18 * * *",
        time_zone: "Europe/Paris",
        graph: {
          nodes: [
            { id: "declencheur", type: "schedule", position: { x: 40, y: 140 }, config: {} },
            {
              id: "agenda",
              type: "calendar_digest",
              position: { x: 340, y: 140 },
              config: { offset_days: 1, calendar_ids: [], empty_text: "" },
            },
            {
              id: "envoi",
              type: "telegram",
              position: { x: 640, y: 140 },
              config: {
                chat_id: "",
                message: "{{resume}}",
                parse_mode: "HTML",
                silent: false,
                split: false,
                header: true,
              },
            },
          ],
          edges: [
            { from: "declencheur", to: "agenda" },
            { from: "agenda", to: "envoi" },
          ],
        },
      });
      reload();
      router.push(automationHref(created.id));
    } catch (cause) {
      setFailure(errorMessage(cause));
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold">Automatisations</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Des cartes reliées sur une toile, exécutées par le serveur à l&apos;heure dite.
          </p>
        </div>
        {canWrite && (
          <Button size="sm" onClick={create} disabled={pending}>
            {pending ? <Spinner /> : <PlusIcon />}
            Nouvelle automatisation
          </Button>
        )}
      </header>

      {(failure || error) && <ErrorNotice message={failure ?? error ?? ""} />}

      {!telegramReady && !loading && (
        <p className="text-warning bg-warning-soft/50 flex items-start gap-2 rounded-lg px-3 py-2 text-xs leading-relaxed">
          <TriangleAlertIcon className="mt-px size-3.5 shrink-0" />
          <span>
            Aucun bot Telegram déclaré sur le serveur
            (<span className="font-mono">CRM_TELEGRAM_BOT_TOKEN</span>). Les
            automatisations se dessinent et s&apos;enregistrent, mais aucun
            message ne partira.
          </span>
        </p>
      )}

      {loading ? (
        <Skeleton className="h-32 w-full rounded-xl" />
      ) : automations.length === 0 ? (
        <div className="rounded-xl border">
          <EmptyState
            title="Aucune automatisation"
            description="La première envoie sur Telegram le programme du lendemain, tous les soirs à 18h."
            action={
              canWrite ? (
                <Button size="sm" onClick={create} disabled={pending}>
                  <ZapIcon />
                  Créer le récapitulatif du soir
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="divide-y rounded-xl border">
          {automations.map((automation) => (
            <div
              key={automation.id}
              className="hover:bg-accent/50 flex items-center gap-1 pr-2 transition-colors"
            >
              <Link
                href={automationHref(automation.id)}
                className="flex min-w-0 flex-1 flex-wrap items-center gap-3 px-4 py-3"
              >
                <span
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    automation.active ? "bg-success" : "bg-muted-foreground/30",
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {automation.name}
                  </span>
                  <span className="text-muted-foreground/70 block truncate text-[11px]">
                    {describeCron(automation.cron)} · {automation.time_zone} ·{" "}
                    {plural(automation.graph.nodes.length, "carte")}
                  </span>
                </span>
                <span className="text-muted-foreground shrink-0 text-right text-[11px]">
                  {automation.active && automation.next_run_at ? (
                    <>prochaine le {formatDateTime(automation.next_run_at)}</>
                  ) : (
                    "en pause"
                  )}
                  <span className="text-muted-foreground/60 block">
                    {automation.last_run_at
                      ? `dernière ${formatRelative(automation.last_run_at)}`
                      : "jamais exécutée"}
                  </span>
                </span>
              </Link>

              {canWrite && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  disabled={removing === automation.id}
                  onClick={() =>
                    remove(automation.id, automation.name, automation.run_count)
                  }
                  aria-label={`Supprimer ${automation.name}`}
                  title="Supprimer cette automatisation"
                >
                  {removing === automation.id ? (
                    <Spinner />
                  ) : (
                    <Trash2Icon className="size-3.5" />
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
