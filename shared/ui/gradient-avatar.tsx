import { avatarGradient } from "@/shared/lib/avatar";
import { cn } from "@/lib/utils";

/**
 * Avatar en dégradé façon vercel/avatar, calculé dans le navigateur.
 *
 * L'identifiant du dégradé est dérivé des deux couleurs et non d'un `useId` :
 * il reste ASCII (un `url(#…)` n'aime pas les identifiants exotiques) et deux
 * avatars de même graine partagent alors la même définition, ce qui est sans
 * conséquence puisqu'elle est identique.
 */
export function GradientAvatar({
  seed,
  text,
  size = 40,
  rounded = 4,
  className,
}: {
  /** Chaîne qui détermine les couleurs — l'e-mail, stable dans le temps. */
  seed: string;
  /** Initiales superposées, en blanc. */
  text?: string;
  size?: number;
  rounded?: number;
  className?: string;
}) {
  const { from, to } = avatarGradient(seed);
  const gradientId = `avatar-${from.slice(1)}-${to.slice(1)}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("shrink-0", className)}
      role="img"
      aria-label={text ? `Avatar ${text}` : "Avatar"}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
      </defs>
      <rect
        fill={`url(#${gradientId})`}
        x="0"
        y="0"
        width={size}
        height={size}
        rx={rounded}
        ry={rounded}
      />
      {text && (
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          fill="#fff"
          fontFamily="var(--font-sans)"
          fontWeight="500"
          fontSize={(size * 0.9) / text.length}
        >
          {text}
        </text>
      )}
    </svg>
  );
}
