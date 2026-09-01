import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import type { Tone } from "@/modules/customers";

/**
 * Briques d'affichage des écrans de synthèse : panneau, courbe de fond, barre
 * proportionnelle, pastille de score.
 *
 * Aucune couleur littérale ici : tout passe par les tonalités sémantiques du
 * thème (`--success`, `--warning`…), ce qui est la condition pour que le mode
 * sombre continue de marcher sans qu'on y touche — il ne redéfinit que
 * l'échelle, jamais la couche sémantique.
 */

export const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-neutral",
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

export const TONE_SOFT: Record<Tone, string> = {
  neutral: "bg-neutral-soft text-neutral",
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

export const TONE_FILL: Record<Tone, string> = {
  neutral: "bg-neutral",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

/** Un panneau du tableau de bord : titre discret, contenu dense. */
export function Panel({
  title,
  description,
  icon: Icon,
  tone = "neutral",
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  tone?: Tone;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Card className={cn("gap-0 overflow-hidden py-0", className)}>
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 items-start gap-2">
          {Icon && (
            <span
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[4px]",
                TONE_SOFT[tone],
              )}
            >
              <Icon className="size-3" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-sm font-medium">{title}</h2>
            {description && (
              <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
            )}
          </div>
        </div>
        {action}
      </div>
      <div className={cn("min-w-0", bodyClassName)}>{children}</div>
    </Card>
  );
}

/**
 * Courbe de contexte sous un compteur.
 *
 * Une sparkline ne porte pas d'échelle : elle dit la forme, pas la valeur.
 * D'où l'absence d'axes, et la légende obligatoire à côté (`trend_label`).
 */
export function Sparkline({
  points,
  tone = "info",
  id,
  className,
}: {
  points: number[];
  tone?: Tone;
  /** Identifiant du dégradé : deux courbes sur la page ne doivent pas le partager. */
  id: string;
  className?: string;
}) {
  const width = 120;
  const height = 28;
  const max = Math.max(...points, 1);
  const step = points.length > 1 ? width / (points.length - 1) : width;

  const coords = points.map((value, index) => {
    const x = index * step;
    // 2 px de marge en haut et en bas : un pic ne doit pas toucher le bord.
    const y = height - 2 - (value / max) * (height - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const last = points[points.length - 1] ?? 0;
  const lastY = height - 2 - (last / max) * (height - 4);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("h-7 w-full", TONE_TEXT[tone], className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${coords.join(" ")} ${width},${height}`}
        fill={`url(#spark-${id})`}
      />
      <polyline
        points={coords.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={width} cy={lastY} r="2" fill="currentColor" />
    </svg>
  );
}

/** Barre horizontale proportionnelle, pour comparer des lignes entre elles. */
export function Meter({
  value,
  max,
  tone = "info",
  className,
}: {
  value: number;
  max: number;
  tone?: Tone;
  className?: string;
}) {
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <div className={cn("bg-muted h-1.5 w-full overflow-hidden rounded-full", className)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", TONE_FILL[tone])}
        style={{ width: `${Math.max(ratio * 100, value > 0 ? 3 : 0)}%` }}
      />
    </div>
  );
}

/** Pastille de score : le chiffre, et la couleur qui le résume. */
export function ScorePill({
  score,
  tone,
  title,
}: {
  score: number;
  tone: Tone;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex h-5 min-w-8 items-center justify-center rounded-[4px] px-1 text-[11px] font-medium tabular-nums",
        TONE_SOFT[tone],
      )}
    >
      {score}
    </span>
  );
}

/** Ligne cliquable d'une liste de travail. */
export function RowShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "hover:bg-accent/60 flex items-start gap-3 px-4 py-2.5 transition-colors",
        className,
      )}
    >
      {children}
    </div>
  );
}
