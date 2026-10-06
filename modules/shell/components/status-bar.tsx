"use client";

import Link from "next/link";
import { RefreshCwIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatAgo, formatDateTime } from "@/shared/lib/format";
import { cn } from "@/lib/utils";
import { useSystemStatus, type SystemStatus } from "../hooks/use-system-status";
import {
  BUNDLE_VERSION,
  CHECK_HREF,
  updateAvailable,
  type CheckState,
  type StatusCheck,
  type StatusReport,
} from "../lib/status";

type Tone = "neutral" | "success" | "warning" | "danger";

const DOT: Record<Tone, string> = {
  neutral: "bg-muted-foreground/50",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

const STATE_TONE: Record<CheckState, Tone> = { ok: "success", stale: "warning", error: "danger" };

const STATE_LABEL: Record<CheckState, string> = {
  ok: "Opérationnel",
  stale: "En retard",
  error: "En erreur",
};

/**
 * Le bandeau de pied de page : l'état du CRM, sa version, et la mise à jour
 * quand il y en a une.
 *
 * Il se tait autant qu'il peut. Tout va bien, c'est un point vert et une
 * version en gris — une ligne qu'on ne lit pas. Il ne prend la parole qu'en
 * cas de besoin : une copie en retard, un serveur muet, un déploiement qui
 * attend d'être chargé. Le détail s'ouvre au clic, et chaque intégration mène
 * à ses réglages, où vit son journal.
 */
export function StatusBar() {
  const status = useSystemStatus();
  const report = status.kind === "ready" ? status.report : null;
  const update = report !== null && updateAvailable(report);

  return (
    <footer
      data-demo="status-bar"
      className="text-muted-foreground flex h-8 shrink-0 items-center gap-3 border-t px-3 text-xs md:px-4"
    >
      <HealthPopover status={status} />

      <div className="ml-auto flex min-w-0 items-center gap-3">
        {update && (
          <button
            type="button"
            data-demo="status-update"
            onClick={() => window.location.reload()}
            className="bg-brand text-brand-ink hover:bg-brand/90 flex h-6 shrink-0 items-center gap-1.5 rounded-md px-2 font-medium"
          >
            <RefreshCwIcon className="size-3" />
            <span className="hidden sm:inline">Nouvelle version disponible · </span>
            Recharger
          </button>
        )}
        <VersionLabel report={report} />
      </div>
    </footer>
  );
}

function HealthPopover({ status }: { status: SystemStatus }) {
  const { tone, text } = headline(status);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="hover:text-foreground flex min-w-0 items-center gap-2 rounded-md py-1"
        >
          <span className={cn("size-2 shrink-0 rounded-full", DOT[tone])} aria-hidden />
          <span className="truncate">{text}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" sideOffset={8} className="w-80 gap-0 rounded-xl p-0">
        <div className="border-b px-3.5 py-2.5 text-sm font-medium">État du CRM</div>
        <HealthDetail status={status} />
      </PopoverContent>
    </Popover>
  );
}

function HealthDetail({ status }: { status: SystemStatus }) {
  if (status.kind === "loading") {
    return <p className="text-muted-foreground px-3.5 py-3 text-sm">Vérification en cours…</p>;
  }
  if (status.kind === "unreachable") {
    return (
      <p className="text-muted-foreground px-3.5 py-3 text-sm">
        Le serveur ne répond pas depuis {formatDateTime(new Date(status.since).toISOString())}.
        Les modifications faites maintenant risquent de ne pas être enregistrées.
      </p>
    );
  }

  const { report } = status;
  const now = Date.parse(report.checked_at);

  return (
    <div className="flex flex-col">
      <ul className="flex flex-col p-1.5">
        {report.checks.map((check) => (
          <CheckRow key={check.key} check={check} now={now} />
        ))}
      </ul>
      <div className="text-muted-foreground flex flex-col gap-0.5 border-t px-3.5 py-2.5 text-xs">
        <span>Serveur démarré {formatAgo(report.started_at, now)}</span>
        <span>Vérifié {formatAgo(report.checked_at, now)} · relu chaque minute</span>
      </div>
    </div>
  );
}

function CheckRow({ check, now }: { check: StatusCheck; now: number }) {
  const detail =
    check.latency_ms !== undefined
      ? `${check.latency_ms} ms`
      : check.last_success_at
        ? `copie ${formatAgo(check.last_success_at, now)}`
        : "aucune copie réussie en 24 h";
  const href = CHECK_HREF[check.key];

  const body = (
    <>
      <span className={cn("size-2 shrink-0 rounded-full", DOT[STATE_TONE[check.state]])} aria-hidden />
      <span className="text-foreground min-w-0 flex-1 truncate text-sm">{check.label}</span>
      <span className="text-muted-foreground shrink-0 text-xs">
        {check.state === "ok" ? detail : `${STATE_LABEL[check.state]} · ${detail}`}
      </span>
    </>
  );

  return (
    <li>
      {href ? (
        <Link href={href} className="hover:bg-accent flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          {body}
        </Link>
      ) : (
        <div className="flex items-center gap-2.5 px-2 py-1.5">{body}</div>
      )}
    </li>
  );
}

function VersionLabel({ report }: { report: StatusReport | null }) {
  // La version affichée est celle de la page chargée : c'est elle qu'on a sous
  // les yeux. Celle du serveur ne se lit qu'à travers le bouton de mise à jour.
  const commit = BUNDLE_VERSION.commit || report?.version.commit || "dev";
  const builtAt = BUNDLE_VERSION.builtAt || report?.version.built_at || null;

  return (
    <span
      className="shrink-0 font-mono tabular-nums"
      title={builtAt ? `Construite le ${formatDateTime(builtAt)}` : "Version de développement"}
    >
      v{commit}
      {builtAt && <span className="hidden md:inline"> · {formatDateTime(builtAt)}</span>}
    </span>
  );
}

function headline(status: SystemStatus): { tone: Tone; text: string } {
  if (status.kind === "loading") return { tone: "neutral", text: "Vérification…" };
  if (status.kind === "unreachable") return { tone: "danger", text: "Serveur injoignable" };

  const { report } = status;
  if (report.overall === "down") return { tone: "danger", text: "Base de données indisponible" };

  const failing = report.checks.filter((c) => c.state === "error");
  const late = report.checks.filter((c) => c.state === "stale");
  if (failing.length > 0) {
    return { tone: "danger", text: `${failing.map((c) => c.label).join(", ")} en erreur` };
  }
  if (late.length > 0) {
    return { tone: "warning", text: `${late.map((c) => c.label).join(", ")} en retard` };
  }
  return { tone: "success", text: "Tous les services sont opérationnels" };
}
